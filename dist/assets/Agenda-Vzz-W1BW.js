import{r as t,d as N,q as S,g as J,j as a,l as X}from"./index-eY-afwdD.js";const Q=`

/* ── Layout raíz ────────────────────────────────────────────────────────── */
.ag {
  max-width: 960px;
  margin-inline: auto;
  padding: var(--space-4);
  padding-bottom: calc(var(--space-16) + var(--space-6));
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-5);
  animation: ag-fade-in var(--transition-normal) both;
}
@media (min-width: 720px) {
  .ag { grid-template-columns: minmax(300px, 380px) 1fr; align-items: start; }
}

/* ── Calendario: panel flotante multi-capa ──────────────────────────────── */
.ag-cal {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  overflow: hidden;
  /* 4 capas de sombra difuminada — efecto de profundidad premium */
  box-shadow:
    0  1px  2px  rgba(0,0,0,.04),
    0  4px 12px  rgba(0,0,0,.06),
    0 14px 32px  rgba(0,0,0,.05),
    0 36px 72px  rgba(0,0,0,.04);
}
.dark .ag-cal {
  box-shadow:
    0  1px  2px  rgba(0,0,0,.30),
    0  4px 12px  rgba(0,0,0,.34),
    0 14px 32px  rgba(0,0,0,.28),
    0 36px 72px  rgba(0,0,0,.22);
}

/* Header del mes */
.ag-cal__hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-5);
  background: linear-gradient(135deg,
    var(--color-primary-dark)  0%,
    var(--color-primary)       55%,
    var(--color-primary-light) 100%);
  position: relative;
  overflow: hidden;
}
/* Orbs decorativos en el header */
.ag-cal__hdr::before,
.ag-cal__hdr::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.ag-cal__hdr::before {
  top: -55%; right: -8%;
  width: 210px; height: 210px;
  background: radial-gradient(circle, rgba(255,255,255,.10) 0%, transparent 68%);
}
.ag-cal__hdr::after {
  bottom: -65%; left: 4%;
  width: 150px; height: 150px;
  background: radial-gradient(circle, rgba(255,255,255,.07) 0%, transparent 70%);
}

.ag-cal__title { text-align: center; position: relative; z-index: 1; }
.ag-cal__month {
  font-size: var(--text-xl);
  font-weight: 800;
  color: #fff;
  letter-spacing: -.025em;
  text-shadow: 0 1px 4px rgba(0,0,0,.22);
  display: block;
  line-height: 1.1;
  text-transform: capitalize;
}
.ag-cal__year {
  font-size: var(--text-xs);
  color: rgba(255,255,255,.72);
  font-weight: 600;
  letter-spacing: .08em;
  display: block;
  margin-top: 2px;
}
.ag-cal__hoy-btn {
  display: block;
  margin: 5px auto 0;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  border: 1px solid rgba(255,255,255,.35);
  background: rgba(255,255,255,.13);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .07em;
  cursor: pointer;
  transition: background var(--transition-fast);
}
.ag-cal__hoy-btn:hover { background: rgba(255,255,255,.26); }

/* Botones de navegación */
.ag-nav {
  width: 38px; height: 38px;
  border-radius: var(--radius-full);
  border: 1.5px solid rgba(255,255,255,.28);
  background: rgba(255,255,255,.09);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0;
  position: relative; z-index: 1;
  transition:
    background 180ms ease,
    transform  220ms cubic-bezier(.34,1.56,.64,1);
}
.ag-nav:hover  { background: rgba(255,255,255,.22); transform: scale(1.08); }
.ag-nav:active { transform: scale(.92); }

/* Etiquetas días de semana */
.ag-cal__dow {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: var(--space-3) var(--space-3) var(--space-2);
  background: var(--color-primary-surface);
}
.ag-cal__dow-lbl {
  text-align: center;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: var(--color-primary);
  padding: var(--space-1) 0;
}

/* Grid de días — 7 columnas */
.ag-cal__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
  padding: var(--space-3);
}

/* Celda de día */
.ag-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  cursor: pointer;
  position: relative;
  border: none;
  background: transparent;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  /* GPU layer propia para la transición */
  will-change: transform;
  transition:
    transform  200ms cubic-bezier(.34,1.56,.64,1),
    background 160ms ease,
    box-shadow 160ms ease;
}
.ag-day--empty { pointer-events: none; opacity: 0; }

/* Hover (ni vacío, ni seleccionado) */
.ag-day:not(.ag-day--empty):not(.ag-day--sel):hover {
  background: var(--color-primary-surface);
  transform: translateY(-2px) scale(1.07);
  box-shadow: 0 5px 14px rgba(46,125,50,.12);
}

/* Hoy — borde luminoso */
.ag-day--today:not(.ag-day--sel) {
  outline: 2px solid var(--color-primary-light);
  outline-offset: -2px;
}
.ag-day--today:not(.ag-day--sel) .ag-day__num {
  color: var(--color-primary);
  font-weight: 800;
}

/* Fin de semana */
.ag-day--wknd:not(.ag-day--sel):not(.ag-day--today) .ag-day__num {
  color: var(--color-text-mid);
}

/* ★ SELECCIONADO — degradado luminoso con glow en 3 capas ★ */
.ag-day--sel {
  background: linear-gradient(
    148deg,
    var(--color-primary-dark)  0%,
    var(--color-primary)       42%,
    var(--color-primary-light) 100%
  );
  box-shadow:
    0  4px 12px rgba(46,125,50,.42),
    0  8px 28px rgba(46,125,50,.24),
    0 18px 44px rgba(46,125,50,.12),
    inset 0  1px 0 rgba(255,255,255,.26),
    inset 0 -1px 0 rgba(0,0,0,.08);
  transform: translateY(-2px) scale(1.10);
}
.ag-day--sel .ag-day__num {
  color: #fff;
  font-weight: 800;
  text-shadow: 0 1px 3px rgba(0,0,0,.24);
}
.ag-day--sel:hover {
  transform: translateY(-3px) scale(1.13);
  box-shadow:
    0  6px 18px rgba(46,125,50,.52),
    0 14px 38px rgba(46,125,50,.30),
    0 26px 54px rgba(46,125,50,.15),
    inset 0 1px 0 rgba(255,255,255,.32);
}

.ag-day__num {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-high);
  line-height: 1;
  z-index: 1;
}

/* Indicadores de turno */
.ag-day__dots {
  position: absolute;
  bottom: 4px;
  display: flex; gap: 3px; align-items: center;
  z-index: 1;
}
.ag-dot {
  width: 4px; height: 4px; border-radius: 50%; flex-shrink: 0;
}
.ag-dot--pendiente  { background: var(--color-accent); }
.ag-dot--confirmado { background: var(--color-primary-light); }
.ag-dot--cancelado  { background: var(--color-error); }
.ag-day--sel .ag-dot { background: rgba(255,255,255,.80); }

/* ── Columna derecha ────────────────────────────────────────────────────── */
.ag-right { display: flex; flex-direction: column; gap: var(--space-4); }

/* Barra de fecha seleccionada */
.ag-fecha-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow:
    0 2px 4px  rgba(0,0,0,.04),
    0 6px 16px rgba(0,0,0,.06),
    0 18px 36px rgba(0,0,0,.04);
}
.ag-fecha-bar__info { display: flex; flex-direction: column; gap: 2px; }
.ag-fecha-bar__dow {
  font-size: 10px; font-weight: 800;
  letter-spacing: .09em; text-transform: uppercase;
  color: var(--color-primary);
}
.ag-fecha-bar__num {
  font-size: var(--text-3xl); font-weight: 900;
  letter-spacing: -.04em; line-height: 1;
  color: var(--color-text-high);
}
.ag-fecha-bar__mes {
  font-size: var(--text-sm); font-weight: 500;
  color: var(--color-text-mid);
}

/* Botón Nuevo turno */
.ag-btn-new {
  position: relative; overflow: hidden;
  display: inline-flex; align-items: center; gap: 6px;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-full); border: none;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
  color: #fff; font-size: var(--text-sm); font-weight: 700;
  cursor: pointer; white-space: nowrap;
  box-shadow: 0 3px 10px rgba(46,125,50,.30);
  transition: transform 220ms cubic-bezier(.34,1.56,.64,1), box-shadow 220ms ease;
}
.ag-btn-new::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(90deg,
    transparent, rgba(255,255,255,.15), transparent);
  opacity: 0; transition: opacity 200ms ease;
}
.ag-btn-new:hover { transform: scale(1.05) translateY(-1px); box-shadow: 0 7px 22px rgba(46,125,50,.40); }
.ag-btn-new:hover::after { opacity: 1; }
.ag-btn-new:active { transform: scale(.96); }
.ag-btn-new--active {
  background: linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%);
}

/* ── Panel de formulario inline ─────────────────────────────────────────── */
/*  Animación: opacity + translateY + max-height combinados                  */
.ag-form-panel {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow:
    0 2px 4px  rgba(0,0,0,.04),
    0 8px 20px rgba(0,0,0,.07),
    0 20px 40px rgba(0,0,0,.05);
  /* Estado cerrado */
  max-height: 0;
  opacity: 0;
  transform: translateY(-14px) scale(.99);
  pointer-events: none;
  transition:
    max-height  420ms cubic-bezier(.4,0,.2,1),
    opacity     260ms ease,
    transform   280ms cubic-bezier(.34,1.15,.64,1);
}
.ag-form-panel--open {
  max-height: 960px;
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

/* Línea de acento degradada en el tope del panel */
.ag-form-panel__accent {
  height: 3px;
  background: linear-gradient(90deg,
    var(--color-primary-dark),
    var(--color-primary),
    var(--color-primary-light));
}
.ag-form-inner { padding: var(--space-5); }
.ag-form-title {
  font-size: var(--text-base); font-weight: 800;
  letter-spacing: -.01em; color: var(--color-text-high);
  margin-bottom: var(--space-4);
  display: flex; align-items: center; justify-content: space-between;
}

.ag-form  { display: flex; flex-direction: column; gap: var(--space-4); }
.ag-field { display: flex; flex-direction: column; gap: var(--space-2); }
.ag-label {
  font-size: 10px; font-weight: 800;
  letter-spacing: .08em; text-transform: uppercase;
  color: var(--color-primary);
}
.ag-input, .ag-select, .ag-textarea {
  width: 100%; padding: var(--space-3) var(--space-4);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text-high);
  font-size: var(--text-sm); font-family: var(--font-sans);
  outline: none; appearance: none; -webkit-appearance: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  box-sizing: border-box;
}
.ag-input:focus, .ag-select:focus, .ag-textarea:focus {
  border-color: var(--color-primary-light);
  box-shadow: 0 0 0 3px rgba(76,175,80,.16);
}
.ag-textarea { resize: vertical; min-height: 76px; }

/* Select con chevron */
.ag-sel-wrap { position: relative; }
.ag-sel-wrap::after {
  content: ''; position: absolute;
  right: 14px; top: 50%; transform: translateY(-50%);
  width: 0; height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid var(--color-text-mid);
  pointer-events: none;
}

.ag-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }

/* Acciones del formulario */
.ag-form-actions {
  display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap;
}
.ag-btn-cancel {
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-md); border: 1.5px solid var(--color-border);
  background: transparent; color: var(--color-text-mid);
  font-size: var(--text-sm); font-weight: 600; cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}
.ag-btn-cancel:hover { background: var(--color-surface-raised); color: var(--color-text-high); }

.ag-btn-save {
  flex: 1; position: relative; overflow: hidden;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md); border: none;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
  color: #fff; font-size: var(--text-sm); font-weight: 700; cursor: pointer;
  box-shadow: 0 3px 10px rgba(46,125,50,.25);
  transition: transform 200ms cubic-bezier(.34,1.56,.64,1), box-shadow 200ms ease;
}
.ag-btn-save:hover  { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(46,125,50,.36); }
.ag-btn-save:active { transform: scale(.97); }
.ag-btn-save:disabled { opacity: .50; cursor: not-allowed; pointer-events: none; }

.ag-saved-msg {
  font-size: var(--text-xs); font-weight: 700; color: var(--color-success);
  display: inline-flex; align-items: center; gap: 5px;
  animation: ag-fade-in .2s both;
}

/* ── Combobox buscador de pacientes ─────────────────────────────────────── */
.ag-combo { position: relative; }
.ag-combo__input {
  width: 100%; padding: var(--space-3) var(--space-10) var(--space-3) var(--space-10);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg); color: var(--color-text-high);
  font-size: var(--text-sm); font-family: var(--font-sans);
  outline: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  box-sizing: border-box;
}
.ag-combo__input:focus {
  border-color: var(--color-primary-light);
  box-shadow: 0 0 0 3px rgba(76,175,80,.16);
}
.ag-combo__icon {
  position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
  color: var(--color-text-low); pointer-events: none;
}
.ag-combo__clear {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  width: 22px; height: 22px; border-radius: 50%;
  border: none; background: var(--color-surface-raised);
  color: var(--color-text-mid); font-size: 14px; line-height: 1;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: background var(--transition-fast), color var(--transition-fast);
}
.ag-combo__clear:hover { background: var(--color-error-surface); color: var(--color-error); }

.ag-combo__dropdown {
  position: absolute; top: calc(100% + 6px); left: 0; right: 0;
  z-index: var(--z-raised);
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  max-height: 230px; overflow-y: auto;
  animation: ag-dropdown-in 140ms ease forwards;
}
@keyframes ag-dropdown-in {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.ag-combo__opt {
  display: flex; align-items: center; gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.ag-combo__opt:hover,
.ag-combo__opt--active { background: var(--color-primary-surface); }
.ag-combo__opt-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--color-primary-surface);
  display: flex; align-items: center; justify-content: center;
  font-size: var(--text-xs); font-weight: 800; color: var(--color-primary);
  flex-shrink: 0;
}
.ag-combo__opt-name {
  font-size: var(--text-sm); font-weight: 600; color: var(--color-text-high);
  line-height: 1.3;
}
.ag-combo__opt-tel {
  font-size: 11px; color: var(--color-text-low); margin-top: 1px;
}
.ag-combo__empty {
  padding: var(--space-4); text-align: center;
  font-size: var(--text-sm); color: var(--color-text-low);
}

/* ── Lista de turnos ─────────────────────────────────────────────────────── */
.ag-list { display: flex; flex-direction: column; gap: var(--space-3); }

.ag-loading {
  display: flex; align-items: center; justify-content: center; gap: var(--space-2);
  padding: var(--space-10);
  color: var(--color-text-low); font-size: var(--text-sm);
}

.ag-empty {
  text-align: center;
  padding: var(--space-12) var(--space-6);
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  animation: ag-fade-in .3s both;
}
.ag-empty__icon  { font-size: 2.8rem; display: block; margin-bottom: var(--space-3); }
.ag-empty__title { font-size: var(--text-base); font-weight: 700; color: var(--color-text-mid); margin-bottom: var(--space-1); }
.ag-empty__hint  { font-size: var(--text-sm); color: var(--color-text-low); }

/* ── TurnoCard ───────────────────────────────────────────────────────────── */
.ag-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: grid;
  grid-template-columns: 4px 1fr;
  box-shadow:
    0 2px 4px  rgba(0,0,0,.04),
    0 6px 16px rgba(0,0,0,.06),
    0 16px 30px rgba(0,0,0,.04);
  transition: box-shadow 220ms ease, transform 220ms ease;
  animation: ag-card-in .30s cubic-bezier(.34,1.15,.64,1) both;
}
@keyframes ag-card-in {
  from { opacity: 0; transform: translateY(18px) scale(.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.ag-card:hover {
  box-shadow:
    0 4px 8px  rgba(0,0,0,.06),
    0 12px 26px rgba(0,0,0,.09),
    0 24px 48px rgba(0,0,0,.06);
  transform: translateY(-2px);
}

/* Barra de estado cromática */
.ag-card__bar { flex-shrink: 0; }
.ag-card__bar--pendiente  { background: var(--color-accent); }
.ag-card__bar--confirmado { background: var(--color-primary-light); }
.ag-card__bar--cancelado  { background: var(--color-error); }

.ag-card__body {
  padding: var(--space-3) var(--space-4);
  display: flex; align-items: center; gap: var(--space-3); min-width: 0;
}

/* Avatar de iniciales */
.ag-avatar {
  width: 44px; height: 44px; border-radius: var(--radius-full);
  background: var(--color-primary-surface);
  display: flex; align-items: center; justify-content: center;
  font-size: var(--text-base); font-weight: 800; color: var(--color-primary);
  flex-shrink: 0; letter-spacing: -.01em;
}

.ag-card__info { flex: 1; min-width: 0; }
.ag-card__name {
  font-size: var(--text-sm); font-weight: 700; color: var(--color-text-high);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 3px;
}
.ag-card__meta {
  display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap;
}
.ag-card__time {
  font-size: 11px; font-weight: 700; color: var(--color-primary);
  display: flex; align-items: center; gap: 3px;
}
.ag-badge {
  font-size: 9px; font-weight: 800; letter-spacing: .07em; text-transform: uppercase;
  padding: 2px 7px; border-radius: var(--radius-full); line-height: 1.4;
}
.ag-badge--pendiente  { background: var(--color-accent-surface);  color: var(--color-accent); }
.ag-badge--confirmado { background: var(--color-primary-surface); color: var(--color-primary); }
.ag-badge--cancelado  { background: var(--color-error-surface);   color: var(--color-error); }

.ag-card__motivo {
  font-size: 11px; color: var(--color-text-low); margin-top: 3px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  font-style: italic;
}

/* Acciones del turno */
.ag-card__actions {
  display: flex; align-items: center; gap: var(--space-2); flex-shrink: 0;
  flex-wrap: wrap; justify-content: flex-end;
}
@media (max-width: 480px) {
  .ag-card__body { flex-wrap: wrap; }
  .ag-card__actions { width: 100%; padding-bottom: var(--space-2); }
}

/* ╔═══════════════════════════════════════════════════════════╗
   ║  BOTÓN WHATSAPP — micro-interacción premium               ║
   ║  · transition: all 0.3s ease  (spec exacta del prompt)    ║
   ║  · Expansión scale(1.03) en hover                         ║
   ║  · Sweep de luz interna (reflejo luminoso ::after)        ║
   ╚═══════════════════════════════════════════════════════════╝ */
.ag-btn-wa {
  position: relative;
  overflow: hidden;                         /* contiene el destello */
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 13px;
  border-radius: var(--radius-full);
  border: none;
  background: linear-gradient(140deg, #25D366 0%, #128C7E 100%);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .04em;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: 0 3px 9px rgba(37,211,102,.30);
  -webkit-tap-highlight-color: transparent;
  /* ↓ Especificación exacta del diseño */
  transition: all 0.3s ease;
}

/* Reflejo de luz interno — sweep de izquierda a derecha */
.ag-btn-wa::after {
  content: '';
  position: absolute;
  top: 0;
  left: -90%;
  width: 55%;
  height: 100%;
  background: linear-gradient(
    to right,
    rgba(255,255,255,0)    0%,
    rgba(255,255,255,.36)  50%,
    rgba(255,255,255,0)    100%
  );
  transform: skewX(-18deg);
  pointer-events: none;
  /* El destello usa su propia transición para el sweep */
  transition: left 420ms cubic-bezier(.4,0,.2,1);
}

/* HOVER — expansión 3% + tono más vivo + sweep completo */
.ag-btn-wa:hover {
  transform: scale(1.03) translateY(-1px);
  background: linear-gradient(140deg, #2EE372 0%, #18BF88 100%);
  box-shadow:
    0 6px 20px rgba(37,211,102,.45),
    0 2px  8px rgba(37,211,102,.22);
  filter: brightness(1.06);
}
.ag-btn-wa:hover::after { left: 120%; }   /* sweep completo al pasar el cursor */

/* CLICK */
.ag-btn-wa:active {
  transform: scale(.97);
  box-shadow: 0 2px 8px rgba(37,211,102,.20);
  filter: brightness(.97);
}

.ag-btn-wa:disabled {
  opacity: .38;
  cursor: not-allowed;
  pointer-events: none;
}

/* Botones de icono (editar / eliminar) */
.ag-btn-ic {
  width: 34px; height: 34px; border-radius: var(--radius-full);
  border: 1.5px solid var(--color-border); background: transparent;
  color: var(--color-text-mid);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0;
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    border-color var(--transition-fast),
    transform 200ms cubic-bezier(.34,1.56,.64,1);
}
.ag-btn-ic:hover { background: var(--color-surface-raised); color: var(--color-text-high); transform: scale(1.10); }
.ag-btn-ic--del:hover { background: var(--color-error-surface); color: var(--color-error); border-color: var(--color-error); }

/* ── Animaciones globales del componente ─────────────────────────────────── */
@keyframes ag-fade-in {
  from { opacity: 0; transform: translateY(5px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ag-spin {
  to { transform: rotate(360deg); }
}
`;function K(){if(typeof document>"u"||document.getElementById("ag-styles-v2"))return;const e=document.createElement("style");e.id="ag-styles-v2",e.textContent=Q,document.head.appendChild(e)}function I(e,o,n){const c=t.useMemo(()=>X(e),o),p=t.useRef(n);return t.useSyncExternalStore(t.useCallback(l=>{const s=c.subscribe({next:x=>{p.current=x,l()},error:()=>l()});return()=>s.unsubscribe()},[c]),()=>p.current,()=>n)}const Z=["L","M","X","J","V","S","D"],L=["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"],C=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];function _(e){return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,"0")}-${String(e.getDate()).padStart(2,"0")}`}function F(e){const[o,n,c]=e.split("-").map(Number);return new Date(o,n-1,c)}function aa(e){const o=e.getFullYear(),n=e.getMonth(),c=new Date(o,n,1),p=new Date(o,n+1,0),l=(c.getDay()+6)%7,s=Math.ceil((l+p.getDate())/7)*7,x=[];for(let d=0;d<s;d++){const g=d-l+1;if(g<1||g>p.getDate())x.push({empty:!0,key:`e${d}`});else{const h=new Date(o,n,g);x.push({empty:!1,key:_(h),iso:_(h),day:g,weekend:h.getDay()===0||h.getDay()===6})}}return x}function Y(e="",o=""){return((e[0]??"")+(o[0]??"")).toUpperCase()||"?"}function ea(e,o,n,c,p){const l=(e??"").replace(/\D/g,"");if(!l)return null;const s=F(n),x=L[(s.getDay()+6)%7],d=C[s.getMonth()],g=p?`
📋 *Motivo:* ${p}`:"",h=`Hola ${o}! 👋

Te recordamos tu *turno nutricional*:
📅 *${x} ${s.getDate()} de ${d}*
⏰ *${c} hs*`+g+`

Por favor confirmá tu asistencia respondiendo este mensaje. 🌿
_NutriApp Profesional_`;return`https://wa.me/${l}?text=${encodeURIComponent(h)}`}const ra=()=>a.jsx("svg",{width:"15",height:"15",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.8",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:a.jsx("polyline",{points:"15 18 9 12 15 6"})}),oa=()=>a.jsx("svg",{width:"15",height:"15",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.8",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:a.jsx("polyline",{points:"9 18 15 12 9 6"})}),ta=()=>a.jsxs("svg",{width:"13",height:"13",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.8",strokeLinecap:"round","aria-hidden":"true",children:[a.jsx("line",{x1:"12",y1:"5",x2:"12",y2:"19"}),a.jsx("line",{x1:"5",y1:"12",x2:"19",y2:"12"})]}),A=()=>a.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round","aria-hidden":"true",children:[a.jsx("line",{x1:"18",y1:"6",x2:"6",y2:"18"}),a.jsx("line",{x1:"6",y1:"6",x2:"18",y2:"18"})]}),na=()=>a.jsxs("svg",{width:"15",height:"15",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.2",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:[a.jsx("circle",{cx:"11",cy:"11",r:"8"}),a.jsx("line",{x1:"21",y1:"21",x2:"16.65",y2:"16.65"})]}),sa=()=>a.jsxs("svg",{width:"11",height:"11",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.2",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:[a.jsx("circle",{cx:"12",cy:"12",r:"10"}),a.jsx("polyline",{points:"12 6 12 12 16 14"})]}),ia=()=>a.jsx("svg",{width:"13",height:"13",viewBox:"0 0 24 24",fill:"currentColor","aria-hidden":"true",children:a.jsx("path",{d:"M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"})}),la=()=>a.jsxs("svg",{width:"13",height:"13",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:[a.jsx("path",{d:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"}),a.jsx("path",{d:"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"})]}),ca=()=>a.jsxs("svg",{width:"13",height:"13",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:[a.jsx("polyline",{points:"3 6 5 6 21 6"}),a.jsx("path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"})]}),da=()=>a.jsxs("svg",{width:"13",height:"13",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.2",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:[a.jsx("path",{d:"M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"}),a.jsx("polyline",{points:"17 21 17 13 7 13 7 21"}),a.jsx("polyline",{points:"7 3 7 8 15 8"})]}),ga=()=>a.jsx("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.8",strokeLinecap:"round","aria-hidden":"true",children:a.jsx("polyline",{points:"20 6 9 17 4 12"})}),B=()=>a.jsx("svg",{width:"13",height:"13",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",style:{animation:"ag-spin 1s linear infinite"},"aria-hidden":"true",children:a.jsx("path",{d:"M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"})}),pa=()=>a.jsx("svg",{width:"11",height:"11",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round","aria-hidden":"true",children:a.jsx("path",{d:"M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"})});function ma({pacientes:e=[],value:o,onChange:n}){const[c,p]=t.useState(""),[l,s]=t.useState(!1),x=t.useRef(null),d=t.useRef(null),g=t.useMemo(()=>e.find(i=>i.id===o)??null,[e,o]),h=t.useMemo(()=>{const i=c.trim().toLowerCase();return!i&&!l?e.slice(0,10):i?e.filter(m=>`${m.nombre??""} ${m.apellido??""} ${m.telefono??""}`.toLowerCase().includes(i)):e},[e,c,l]);t.useEffect(()=>{if(!l)return;function i(m){var y;(y=x.current)!=null&&y.contains(m.target)||s(!1)}return document.addEventListener("pointerdown",i),()=>document.removeEventListener("pointerdown",i)},[l]);function b(i){n(i.id),p(""),s(!1)}function f(i){var m;i.stopPropagation(),n(""),p(""),(m=d.current)==null||m.focus()}const w=g?`${g.nombre??""} ${g.apellido??""}`.trim():c;return a.jsxs("div",{className:"ag-combo",ref:x,children:[a.jsx("span",{className:"ag-combo__icon",children:a.jsx(na,{})}),a.jsx("input",{ref:d,className:"ag-combo__input",type:"text",placeholder:"Buscar paciente por nombre o teléfono…",value:w,onChange:i=>{g&&n(""),p(i.target.value),s(!0)},onFocus:()=>s(!0),autoComplete:"off","aria-label":"Buscar y seleccionar paciente","aria-expanded":l,"aria-haspopup":"listbox"}),(o||c)&&a.jsx("button",{className:"ag-combo__clear",onClick:f,type:"button","aria-label":"Limpiar selección de paciente",children:"×"}),l&&e.length>0&&a.jsx("div",{className:"ag-combo__dropdown",role:"listbox","aria-label":"Pacientes",children:h.length===0?a.jsxs("div",{className:"ag-combo__empty",children:["Sin resultados para «",c,"»"]}):h.slice(0,8).map(i=>{const m=`${i.nombre??""} ${i.apellido??""}`.trim();return a.jsxs("div",{className:`ag-combo__opt${i.id===o?" ag-combo__opt--active":""}`,role:"option","aria-selected":i.id===o,onPointerDown:()=>b(i),children:[a.jsx("div",{className:"ag-combo__opt-avatar","aria-hidden":"true",children:Y(i.nombre,i.apellido)}),a.jsxs("div",{children:[a.jsx("div",{className:"ag-combo__opt-name",children:m||"—"}),i.telefono&&a.jsxs("div",{className:"ag-combo__opt-tel",children:["📱 ",i.telefono]})]})]},i.id)})}),l&&e.length===0&&a.jsx("div",{className:"ag-combo__dropdown",children:a.jsx("div",{className:"ag-combo__empty",children:"No hay pacientes registrados aún."})})]})}const $={pacienteId:"",hora:"09:00",estado:"pendiente",motivo:""};function ua({open:e,fechaISO:o,editing:n,pacientes:c,onClose:p,onSave:l}){const[s,x]=t.useState($),[d,g]=t.useState(!1),[h,b]=t.useState(!1);t.useEffect(()=>{e&&(b(!1),x(n?{pacienteId:n.pacienteId??"",hora:n.hora??"09:00",estado:n.estado??"pendiente",motivo:n.motivo??""}:{...$}))},[e,n]);function f(m){const{name:y,value:z}=m.target;x(M=>({...M,[y]:z})),b(!1)}async function w(m){if(m.preventDefault(),!(!s.pacienteId||!s.hora)){g(!0);try{await l({...n??{},...s,fecha:o}),b(!0),setTimeout(()=>{p(),b(!1)},820)}finally{g(!1)}}}const i=!!(s.pacienteId&&s.hora&&!d);return a.jsxs("div",{className:`ag-form-panel${e?" ag-form-panel--open":""}`,role:"region","aria-label":"Formulario de turno",...e?{}:{inert:""},children:[a.jsx("div",{className:"ag-form-panel__accent","aria-hidden":"true"}),a.jsxs("div",{className:"ag-form-inner",children:[a.jsxs("div",{className:"ag-form-title",children:[a.jsx("span",{children:n?"✏️ Editar turno":"📅 Nuevo turno"}),a.jsx("button",{className:"ag-btn-ic",onClick:p,type:"button","aria-label":"Cerrar formulario",title:"Cerrar",children:a.jsx(A,{})})]}),a.jsxs("form",{className:"ag-form",onSubmit:w,noValidate:!0,children:[a.jsxs("div",{className:"ag-field",children:[a.jsx("label",{className:"ag-label",children:"👤 Paciente"}),a.jsx(ma,{pacientes:c??[],value:s.pacienteId,onChange:m=>{x(y=>({...y,pacienteId:m})),b(!1)}})]}),a.jsxs("div",{className:"ag-form-row",children:[a.jsxs("div",{className:"ag-field",children:[a.jsx("label",{className:"ag-label",htmlFor:"ag-hora",children:"⏰ Hora"}),a.jsx("input",{id:"ag-hora",type:"time",name:"hora",className:"ag-input",value:s.hora,onChange:f,required:!0})]}),a.jsxs("div",{className:"ag-field",children:[a.jsx("label",{className:"ag-label",htmlFor:"ag-estado",children:"📌 Estado"}),a.jsx("div",{className:"ag-sel-wrap",children:a.jsxs("select",{id:"ag-estado",name:"estado",className:"ag-select",value:s.estado,onChange:f,children:[a.jsx("option",{value:"pendiente",children:"Pendiente"}),a.jsx("option",{value:"confirmado",children:"Confirmado"}),a.jsx("option",{value:"cancelado",children:"Cancelado"})]})})]})]}),a.jsxs("div",{className:"ag-field",children:[a.jsx("label",{className:"ag-label",htmlFor:"ag-motivo",children:"📋 Motivo de consulta"}),a.jsx("textarea",{id:"ag-motivo",name:"motivo",className:"ag-textarea",value:s.motivo,onChange:f,placeholder:"Ej: Primera consulta, control mensual, revisión de plan alimentario…",rows:3})]}),a.jsxs("div",{className:"ag-form-actions",children:[a.jsx("button",{type:"button",className:"ag-btn-cancel",onClick:p,children:"Cancelar"}),a.jsx("button",{type:"submit",className:"ag-btn-save",disabled:!i,children:d?a.jsxs(a.Fragment,{children:[a.jsx(B,{})," Guardando…"]}):a.jsxs(a.Fragment,{children:[a.jsx(da,{})," ",n?"Guardar cambios":"Crear turno"]})}),h&&a.jsxs("span",{className:"ag-saved-msg",children:[a.jsx(ga,{})," ¡Guardado!"]})]})]})]})]})}function xa({turno:e,paciente:o,onEdit:n,onDelete:c,animDelay:p=0}){const l=(o==null?void 0:o.nombre)??"Paciente",s=(o==null?void 0:o.apellido)??"",x=(o==null?void 0:o.telefono)??"",d=`${l} ${s}`.trim(),g=ea(x,d,e.fecha,e.hora,e.motivo);function h(){g&&window.open(g,"_blank","noopener,noreferrer")}return a.jsxs("article",{className:"ag-card",style:{animationDelay:`${p}ms`},"aria-label":`Turno de ${d} a las ${e.hora}`,children:[a.jsx("div",{className:`ag-card__bar ag-card__bar--${e.estado}`,"aria-hidden":"true"}),a.jsxs("div",{className:"ag-card__body",children:[a.jsx("div",{className:"ag-avatar","aria-hidden":"true",children:Y(l,s)}),a.jsxs("div",{className:"ag-card__info",children:[a.jsx("div",{className:"ag-card__name",children:d}),a.jsxs("div",{className:"ag-card__meta",children:[a.jsxs("span",{className:"ag-card__time",children:[a.jsx(sa,{}),e.hora," hs"]}),a.jsx("span",{className:`ag-badge ag-badge--${e.estado}`,children:e.estado})]}),e.motivo&&a.jsx("div",{className:"ag-card__motivo",title:e.motivo,children:e.motivo}),e.sincronizado!==1&&a.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"4px",fontSize:"10px",color:"var(--color-text-low)",marginTop:"4px"},"aria-label":"Pendiente de sincronización",children:[a.jsx(pa,{})," Guardado localmente"]})]}),a.jsxs("div",{className:"ag-card__actions",children:[a.jsxs("button",{className:"ag-btn-wa",onClick:h,disabled:!g,title:g?`Enviar recordatorio a ${d} por WhatsApp`:"Sin número de teléfono registrado","aria-label":`Enviar recordatorio por WhatsApp a ${d}`,children:[a.jsx(ia,{}),"Enviar Recordatorio"]}),a.jsx("button",{className:"ag-btn-ic",onClick:()=>n(e),"aria-label":"Editar turno",title:"Editar",type:"button",children:a.jsx(la,{})}),a.jsx("button",{className:"ag-btn-ic ag-btn-ic--del",onClick:()=>c(e.id),"aria-label":"Eliminar turno",title:"Eliminar",type:"button",children:a.jsx(ca,{})})]})]})]})}function ha(){t.useEffect(()=>{K()},[]);const e=t.useMemo(()=>_(new Date),[]),[o,n]=t.useState(()=>{const r=new Date;return new Date(r.getFullYear(),r.getMonth(),1)}),[c,p]=t.useState(e),[l,s]=t.useState(null),[x,d]=t.useState(null),g=t.useMemo(()=>_(o),[o]),h=t.useMemo(()=>_(new Date(o.getFullYear(),o.getMonth()+1,0)),[o]),b=I(()=>N.turnos.where("fecha").between(g,h,!0,!0).toArray(),[g,h],void 0),f=I(()=>N.pacientes.orderBy("nombre").toArray(),[],[]),w=t.useMemo(()=>{const r=new Map;if(!b)return r;for(const u of b){const v=r.get(u.fecha)??[];v.push(u),r.set(u.fecha,v)}return r},[b]),i=t.useMemo(()=>{const r=new Map;return(f??[]).forEach(u=>r.set(u.id,u)),r},[f]),m=t.useMemo(()=>[...w.get(c)??[]].sort((u,v)=>u.hora.localeCompare(v.hora)),[w,c]),y=t.useMemo(()=>aa(o),[o]),z=t.useCallback(()=>n(r=>new Date(r.getFullYear(),r.getMonth()-1,1)),[]),M=t.useCallback(()=>n(r=>new Date(r.getFullYear(),r.getMonth()+1,1)),[]),O=t.useCallback(()=>{const r=new Date;n(new Date(r.getFullYear(),r.getMonth(),1)),p(_(r))},[]),T=t.useCallback(()=>{d(null),s("new")},[]),P=t.useCallback(r=>{d(r),s("edit")},[]),E=t.useCallback(()=>{s(null),d(null)},[]),W=t.useCallback(async r=>{window.confirm("¿Eliminar este turno?")&&(await N.turnos.delete(r),await S("turnos","DELETE",{id:r}))},[]),R=t.useCallback(async r=>{if(r.id){const{id:u,...v}=r;await N.turnos.update(u,{...v,sincronizado:0}),await S("turnos","UPDATE",r)}else{const u={...r,id:J(),sincronizado:0,creadoEn:new Date().toISOString()};await N.turnos.add(u),await S("turnos","CREATE",u)}},[]),j=F(c),H=L[(j.getDay()+6)%7],D=C[j.getMonth()],V=_(o).slice(0,7)!==e.slice(0,7);return a.jsxs("div",{className:"ag",children:[a.jsxs("div",{className:"ag-cal",role:"region","aria-label":"Calendario de turnos",children:[a.jsxs("div",{className:"ag-cal__hdr",children:[a.jsx("button",{className:"ag-nav",onClick:z,"aria-label":"Mes anterior",type:"button",children:a.jsx(ra,{})}),a.jsxs("div",{className:"ag-cal__title",children:[a.jsx("span",{className:"ag-cal__month",children:C[o.getMonth()]}),a.jsx("span",{className:"ag-cal__year",children:o.getFullYear()}),V&&a.jsx("button",{className:"ag-cal__hoy-btn",onClick:O,type:"button",children:"HOY"})]}),a.jsx("button",{className:"ag-nav",onClick:M,"aria-label":"Mes siguiente",type:"button",children:a.jsx(oa,{})})]}),a.jsx("div",{className:"ag-cal__dow","aria-hidden":"true",children:Z.map(r=>a.jsx("div",{className:"ag-cal__dow-lbl",children:r},r))}),a.jsx("div",{className:"ag-cal__grid",role:"grid","aria-label":`${C[o.getMonth()]} ${o.getFullYear()}`,children:y.map(r=>{if(r.empty)return a.jsx("div",{className:"ag-day ag-day--empty","aria-hidden":"true"},r.key);const u=r.iso===c,v=r.iso===e,k=(w.get(r.iso)??[]).slice(0,3),q=["ag-day",u&&"ag-day--sel",v&&"ag-day--today",r.weekend&&!u&&"ag-day--wknd"].filter(Boolean).join(" ");return a.jsxs("button",{className:q,onClick:()=>p(r.iso),type:"button",role:"gridcell","aria-pressed":u,"aria-label":[`${r.day} de ${C[o.getMonth()]}`,v&&"hoy",k.length&&`${k.length} turno${k.length>1?"s":""}`].filter(Boolean).join(", "),children:[a.jsx("span",{className:"ag-day__num",children:r.day}),k.length>0&&a.jsx("div",{className:"ag-day__dots","aria-hidden":"true",children:k.map((G,U)=>a.jsx("div",{className:`ag-dot ag-dot--${G.estado}`},U))})]},r.iso)})})]}),a.jsxs("div",{className:"ag-right",children:[a.jsxs("div",{className:"ag-fecha-bar",children:[a.jsxs("div",{className:"ag-fecha-bar__info",children:[a.jsx("span",{className:"ag-fecha-bar__dow",children:H}),a.jsx("span",{className:"ag-fecha-bar__num",children:j.getDate()}),a.jsxs("span",{className:"ag-fecha-bar__mes",children:[D," ",j.getFullYear()]})]}),a.jsx("button",{className:`ag-btn-new${l?" ag-btn-new--active":""}`,onClick:l?E:T,type:"button","aria-label":l?"Cerrar formulario de turno":"Agregar nuevo turno",children:l?a.jsxs(a.Fragment,{children:[a.jsx(A,{})," Cerrar"]}):a.jsxs(a.Fragment,{children:[a.jsx(ta,{})," Nuevo turno"]})})]}),a.jsx(ua,{open:l!==null,fechaISO:c,editing:x,pacientes:f,onClose:E,onSave:R}),a.jsx("div",{className:"ag-list",role:"list","aria-label":`Turnos del ${j.getDate()} de ${D}`,"aria-live":"polite",children:b===void 0?a.jsxs("div",{className:"ag-loading",role:"status",children:[a.jsx(B,{})," Cargando turnos…"]}):m.length===0?a.jsxs("div",{className:"ag-empty",role:"status",children:[a.jsx("span",{className:"ag-empty__icon","aria-hidden":"true",children:"🗓️"}),a.jsx("p",{className:"ag-empty__title",children:"Sin turnos para este día"}),a.jsxs("p",{className:"ag-empty__hint",children:["Tocá ",a.jsx("strong",{children:"Nuevo turno"})," para agendar una cita."]})]}):m.map((r,u)=>a.jsx(xa,{turno:r,paciente:i.get(r.pacienteId),onEdit:P,onDelete:W,animDelay:u*55},r.id))})]})]})}function fa(){return a.jsx(ha,{})}export{fa as default};
