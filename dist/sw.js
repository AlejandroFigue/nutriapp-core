/**
 * NutriApp — Service Worker
 * Estrategia offline-first por tipo de recurso:
 *   - App shell        → CacheFirst + network fallback
 *   - /api/alimentos   → StaleWhileRevalidate (lectura instantánea + actualiza en bg)
 *   - /api/*           → NetworkFirst (frescura con fallback a caché)
 *   - Fonts / imágenes → CacheFirst (recursos inmutables)
 *
 * Background Sync: el tag 'sync-outbox' es registrado desde Outbox.registrarSync()
 * y este SW notifica a los clientes via postMessage para que ejecuten el flush.
 */

const VERSION = 'v1'

const CACHE = {
  shell:  `nutriapp-shell-${VERSION}`,
  api:    `nutriapp-api-${VERSION}`,
  images: `nutriapp-images-${VERSION}`,
  fonts:  `nutriapp-fonts-${VERSION}`,
}

const APP_SHELL = ['/', '/index.html']

const LIMITS = {
  api:    { entries: 300, days: 7  },
  images: { entries: 150, days: 30 },
  fonts:  { entries: 20,  days: 365 },
}

const API_TIMEOUT_MS = 8000

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE.shell)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  )
})

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  const validCaches = new Set(Object.values(CACHE))
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !validCaches.has(k))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') return

  // Google Fonts CSS
  if (url.origin === 'https://fonts.googleapis.com') {
    event.respondWith(staleWhileRevalidate(request, CACHE.fonts, LIMITS.fonts))
    return
  }

  // Google Fonts archivos binarios (hash en URL → inmutables)
  if (url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, CACHE.fonts, LIMITS.fonts))
    return
  }

  // Imágenes remotas
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request, CACHE.images, LIMITS.images))
    return
  }

  if (url.origin !== self.location.origin) return

  // /api/alimentos — lectura local inmediata, revalida en background
  if (url.pathname.startsWith('/api/alimentos')) {
    event.respondWith(staleWhileRevalidate(request, CACHE.api, LIMITS.api))
    return
  }

  // /api/* general — datos frescos prioritarios, caché como respaldo offline
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, CACHE.api, LIMITS.api))
    return
  }

  // Assets del origen (JS, CSS, etc.) y navegaciones SPA
  event.respondWith(cacheFirstWithShellFallback(request))
})

// ─── Estrategias ──────────────────────────────────────────────────────────────

async function networkFirst(request, cacheName, limits) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetchWithTimeout(request.clone(), API_TIMEOUT_MS)
    if (response.ok) {
      await cache.put(request, response.clone())
      await evict(cache, limits.entries)
    }
    return response
  } catch {
    const cached = await cache.match(request)
    return cached ?? offlineFallback(request)
  }
}

async function staleWhileRevalidate(request, cacheName, limits) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  // Revalidación en background — no bloquea la respuesta
  const revalidate = fetch(request.clone())
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, response.clone())
        await evict(cache, limits.entries)
      }
    })
    .catch(() => {})

  if (cached) {
    event?.waitUntil?.(revalidate)
    return cached
  }

  // Sin caché aún: esperar la red
  try {
    const response = await fetch(request.clone())
    if (response.ok) {
      await cache.put(request, response.clone())
      await evict(cache, limits.entries)
    }
    return response
  } catch {
    return offlineFallback(request)
  }
}

async function cacheFirst(request, cacheName, limits) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request.clone())
    if (response.ok) {
      await cache.put(request, response.clone())
      await evict(cache, limits.entries)
    }
    return response
  } catch {
    return offlineFallback(request)
  }
}

async function cacheFirstWithShellFallback(request) {
  // Buscar en todos los cachés de assets
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request.clone())
    if (response.ok) {
      const cache = await caches.open(CACHE.shell)
      await cache.put(request, response.clone())
    }
    return response
  } catch {
    // SPA: cualquier navegación sin match sirve el shell
    if (request.mode === 'navigate') {
      return caches.match('/index.html')
    }
    return offlineFallback(request)
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fetchWithTimeout(request, ms) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return fetch(request, { signal: controller.signal })
    .finally(() => clearTimeout(timer))
}

function offlineFallback(request) {
  if (request.mode === 'navigate') {
    return caches.match('/index.html')
  }
  return new Response(
    JSON.stringify({ error: 'offline', message: 'Sin conexión a internet' }),
    { status: 503, headers: { 'Content-Type': 'application/json' } }
  )
}

async function evict(cache, maxEntries) {
  const keys = await cache.keys()
  if (keys.length > maxEntries) {
    // Elimina los más antiguos (FIFO — el orden de keys() refleja inserción)
    const toDelete = keys.slice(0, keys.length - maxEntries)
    await Promise.all(toDelete.map((k) => cache.delete(k)))
  }
}

// ─── Background Sync ──────────────────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-outbox') {
    event.waitUntil(notificarFlushOutbox())
  }
})

async function notificarFlushOutbox() {
  const clients = await self.clients.matchAll({
    includeUncontrolled: true,
    type: 'window',
  })
  clients.forEach((client) =>
    client.postMessage({ type: 'FLUSH_OUTBOX' })
  )
}

// ─── Mensajes desde la app ────────────────────────────────────────────────────

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
