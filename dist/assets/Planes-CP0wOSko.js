import{r as o,d as $,j as a,g as ea,q as ra,l as wa,u as ya}from"./index-C1DGP_VQ.js";import{p as ka}from"./costos-V0IoYBoe.js";const ja=`

/* ── Wrapper ─────────────────────────────────────────────────────────────── */
.bp { position: relative; width: 100%; }

/* ── Campo de búsqueda ───────────────────────────────────────────────────── */
.bp-field {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 10px var(--space-4);
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  transition:
    border-color var(--transition-fast),
    box-shadow   var(--transition-fast);
  cursor: text;
}
.bp-field--focus {
  border-color: var(--color-primary-light);
  box-shadow: 0 0 0 3px rgba(76,175,80,.14);
}
.bp-icon {
  color: var(--color-text-low);
  flex-shrink: 0;
  display: flex;
  pointer-events: none;
}
.bp-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: var(--text-sm);
  color: var(--color-text-high);
  min-width: 0;
  -webkit-appearance: none;
  appearance: none;
}
.bp-input::-webkit-search-cancel-button { display: none; }
.bp-input::placeholder { color: var(--color-text-disabled); }

.bp-spinner {
  width: 15px;
  height: 15px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.65s linear infinite;
  flex-shrink: 0;
}

.bp-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: var(--radius-full);
  background: var(--color-surface-raised);
  color: var(--color-text-mid);
  cursor: pointer;
  flex-shrink: 0;
  transition: background var(--transition-fast), color var(--transition-fast);
}
.bp-clear:hover { background: var(--color-border); color: var(--color-text-high); }

/* ═══════════════════════════════════════════════════════════════════════════
   PANEL FLOTANTE — capa superior con desenfoque de fondo
   ═══════════════════════════════════════════════════════════════════════════ */
.bp-panel {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 8px);
  z-index: var(--z-overlay);

  /* Blur + saturación + capa translúcida = glassmorphism */
  background: rgba(255,255,255,.92);
  backdrop-filter: blur(8px) saturate(180%);
  -webkit-backdrop-filter: blur(8px) saturate(180%);

  border-radius: var(--radius-xl);
  border: 1px solid rgba(255,255,255,.65);
  box-shadow:
    0  2px  6px rgba(0,0,0,.04),
    0  8px  24px rgba(0,0,0,.09),
    0 24px  56px rgba(0,0,0,.08),
    inset 0 1.5px 0 rgba(255,255,255,.85);

  overflow: hidden;
  max-height: 360px;
  overflow-y: auto;
  overscroll-behavior: contain;

  animation: bp-drop 220ms cubic-bezier(.34,1.15,.64,1) both;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}
.bp-panel::-webkit-scrollbar       { width: 4px; }
.bp-panel::-webkit-scrollbar-track { background: transparent; }
.bp-panel::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }

.dark .bp-panel {
  background: rgba(22,22,24,.92);
  border-color: rgba(255,255,255,.10);
  box-shadow:
    0  2px  6px rgba(0,0,0,.30),
    0  8px  24px rgba(0,0,0,.40),
    0 24px  56px rgba(0,0,0,.38),
    inset 0 1.5px 0 rgba(255,255,255,.06);
}

@keyframes bp-drop {
  from { opacity: 0; transform: translateY(-8px) scale(.97); }
  to   { opacity: 1; transform: translateY(0)    scale(1);   }
}

/* ── Encabezado sticky ───────────────────────────────────────────────────── */
.bp-section-hdr {
  position: sticky;
  top: 0;
  padding: 6px var(--space-4);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .10em;
  text-transform: uppercase;
  color: var(--color-primary);
  background: rgba(255,255,255,.80);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(46,125,50,.10);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}
.dark .bp-section-hdr {
  background: rgba(22,22,24,.80);
  border-bottom-color: rgba(102,187,106,.10);
}
.bp-section-hdr__count {
  background: var(--color-primary-surface);
  color: var(--color-primary);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .03em;
}
.dark .bp-section-hdr__count { background: rgba(46,125,50,.20); }

/* ── Row de cantidad del producto seleccionado ───────────────────────────── */
.bp-sel-row {
  padding: var(--space-3) var(--space-4);
  background: rgba(46,125,50,.06);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  border-bottom: 1px solid rgba(46,125,50,.10);
  animation: bp-drop 160ms ease both;
}
.dark .bp-sel-row {
  background: rgba(46,95,50,.18);
  border-bottom-color: rgba(102,187,106,.12);
}
.bp-sel-row__name {
  flex: 1;
  min-width: 0;
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bp-sel-row__preview {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-primary);
  white-space: nowrap;
}

/* Spinner de cantidad */
.bp-qty-wrap {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}
.bp-qty-btn {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--color-primary-light);
  background: var(--color-surface);
  color: var(--color-primary);
  font-size: 1rem;
  font-weight: 800;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background 150ms ease,
    transform  200ms cubic-bezier(.34,1.56,.64,1);
}
.bp-qty-btn:hover  { background: var(--color-primary-surface); transform: scale(1.12); }
.bp-qty-btn:active { transform: scale(.90); }
.bp-qty-input {
  width: 54px;
  text-align: center;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-sm);
  font-weight: 700;
  background: var(--color-surface);
  color: var(--color-text-high);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.bp-qty-input:focus {
  border-color: var(--color-primary-light);
  box-shadow: 0 0 0 2px rgba(76,175,80,.14);
}
.bp-qty-unit {
  font-size: var(--text-sm);
  color: var(--color-text-mid);
  font-weight: 500;
  flex-shrink: 0;
}

/* Botón Insertar */
.bp-add-btn {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 14px;
  border-radius: var(--radius-full);
  border: none;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
  color: #fff;
  font-size: var(--text-sm);
  font-weight: 700;
  letter-spacing: -.01em;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 3px 10px rgba(46,125,50,.28);
  flex-shrink: 0;
  transition:
    transform   230ms cubic-bezier(.34,1.56,.64,1),
    box-shadow  230ms ease;
}
.bp-add-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.16) 50%,rgba(255,255,255,0) 100%);
  opacity: 0;
  transition: opacity 200ms ease;
}
.bp-add-btn:hover { transform: scale(1.04) translateY(-1px); box-shadow: 0 7px 20px rgba(46,125,50,.38); }
.bp-add-btn:hover::after { opacity: 1; }
.bp-add-btn:active { transform: scale(.97); }
.bp-add-btn:disabled { opacity: .50; cursor: not-allowed; pointer-events: none; }

/* ── Items de resultado ───────────────────────────────────────────────────── */
.bp-list { list-style: none; padding: 0; margin: 0; }

.bp-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 10px var(--space-4);
  cursor: pointer;
  border-bottom: 1px solid rgba(0,0,0,.04);
  transition: background var(--transition-fast);
  -webkit-tap-highlight-color: transparent;
  outline: none;
}
.dark .bp-item { border-bottom-color: rgba(255,255,255,.04); }
.bp-item:last-child { border-bottom: none; }
.bp-item:hover, .bp-item:focus { background: rgba(46,125,50,.07); }
.dark .bp-item:hover, .dark .bp-item:focus { background: rgba(102,187,106,.08); }
.bp-item--active { background: rgba(46,125,50,.10) !important; }
.dark .bp-item--active { background: rgba(102,187,106,.11) !important; }

/* Ícono emoji de categoría */
.bp-item__ico {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-md);
  background: var(--color-primary-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
  transition: transform 200ms cubic-bezier(.34,1.56,.64,1);
}
.bp-item:hover .bp-item__ico,
.bp-item--active .bp-item__ico { transform: scale(1.08); }

/* Info del alimento */
.bp-item__info { flex: 1; min-width: 0; }
.bp-item__name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-high);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 3px;
}
.bp-item__pills {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
}
.bp-pill {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: var(--radius-full);
  background: var(--color-surface-raised);
  color: var(--color-text-mid);
  white-space: nowrap;
  letter-spacing: .01em;
}
.bp-pill--cat {
  background: var(--color-primary-surface);
  color: var(--color-primary);
}
.dark .bp-pill--cat { background: rgba(46,125,50,.20); }

/* Calorías */
.bp-item__kcal { flex-shrink: 0; text-align: right; }
.bp-item__kcal-val {
  font-size: var(--text-sm);
  font-weight: 800;
  color: var(--color-primary);
  display: block;
}
.bp-item__kcal-ref {
  font-size: 9px;
  color: var(--color-text-disabled);
  font-weight: 500;
  letter-spacing: .02em;
}

/* ── Estado vacío ─────────────────────────────────────────────────────────── */
.bp-empty {
  padding: var(--space-8) var(--space-4);
  text-align: center;
}
.bp-empty__ico { font-size: 2.2rem; display: block; margin-bottom: var(--space-2); }
.bp-empty__title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-mid);
  margin-bottom: 4px;
}
.bp-empty__sub { font-size: 11px; color: var(--color-text-low); }
`;function ta(e=""){const r=e.toLowerCase();return r.includes("fruta")?"🍎":r.includes("verdura")||r.includes("vegetal")?"🥦":r.includes("carne")||r.includes("proteín")?"🥩":r.includes("pollo")||r.includes("ave")?"🍗":r.includes("pescado")||r.includes("mariscos")?"🐟":r.includes("lácte")||r.includes("leche")||r.includes("yogur")?"🥛":r.includes("queso")?"🧀":r.includes("huevo")?"🥚":r.includes("cereal")||r.includes("pan")||r.includes("grano")?"🌾":r.includes("pasta")||r.includes("arroz")?"🍝":r.includes("legumbre")||r.includes("leguminosa")?"🫘":r.includes("nuez")||r.includes("semilla")||r.includes("fruto seco")?"🥜":r.includes("aceite")||r.includes("grasa")?"🫒":r.includes("bebida")||r.includes("jugo")||r.includes("infusión")?"🥤":r.includes("snack")||r.includes("golosina")?"🍪":r.includes("suplemento")?"💊":r.includes("azúcar")||r.includes("dulce")?"🍯":"🥗"}function oa(e,r){const i=parseFloat(e.porcion??100),c=parseFloat(r);if(!c||!i)return{calorias:0,proteinas:0,carbohidratos:0,grasas:0};const l=c/i,p=v=>Math.round(parseFloat(v??0)*l*10)/10;return{calorias:p(e.calorias),proteinas:p(e.proteinas),carbohidratos:p(e.carbohidratos),grasas:p(e.grasas)}}const _a=()=>a.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.2",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:[a.jsx("circle",{cx:"11",cy:"11",r:"8"}),a.jsx("line",{x1:"21",y1:"21",x2:"16.65",y2:"16.65"})]}),Na=()=>a.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.8",strokeLinecap:"round","aria-hidden":"true",children:[a.jsx("line",{x1:"18",y1:"6",x2:"6",y2:"18"}),a.jsx("line",{x1:"6",y1:"6",x2:"18",y2:"18"})]}),Ca=()=>a.jsx("svg",{width:"13",height:"13",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:a.jsx("polyline",{points:"20 6 9 17 4 12"})});function za({comida:e,onAgregar:r,placeholder:i="Buscar alimento o producto…",autoFocus:c=!1}){const[l,p]=o.useState(""),[v,k]=o.useState([]),[f,h]=o.useState(!1),[g,u]=o.useState(!1),[b,j]=o.useState(null),[_,P]=o.useState("100"),[I,M]=o.useState(!1),[q,G]=o.useState(!1),T=o.useRef(null),x=o.useRef(null),C=o.useRef(null);o.useEffect(()=>{const n="bp-styles-v2";if(document.getElementById(n))return;const m=document.createElement("style");m.id=n,m.textContent=ja,document.head.appendChild(m)},[]),o.useEffect(()=>{function n(m){x.current&&!x.current.contains(m.target)&&(u(!1),j(null),M(!1))}return document.addEventListener("mousedown",n),document.addEventListener("touchstart",n,{passive:!0}),()=>{document.removeEventListener("mousedown",n),document.removeEventListener("touchstart",n)}},[]);const O=o.useCallback(async n=>{const m=n.trim().toLowerCase();if(m.length<2){k([]),u(!1),h(!1);return}try{const L=(await $.productos.filter(E=>(E.nombre??"").toLowerCase().includes(m)).limit(25).toArray()).map(E=>({...E,_fuente:"productos"}));k(L),u(L.length>0)}catch(z){console.error("[BuscadorProductos] Error en búsqueda:",z),k([])}finally{h(!1)}},[]);function W(n){const m=n.target.value;if(p(m),j(null),clearTimeout(C.current),!m.trim()||m.trim().length<2){k([]),u(!1),h(!1);return}h(!0),C.current=setTimeout(()=>O(m),280)}function D(){var n;p(""),k([]),u(!1),j(null),h(!1),clearTimeout(C.current),(n=T.current)==null||n.focus()}function R(){M(!0),v.length>0&&u(!0)}function A(n){j(n),P(String(n.porcion??100))}function S(n){P(m=>{const z=Math.max(1,(parseFloat(m)||0)+n);return String(Math.round(z*10)/10)})}async function w(){var n;if(!(!b||!_||parseFloat(_)<=0)){G(!0);try{const m=oa(b,_);await(r==null?void 0:r({productoId:b.id??b.nombre,nombre:b.nombre,cantidad:parseFloat(_),unidad:b.unidad??"g",...m})),p(""),k([]),u(!1),j(null),P("100"),(n=T.current)==null||n.focus()}catch(m){console.error("[BuscadorProductos] Error al insertar:",m)}finally{G(!1)}}}const Y=b?oa(b,_):null,K=(b==null?void 0:b.unidad)??"g",F=e?e.charAt(0).toUpperCase()+e.slice(1):"la comida";return a.jsxs("div",{className:"bp",ref:x,children:[a.jsxs("div",{className:`bp-field${I||g?" bp-field--focus":""}`,onClick:()=>{var n;return(n=T.current)==null?void 0:n.focus()},children:[a.jsx("span",{className:"bp-icon",children:a.jsx(_a,{})}),a.jsx("input",{ref:T,className:"bp-input",type:"search",inputMode:"search",value:l,onChange:W,onFocus:R,onBlur:()=>M(!1),placeholder:i,autoFocus:c,autoComplete:"off",autoCorrect:"off",spellCheck:"false","aria-label":"Buscar alimento","aria-expanded":g,"aria-haspopup":"listbox","aria-autocomplete":"list"}),f&&a.jsx("div",{className:"bp-spinner","aria-hidden":"true"}),l&&!f&&a.jsx("button",{className:"bp-clear",onClick:D,"aria-label":"Limpiar búsqueda",type:"button",children:a.jsx(Na,{})})]}),g&&a.jsxs("div",{className:"bp-panel",role:"listbox","aria-label":`Resultados para ${F}`,children:[b&&a.jsxs("div",{className:"bp-sel-row",role:"form","aria-label":"Configurar cantidad a insertar",children:[a.jsxs("div",{className:"bp-sel-row__name",children:[ta(b.categoria??"")," ",b.nombre]}),a.jsxs("div",{className:"bp-qty-wrap",children:[a.jsx("button",{className:"bp-qty-btn",type:"button",onClick:()=>S(-10),"aria-label":"Reducir 10",children:"−"}),a.jsx("input",{className:"bp-qty-input",type:"number",min:"1",step:"1",value:_,onChange:n=>P(n.target.value),onKeyDown:n=>n.key==="Enter"&&w(),"aria-label":"Cantidad"}),a.jsx("button",{className:"bp-qty-btn",type:"button",onClick:()=>S(10),"aria-label":"Aumentar 10",children:"+"}),a.jsx("span",{className:"bp-qty-unit",children:K})]}),Y&&a.jsxs("span",{className:"bp-sel-row__preview","aria-live":"polite",children:[Y.calorias," kcal"]}),a.jsxs("button",{className:"bp-add-btn",type:"button",onClick:w,disabled:!_||parseFloat(_)<=0||q,"aria-label":`Insertar ${b.nombre} en ${F}`,children:[a.jsx(Ca,{}),q?"Insertando…":"Insertar"]})]}),v.length>0?a.jsxs(a.Fragment,{children:[a.jsxs("div",{className:"bp-section-hdr",children:[a.jsx("span",{children:e?`${F} · Alimentos`:"Alimentos"}),a.jsx("span",{className:"bp-section-hdr__count",children:v.length})]}),a.jsx("ul",{className:"bp-list",role:"presentation",children:v.map((n,m)=>{const z=(b==null?void 0:b.nombre)===n.nombre,L=n.categoria??"";return a.jsxs("li",{className:`bp-item${z?" bp-item--active":""}`,role:"option","aria-selected":z,tabIndex:0,onClick:()=>A(n),onKeyDown:E=>{(E.key==="Enter"||E.key===" ")&&(E.preventDefault(),A(n))},children:[a.jsx("div",{className:"bp-item__ico","aria-hidden":"true",children:ta(L)}),a.jsxs("div",{className:"bp-item__info",children:[a.jsx("div",{className:"bp-item__name",children:n.nombre}),a.jsxs("div",{className:"bp-item__pills",children:[L&&a.jsx("span",{className:"bp-pill bp-pill--cat",children:L}),n.proteinas!=null&&a.jsxs("span",{className:"bp-pill",children:["P ",n.proteinas,"g"]}),n.carbohidratos!=null&&a.jsxs("span",{className:"bp-pill",children:["C ",n.carbohidratos,"g"]}),n.grasas!=null&&a.jsxs("span",{className:"bp-pill",children:["G ",n.grasas,"g"]})]})]}),a.jsx("div",{className:"bp-item__kcal",children:n.calorias!=null?a.jsxs(a.Fragment,{children:[a.jsx("span",{className:"bp-item__kcal-val",children:n.calorias}),a.jsxs("span",{className:"bp-item__kcal-ref",children:["kcal/",n.porcion??100,n.unidad??"g"]})]}):a.jsx("span",{className:"bp-item__kcal-ref",children:"sin datos"})})]},n.id??m)})})]}):!f&&l.trim().length>=2&&a.jsxs("div",{className:"bp-empty",role:"status",children:[a.jsx("span",{className:"bp-empty__ico","aria-hidden":"true",children:"🔍"}),a.jsxs("p",{className:"bp-empty__title",children:['Sin resultados para "',l,'"']}),a.jsx("p",{className:"bp-empty__sub",children:"Verificá la ortografía o agregá el alimento al catálogo"})]})]})]})}const Q=[{id:"desayuno",label:"Desayuno",emoji:"☀️",color:"#FF8F00",placeholder:`Describí los alimentos del desayuno…
Ej: • Avena con banana (50g)
    • Leche descremada (200ml)`,esMeal:!0},{id:"almuerzo",label:"Almuerzo",emoji:"🍽️",color:"#2E7D32",placeholder:`Describí los alimentos del almuerzo…
Ej: • Pechuga de pollo (150g)
    • Arroz integral (100g)
    • Ensalada mixta`,esMeal:!0},{id:"merienda",label:"Merienda",emoji:"☕",color:"#7B1FA2",placeholder:`Describí los alimentos de la merienda…
Ej: • Yogur griego (150g)
    • Frutos secos (30g)`,esMeal:!0},{id:"cena",label:"Cena",emoji:"🌙",color:"#1565C0",placeholder:`Describí los alimentos de la cena…
Ej: • Salmón al horno (180g)
    • Vegetales salteados (200g)`,esMeal:!0},{id:"indicaciones",label:"Indicaciones",emoji:"📋",color:"#00695C",placeholder:`Consejos nutricionales, indicaciones generales…
Ej: • Beber mínimo 2 litros de agua por día
    • Evitar azúcares refinados
    • Masticar despacio cada comida`,esMeal:!1}],ca=Q.length,na=()=>new Date().toISOString().slice(0,10),J=()=>({desayuno:"",almuerzo:"",merienda:"",cena:"",indicaciones:""});function Sa(e){return e?new Date(e+"T12:00:00").toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"}):""}function sa(e,r){const i=new Date(e+"T12:00:00");return i.setDate(i.getDate()+r),i.toISOString().slice(0,10)}function H(e){return!Array.isArray(e)||!e.length?"":e.map(r=>`• ${r.nombre}${r.cantidad?` (${r.cantidad}${r.unidad??"g"})`:""}${r.calorias?` — ${r.calorias} kcal`:""}`).join(`
`)}function Ea(e){var r,i,c,l;return e?{desayuno:e.desayuno??H((r=e.comidas)==null?void 0:r.desayuno),almuerzo:e.almuerzo??H((i=e.comidas)==null?void 0:i.almuerzo),merienda:e.merienda??H((c=e.comidas)==null?void 0:c.merienda),cena:e.cena??H((l=e.comidas)==null?void 0:l.cena),indicaciones:e.indicaciones??""}:J()}function U(e,r,i){const c=o.useMemo(()=>wa(e),r),l=o.useRef(i);return o.useSyncExternalStore(p=>{const v=c.subscribe({next:k=>{l.current=k,p()},error:()=>p()});return()=>v.unsubscribe()},()=>l.current,()=>i)}const $a=`

/* ══ Raíz ════════════════════════════════════════════════════════════════ */
.pa {
  display: flex;
  flex-direction: column;
  padding-bottom: calc(var(--nav-h) + var(--space-8));
  animation: fade-in var(--transition-normal) both;
  max-width: 700px;
  margin-inline: auto;
}

/* ══ Header — paciente + fecha ═══════════════════════════════════════════ */
.pa-hdr {
  padding: var(--space-4) var(--space-4) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.pa-patient-bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.pa-patient-avatar {
  width: 46px;
  height: 46px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--color-primary-dark), var(--color-primary-light));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 4px 14px rgba(46,125,50,.30);
  letter-spacing: -.01em;
  user-select: none;
}
.pa-patient-info  { flex: 1; min-width: 0; }
.pa-patient-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--color-primary);
}
.pa-patient-name {
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--color-text-high);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -.01em;
}

/* ── Navegador de fecha ─────────────────────────────────────────────────── */
.pa-date-nav {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--space-3) var(--space-4);
  box-shadow:
    0 2px 4px  rgba(0,0,0,.04),
    0 6px 14px rgba(0,0,0,.06);
}
.pa-date-btn {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--color-border);
  background: transparent;
  color: var(--color-text-mid);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background   var(--transition-fast),
    color        var(--transition-fast),
    transform    200ms cubic-bezier(.34,1.56,.64,1);
  -webkit-tap-highlight-color: transparent;
}
.pa-date-btn:hover  {
  background: var(--color-primary-surface);
  color: var(--color-primary);
  transform: scale(1.08);
}
.pa-date-btn:active { transform: scale(.92); }
.pa-date-info  { flex: 1; text-align: center; }
.pa-date-dow   {
  font-size: 9px;
  font-weight: 800;
  text-transform: capitalize;
  letter-spacing: .09em;
  color: var(--color-primary);
}
.pa-date-full  {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-high);
  text-transform: capitalize;
}
.pa-date-today {
  display: inline-block;
  margin-top: 2px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: #fff;
  background: var(--color-primary);
  padding: 1px 8px;
  border-radius: var(--radius-full);
}

/* ══ Barra de herramientas (plantillas) ══════════════════════════════════ */
.pa-toolbar {
  margin: var(--space-3) var(--space-4) 0;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-divider);
  position: relative;
  overflow: hidden;
}

/* Acento decorativo */
.pa-toolbar::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg,
    var(--color-primary-dark),
    var(--color-primary-light),
    var(--color-accent-light),
    transparent 100%);
}

/* Select de plantillas */
.pa-tpl-select-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.pa-tpl-icon {
  font-size: 1rem;
  flex-shrink: 0;
}
.pa-tpl-select {
  flex: 1;
  min-width: 0;
  padding: var(--space-2) var(--space-3);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text-high);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239E9E9E' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 30px;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  text-overflow: ellipsis;
}
.pa-tpl-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(46,125,50,.14);
}
.pa-tpl-select:disabled {
  opacity: .55;
  cursor: not-allowed;
}

/* Botón guardar como plantilla */
.pa-btn-tpl {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-full);
  border: 1.5px solid var(--color-accent);
  background: transparent;
  color: var(--color-accent);
  font-size: var(--text-sm);
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition:
    background var(--transition-fast),
    color      var(--transition-fast),
    transform  200ms cubic-bezier(.34,1.56,.64,1);
  -webkit-tap-highlight-color: transparent;
}
.pa-btn-tpl:hover {
  background: var(--color-accent-surface);
  transform: scale(1.03) translateY(-1px);
}
.pa-btn-tpl:active { transform: scale(.97); }

/* Campo inline para nombre de plantilla */
.pa-tpl-save-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: 1;
  animation: fade-in 160ms both;
}
.pa-tpl-name-input {
  flex: 1;
  min-width: 0;
  padding: var(--space-2) var(--space-3);
  border: 1.5px solid var(--color-primary);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text-high);
  font-size: var(--text-sm);
  font-weight: 500;
  box-shadow: 0 0 0 3px rgba(46,125,50,.12);
  outline: none;
  transition: box-shadow var(--transition-fast);
}
.pa-tpl-name-input:focus {
  box-shadow: 0 0 0 4px rgba(46,125,50,.18);
}
.pa-tpl-name-input::placeholder { color: var(--color-text-disabled); }

.pa-tpl-confirm-btn {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-full);
  border: none;
  background: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  font-size: 1rem;
  font-weight: 700;
  transition:
    background var(--transition-fast),
    transform  200ms cubic-bezier(.34,1.56,.64,1),
    opacity    var(--transition-fast);
}
.pa-tpl-confirm-btn:hover:not(:disabled) {
  background: var(--color-primary-dark);
  transform: scale(1.08);
}
.pa-tpl-confirm-btn:disabled { opacity: .40; cursor: not-allowed; }

.pa-tpl-cancel-btn {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--color-border);
  background: transparent;
  color: var(--color-text-mid);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  font-size: 1.1rem;
  font-weight: 700;
  transition:
    background    var(--transition-fast),
    border-color  var(--transition-fast),
    color         var(--transition-fast),
    transform     200ms cubic-bezier(.34,1.56,.64,1);
}
.pa-tpl-cancel-btn:hover {
  background: var(--color-error-surface);
  border-color: var(--color-error);
  color: var(--color-error);
  transform: rotate(90deg);
}

/* Notificación plantilla guardada */
.pa-tpl-saved {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-success);
  animation: fade-in 200ms both;
  flex-shrink: 0;
}

/* ══ BARRA DE TABS 3D ═══════════════════════════════════════════════════ */

.pa-tabs-wrap {
  padding: var(--space-3) var(--space-4) 0;
}

/*
 * Contenedor "hundido" — inset-shadow crea la ilusión de profundidad
 * en la que las pestañas están recortadas dentro de una cavidad.
 */
.pa-tabs {
  position: relative;
  display: flex;
  background: var(--color-surface-raised);
  border-radius: var(--radius-xl);
  padding: 3px;
  box-shadow:
    inset 0 2px 6px rgba(0,0,0,.09),
    inset 0 1px 2px rgba(0,0,0,.06);
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.pa-tabs::-webkit-scrollbar { display: none; }

/*
 * PILL INDICADOR — se eleva sobre el track mediante box-shadow.
 * width = 100% / N_TABS (5 tabs)
 * translate3d garantiza la aceleración de hardware y la misma capa GPU que el slide-track.
 */
.pa-tab-pill {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 3px;
  width: calc((100% - 6px) / ${ca});
  border-radius: calc(var(--radius-xl) - 3px);
  background: var(--color-surface);
  box-shadow:
    0 3px  9px rgba(0,0,0,.13),
    0 1px  3px rgba(0,0,0,.09),
    inset 0 1px 0 rgba(255,255,255,.80);
  transition: transform 400ms cubic-bezier(.4, 0, .2, 1);
  will-change: transform;
  pointer-events: none;
  z-index: 0;
}
.dark .pa-tab-pill {
  background: var(--color-surface-raised);
  box-shadow:
    0 3px  9px rgba(0,0,0,.38),
    0 1px  3px rgba(0,0,0,.28),
    inset 0 1px 0 rgba(255,255,255,.06);
}

/* Botones de pestaña */
.pa-tab {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: var(--space-2) var(--space-1);
  border-radius: calc(var(--radius-xl) - 3px);
  border: none;
  background: transparent;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: opacity var(--transition-fast);
  white-space: nowrap;
  user-select: none;
}
.pa-tab:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}
.pa-tab__emoji {
  font-size: .95rem;
  line-height: 1;
  display: block;
  transition: transform 280ms cubic-bezier(.34,1.56,.64,1);
}
.pa-tab--active .pa-tab__emoji { transform: scale(1.18); }

.pa-tab__label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .01em;
  color: var(--color-text-low);
  transition: color var(--transition-fast);
  line-height: 1;
}
.pa-tab--active .pa-tab__label {
  font-weight: 800;
  color: var(--color-text-high);
}

/* ══ VIEWPORT + TRACK DE SLIDES ════════════════════════════════════════ */

/*
 * El viewport recorta el track y aporta perspectiva para la ilusión 3D
 * durante el desplazamiento.
 */
.pa-viewport {
  overflow: hidden;
  width: 100%;
  perspective: 1200px;
  perspective-origin: 50% 0;
}

/*
 * TRACK — el contenedor de los N slides en fila.
 *
 * GPU budget:
 *   will-change:transform          → browser crea una compositor layer propia
 *   backface-visibility:hidden     → evita flickering en Safari/iOS
 *   translate3d(x,0,0)             → fuerza hardware acceleration real
 *
 * Fórmula: translate3d(calc(-i × 100%), 0, 0)
 *   · i=0 → 0%   (primer slide alineado al borde izquierdo del viewport)
 *   · i=1 → -100% (segundo slide desplazado hacia la derecha, oculto)
 *   · i=N → -N×100%
 */
.pa-track {
  display: flex;
  width: 100%;
  will-change: transform;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transition: transform 400ms cubic-bezier(.4, 0, .2, 1);
}

/* Cada slide = 100% del ancho del viewport */
.pa-slide {
  width: 100%;
  flex-shrink: 0;
  padding: var(--space-4) var(--space-4) var(--space-5);
}

/* ── Cabecera del slide ──────────────────────────────────────────────────── */
.pa-slide-hdr {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}
.pa-slide-emoji { font-size: 1.35rem; line-height: 1; }
.pa-slide-title {
  font-size: var(--text-lg);
  font-weight: 800;
  color: var(--color-text-high);
  letter-spacing: -.02em;
  flex: 1;
}

/* ── Contenedor de slide (card elevada) ─────────────────────────────────── */
.pa-slide-card {
  position: relative;
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--space-4);
  box-shadow:
    var(--shadow-md),
    0 0 0 1px rgba(0,0,0,.03);
  border: 1px solid var(--color-divider);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  overflow: visible;
}

/* Acento cromático por tab en el borde superior */
.pa-slide-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  background: var(--_tab-color, var(--color-primary));
}

/* ── Textarea de la comida ───────────────────────────────────────────────── */
.pa-slide-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--color-text-mid);
  user-select: none;
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.pa-slide-textarea {
  width: 100%;
  min-height: 160px;
  resize: vertical;
  padding: var(--space-3) var(--space-4);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg);
  color: var(--color-text-high);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  line-height: 1.75;
  -webkit-appearance: none;
  appearance: none;
  transition:
    border-color var(--transition-fast),
    box-shadow   var(--transition-fast),
    background   var(--transition-fast);
}
.pa-slide-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(46,125,50,.14);
  background: var(--color-surface);
}
.pa-slide-textarea::placeholder {
  color: var(--color-text-disabled);
  font-style: italic;
  line-height: 1.65;
}

/* Animación de flash al cargar desde plantilla */
@keyframes pa-campo-flash {
  0%   { background: rgba(76,175,80,.12); border-color: var(--color-primary-light); }
  60%  { background: rgba(76,175,80,.06); border-color: var(--color-primary-light); }
  100% { background: var(--color-bg);     border-color: var(--color-border); }
}
.pa-slide-textarea--flashed {
  animation: pa-campo-flash 900ms ease both;
}

/* ── Separador entre buscador y textarea ───────────────────────────────── */
.pa-bp-divider {
  height: 1px;
  background: var(--color-divider);
  margin: 0;
}
.pa-bp-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--color-text-low);
  user-select: none;
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

/* ══ Footer — guardar plan ═══════════════════════════════════════════════ */
.pa-footer {
  margin: var(--space-3) var(--space-4) 0;
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.pa-btn-save {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-7);
  background: linear-gradient(135deg,
    var(--color-primary-dark) 0%,
    var(--color-primary)      50%,
    var(--color-primary-light) 100%);
  background-size: 200% 100%;
  background-position: 0% center;
  color: #fff;
  border-radius: var(--radius-lg);
  font-size: var(--text-base);
  font-weight: 700;
  letter-spacing: -.01em;
  box-shadow:
    0 4px 16px rgba(46,125,50,.38),
    0 2px  6px rgba(0,0,0,.12);
  transition:
    background-position 350ms ease,
    transform           var(--transition-fast),
    box-shadow          var(--transition-fast),
    opacity             var(--transition-fast);
  -webkit-tap-highlight-color: transparent;
}
.pa-btn-save:hover:not(:disabled) {
  background-position: 100% center;
  transform: translateY(-2px);
  box-shadow:
    0 8px 28px rgba(46,125,50,.48),
    0 4px 12px rgba(0,0,0,.15);
}
.pa-btn-save:active:not(:disabled) {
  transform: translateY(0) scale(.99);
}
.pa-btn-save:disabled {
  opacity: .55;
  cursor: not-allowed;
  transform: none !important;
}

.pa-saved-notice {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-success);
  animation: fade-in 200ms both;
}

/* ══ Loading state ════════════════════════════════════════════════════════ */
.pa-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-12);
  gap: var(--space-2);
}
.pa-loading-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary-light);
  animation: pa-bounce 1.2s ease-in-out infinite;
}
.pa-loading-dot:nth-child(2) { animation-delay: .2s; }
.pa-loading-dot:nth-child(3) { animation-delay: .4s; }
@keyframes pa-bounce {
  0%, 80%, 100% { transform: scale(.75); opacity: .4; }
  40%           { transform: scale(1);   opacity: 1;  }
}

/* ══ Widget de costo estimado (fondo amarillo pastel) ════════════════════ */

.pa-costo {
  background: var(--color-amarillo);
  border: 1px solid var(--color-amarillo-deep, #E8C870);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: box-shadow var(--transition-fast);
  animation: fade-in 200ms both;
}
.pa-costo__summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.pa-costo__label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-durazno-dark, #C87040);
  letter-spacing: 0.02em;
  text-align: left;
}
.pa-costo__valor {
  font-size: var(--text-sm);
  font-weight: 800;
  color: var(--color-durazno-dark, #C87040);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  white-space: nowrap;
}
.pa-costo__ico {
  color: var(--texto-muy-suave, #B0B0B0);
  flex-shrink: 0;
  transition: transform 250ms cubic-bezier(.34,1.56,.64,1);
}
.pa-costo--open .pa-costo__ico { transform: rotate(180deg); }

.pa-costo__desglose {
  border-top: 1px solid var(--color-amarillo-deep, #E8C870);
  padding: var(--space-2) var(--space-3) var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  animation: fade-in 140ms both;
}
.pa-costo__seccion-titulo {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--texto-suave, #7A7A7A);
  margin-bottom: 2px;
}
.pa-costo__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-xs);
}
.pa-costo__item-nombre {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--texto-suave, #7A7A7A);
}
.pa-costo__item-tag {
  font-size: 0.62rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  white-space: nowrap;
  flex-shrink: 0;
}
.pa-costo__item-tag--almacen { background: #E3ECF8; color: #3A60B0; }
.pa-costo__item-tag--fresco  { background: var(--color-verde, #E2F0D9); color: var(--color-verde-dark, #568A48); }
.pa-costo__item-precio {
  font-weight: 700;
  color: var(--texto-principal, #4A4A4A);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  font-size: var(--text-xs);
}
.pa-costo__subtotal {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: var(--space-1);
  border-top: 1px dashed var(--color-amarillo-deep, #E8C870);
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--color-durazno-dark, #C87040);
}
.pa-costo__leyenda {
  font-size: 0.62rem;
  color: var(--texto-muy-suave, #B0B0B0);
  font-style: italic;
  text-align: right;
  margin-top: var(--space-1);
}

/* ══ Sin paciente ════════════════════════════════════════════════════════ */
.pa-no-patient {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-16) var(--space-6);
  text-align: center;
  gap: var(--space-3);
  color: var(--color-text-low);
}
.pa-no-patient__ico  { font-size: 3.5rem; }
.pa-no-patient__text { font-size: var(--text-sm); font-weight: 500; max-width: 300px; line-height: 1.6; }
`;function Aa(){if(typeof document>"u"||document.getElementById("pa-styles-v2"))return;const e=document.createElement("style");e.id="pa-styles-v2",e.textContent=$a,document.head.appendChild(e)}const La=()=>a.jsx("svg",{width:"13",height:"13",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.8",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:a.jsx("polyline",{points:"15 18 9 12 15 6"})}),Ba=()=>a.jsx("svg",{width:"13",height:"13",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.8",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:a.jsx("polyline",{points:"9 18 15 12 9 6"})}),Pa=()=>a.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.2",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:[a.jsx("path",{d:"M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"}),a.jsx("polyline",{points:"17 21 17 13 7 13 7 21"}),a.jsx("polyline",{points:"7 3 7 8 15 8"})]}),X=()=>a.jsx("svg",{width:"13",height:"13",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:a.jsx("polyline",{points:"20 6 9 17 4 12"})}),ia=()=>a.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",style:{animation:"spin 0.9s linear infinite"},"aria-hidden":"true",children:a.jsx("path",{d:"M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"})}),Ta=()=>a.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.8",strokeLinecap:"round","aria-hidden":"true",children:[a.jsx("line",{x1:"18",y1:"6",x2:"6",y2:"18"}),a.jsx("line",{x1:"6",y1:"6",x2:"18",y2:"18"})]}),Da=()=>a.jsx("svg",{width:"13",height:"13",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.2",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:a.jsx("polygon",{points:"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"})}),Fa=()=>a.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:a.jsx("polyline",{points:"6 9 12 15 18 9"})});function Ia(e="",r=""){return((e[0]??"")+(r[0]??"")).toUpperCase()||"🥗"}function Ma({pacienteId:e}){o.useEffect(()=>{Aa()},[]);const[r,i]=o.useState(na),[c,l]=o.useState(0),[p,v]=o.useState(!1),[k,f]=o.useState(!1),[h,g]=o.useState(!1),[u,b]=o.useState(""),[j,_]=o.useState(!1),[P,I]=o.useState(!1),[M,q]=o.useState(""),[G,T]=o.useState(0),[x,C]=o.useState(J),O=o.useRef({}),W=o.useRef(null),D=o.useRef(null),R=o.useRef(null),A=o.useRef(""),S=U(()=>$.plantillas.toArray(),[],[]),w=U(()=>e?$.pacientes.get(e):Promise.resolve(null),[e],null),Y=U(()=>$.productos.toArray(),[],[]),[K,F]=o.useState(!1);o.useEffect(()=>{if(!e)return;let t=!1;const s=`${e}|${r}`;if(A.current!==s)return F(!0),C(J()),$.planes.where("[pacienteId+fecha]").equals([e,r]).first().then(d=>{t||(A.current=s,C(Ea(d)))}).catch(d=>console.error("[PlanAlimentario] Error cargando plan:",d)).finally(()=>{t||F(!1)}),()=>{t=!0}},[e,r]),o.useEffect(()=>{A.current=""},[e,r]);const n=o.useCallback((t,s)=>{C(d=>({...d,[t]:s})),f(!1)},[]),m=o.useCallback((t,s)=>{const d=[`• ${t.nombre}`,`(${t.cantidad}${t.unidad??"g"})`];if(t.calorias&&d.push(`— ${t.calorias} kcal`),t.proteinas||t.carbohidratos||t.grasas){const N=[];t.proteinas!=null&&N.push(`P:${t.proteinas}g`),t.carbohidratos!=null&&N.push(`C:${t.carbohidratos}g`),t.grasas!=null&&N.push(`G:${t.grasas}g`),d.push(`[${N.join(" ")}]`)}const y=d.join(" ")+`
`,B=O.current[s];if(B){const N=B.selectionStart??B.value.length,xa=B.selectionEnd??B.value.length,aa=x[s]??"",ga=aa.substring(0,N)+y+aa.substring(xa);C(va=>({...va,[s]:ga})),f(!1),requestAnimationFrame(()=>{B.focus(),B.setSelectionRange(N+y.length,N+y.length)})}else C(N=>({...N,[s]:(N[s]??"")+y})),f(!1)},[x]),z=o.useCallback(async()=>{if(!(!u.trim()||j)){_(!0);try{const t=ea();await $.plantillas.add({id:t,nombre_plantilla:u.trim(),desayuno:x.desayuno??"",almuerzo:x.almuerzo??"",merienda:x.merienda??"",cena:x.cena??"",indicaciones:x.indicaciones??"",creadoEn:new Date().toISOString()}),b(""),g(!1),I(!0),setTimeout(()=>I(!1),2800)}catch(t){console.error("[PlanAlimentario] Error guardando plantilla:",t)}finally{_(!1)}}},[u,j,x]),L=o.useCallback(t=>{const s=t.target.value;if(q(s),!s)return;const d=S.find(y=>y.id===s);d&&(C({desayuno:d.desayuno??"",almuerzo:d.almuerzo??"",merienda:d.merienda??"",cena:d.cena??"",indicaciones:d.indicaciones??""}),f(!1),T(y=>y+1))},[S]),E=o.useCallback(async()=>{if(!(!e||p)){v(!0),f(!1);try{const t=await $.planes.where("[pacienteId+fecha]").equals([e,r]).first(),s={pacienteId:e,fecha:r,desayuno:x.desayuno??"",almuerzo:x.almuerzo??"",merienda:x.merienda??"",cena:x.cena??"",indicaciones:x.indicaciones??"",sincronizado:0,actualizadoEn:new Date().toISOString()};if(t)await $.planes.update(t.id,s),await ra("planes","UPDATE",{id:t.id,...s}),A.current=`${e}|${r}`;else{const y={id:ea(),creadoEn:new Date().toISOString(),...s};await $.planes.add(y),await ra("planes","CREATE",y),A.current=`${e}|${r}`}f(!0),setTimeout(()=>f(!1),3e3)}catch(t){console.error("[PlanAlimentario] Error al guardar plan:",t)}finally{v(!1)}}},[e,r,x,p]),da=o.useCallback(()=>i(t=>sa(t,-1)),[]),pa=o.useCallback(()=>i(t=>sa(t,1)),[]);function ua(t){D.current=t.touches[0].clientX,R.current=t.touches[0].clientY}function ba(t){if(D.current===null)return;const s=t.changedTouches[0].clientX-D.current,d=Math.abs(t.changedTouches[0].clientY-R.current);Math.abs(s)>d&&Math.abs(s)>50&&(s<0&&c<ca-1&&l(y=>y+1),s>0&&c>0&&l(y=>y-1)),D.current=null,R.current=null}if(o.useEffect(()=>{h&&requestAnimationFrame(()=>{var t;return(t=W.current)==null?void 0:t.focus()})},[h]),!e)return a.jsx("section",{className:"pa",children:a.jsxs("div",{className:"pa-no-patient",children:[a.jsx("span",{className:"pa-no-patient__ico","aria-hidden":"true",children:"🥗"}),a.jsx("p",{className:"pa-no-patient__text",children:"Seleccioná un paciente para ver y editar su plan alimentario"})]})});const V=[w==null?void 0:w.nombre,w==null?void 0:w.apellido].filter(Boolean).join(" ")||"Paciente",Z=Sa(r),[ma,...ha]=Z.split(" "),fa=r===na();return a.jsxs("section",{className:"pa","aria-label":`Plan alimentario — ${V}`,children:[a.jsxs("div",{className:"pa-hdr",children:[a.jsxs("div",{className:"pa-patient-bar",children:[a.jsx("div",{className:"pa-patient-avatar","aria-hidden":"true",children:Ia(w==null?void 0:w.nombre,w==null?void 0:w.apellido)}),a.jsxs("div",{className:"pa-patient-info",children:[a.jsx("div",{className:"pa-patient-label",children:"Plan Alimentario"}),a.jsx("div",{className:"pa-patient-name",children:V})]})]}),a.jsxs("nav",{className:"pa-date-nav","aria-label":"Navegar por fecha",children:[a.jsx("button",{className:"pa-date-btn",onClick:da,"aria-label":"Día anterior",type:"button",children:a.jsx(La,{})}),a.jsxs("div",{className:"pa-date-info",children:[a.jsx("div",{className:"pa-date-dow",children:ma}),a.jsx("div",{className:"pa-date-full",children:ha.join(" ")}),fa&&a.jsx("span",{className:"pa-date-today",role:"status",children:"Hoy"})]}),a.jsx("button",{className:"pa-date-btn",onClick:pa,"aria-label":"Día siguiente",type:"button",children:a.jsx(Ba,{})})]})]}),a.jsxs("div",{className:"pa-toolbar",role:"toolbar","aria-label":"Herramientas de plantilla",children:[a.jsxs("div",{className:"pa-tpl-select-wrap",children:[a.jsx("span",{className:"pa-tpl-icon","aria-hidden":"true",children:"📂"}),a.jsxs("select",{className:"pa-tpl-select",value:M,onChange:L,disabled:!S.length,"aria-label":"Cargar desde plantilla guardada",children:[a.jsx("option",{value:"",children:S.length?`Cargar desde plantilla… (${S.length})`:"Sin plantillas guardadas"}),S.map(t=>a.jsx("option",{value:t.id,children:t.nombre_plantilla},t.id))]})]}),h?a.jsxs("div",{className:"pa-tpl-save-row",role:"group","aria-label":"Nombre de la nueva plantilla",children:[a.jsx("input",{ref:W,className:"pa-tpl-name-input",type:"text",value:u,onChange:t=>b(t.target.value),placeholder:"Nombre: ej. Plan Keto Inicial…",maxLength:60,"aria-label":"Nombre de la plantilla",onKeyDown:t=>{t.key==="Enter"&&z(),t.key==="Escape"&&(g(!1),b(""))}}),a.jsx("button",{className:"pa-tpl-confirm-btn",type:"button",onClick:z,disabled:!u.trim()||j,"aria-label":j?"Guardando…":"Confirmar nombre y guardar plantilla",title:"Guardar plantilla",children:j?a.jsx(ia,{}):a.jsx(X,{})}),a.jsx("button",{className:"pa-tpl-cancel-btn",type:"button",onClick:()=>{g(!1),b("")},"aria-label":"Cancelar",title:"Cancelar",children:a.jsx(Ta,{})})]}):a.jsxs("button",{className:"pa-btn-tpl",onClick:()=>{g(!0),I(!1)},type:"button","aria-label":"Guardar plan actual como plantilla reutilizable",children:[a.jsx(Da,{}),a.jsx("span",{children:"Guardar como Plantilla"})]}),P&&a.jsxs("span",{className:"pa-tpl-saved",role:"status",children:[a.jsx(X,{}),"¡Plantilla guardada!"]})]}),a.jsx("div",{className:"pa-tabs-wrap",children:a.jsxs("div",{className:"pa-tabs",role:"tablist","aria-label":"Secciones del plan alimentario",children:[a.jsx("div",{className:"pa-tab-pill","aria-hidden":"true",style:{transform:`translate3d(calc(${c*100}%), 0, 0)`}}),Q.map((t,s)=>a.jsxs("button",{className:`pa-tab${c===s?" pa-tab--active":""}`,role:"tab","aria-selected":c===s,"aria-controls":`pa-slide-${t.id}`,id:`pa-tab-${t.id}`,onClick:()=>l(s),type:"button",children:[a.jsx("span",{className:"pa-tab__emoji","aria-hidden":"true",children:t.emoji}),a.jsx("span",{className:"pa-tab__label",children:t.label})]},t.id))]})}),K?a.jsxs("div",{className:"pa-loading",role:"status","aria-live":"polite","aria-label":"Cargando plan…",children:[a.jsx("div",{className:"pa-loading-dot"}),a.jsx("div",{className:"pa-loading-dot"}),a.jsx("div",{className:"pa-loading-dot"})]}):a.jsx("div",{className:"pa-viewport",onTouchStart:ua,onTouchEnd:ba,children:a.jsx("div",{className:"pa-track",style:{transform:`translate3d(calc(-${c*100}%), 0, 0)`},children:Q.map((t,s)=>a.jsx(Ra,{tab:t,isActive:c===s,value:x[t.id]??"",flashKey:G,textareaRef:d=>{O.current[t.id]=d},onChange:d=>n(t.id,d),onInsert:d=>m(d,t.id),productos:Y},t.id))})}),a.jsxs("footer",{className:"pa-footer",children:[a.jsx("button",{className:"pa-btn-save",onClick:E,disabled:p,type:"button","aria-label":`Guardar plan alimentario de ${V} del ${Z}`,children:p?a.jsxs(a.Fragment,{children:[a.jsx(ia,{}),a.jsx("span",{children:"Guardando…"})]}):a.jsxs(a.Fragment,{children:[a.jsx(Pa,{}),a.jsx("span",{children:"Guardar Plan"})]})}),k&&a.jsxs("span",{className:"pa-saved-notice",role:"status",children:[a.jsx(X,{}),"Guardado localmente · en cola de sync"]})]})]})}function Ra({tab:e,isActive:r,value:i,flashKey:c,textareaRef:l,onChange:p,onInsert:v,productos:k}){const[f,h]=o.useState(!1),g=o.useRef(c);return o.useEffect(()=>{if(c!==g.current){g.current=c,h(!0);const u=setTimeout(()=>h(!1),950);return()=>clearTimeout(u)}},[c]),a.jsxs("article",{className:"pa-slide",role:"tabpanel",id:`pa-slide-${e.id}`,"aria-labelledby":`pa-tab-${e.id}`,"aria-hidden":!r,tabIndex:r?0:-1,children:[a.jsxs("header",{className:"pa-slide-hdr",children:[a.jsx("span",{className:"pa-slide-emoji","aria-hidden":"true",children:e.emoji}),a.jsx("span",{className:"pa-slide-title",children:e.label})]}),a.jsxs("div",{className:"pa-slide-card",style:{"--_tab-color":e.color},children:[e.esMeal&&r&&a.jsxs(a.Fragment,{children:[a.jsxs("div",{className:"pa-bp-label",children:[a.jsx(qa,{}),"Buscar alimento para insertar"]}),a.jsx(za,{comida:e.id,placeholder:`Buscar para ${e.label.toLowerCase()}…`,onAgregar:v}),a.jsx("div",{className:"pa-bp-divider","aria-hidden":"true"})]}),a.jsx("label",{className:"pa-slide-label",htmlFor:`pa-textarea-${e.id}`,children:e.esMeal?"🍴 Detalle de alimentos":"💡 Indicaciones y consejos"}),a.jsx("textarea",{id:`pa-textarea-${e.id}`,ref:l,className:`pa-slide-textarea${f?" pa-slide-textarea--flashed":""}`,value:i,onChange:u=>p(u.target.value),placeholder:e.placeholder,"aria-label":`Contenido de ${e.label}`,rows:e.esMeal?7:9,spellCheck:"true",autoCorrect:"on"}),e.esMeal&&i.trim()&&a.jsx(Ga,{texto:i,productos:k})]})]})}function qa(){return a.jsxs("svg",{width:"11",height:"11",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.3",strokeLinecap:"round","aria-hidden":"true",children:[a.jsx("circle",{cx:"11",cy:"11",r:"8"}),a.jsx("line",{x1:"21",y1:"21",x2:"16.65",y2:"16.65"})]})}function Ga({texto:e,productos:r}){const[i,c]=o.useState(!1),{total:l,items:p}=o.useMemo(()=>ka(e,r),[e,r]);if(!p.length)return null;const v=p.filter(h=>{var g,u;return((g=h.origen)==null?void 0:g.includes("Libertad"))||((u=h.origen)==null?void 0:u.includes("ChangoMás"))}),k=p.filter(h=>{var g,u;return!((g=h.origen)!=null&&g.includes("Libertad"))&&!((u=h.origen)!=null&&u.includes("ChangoMás"))}),f=h=>h.toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2});return a.jsxs("div",{className:`pa-costo${i?" pa-costo--open":""}`,children:[a.jsxs("button",{className:"pa-costo__summary",type:"button",onClick:()=>c(h=>!h),"aria-expanded":i,"aria-label":`Valor estimado en Posadas: $${f(l)}. ${i?"Cerrar desglose":"Ver desglose"}`,children:[a.jsx("span",{className:"pa-costo__label",children:"Valor estimado en Posadas"}),a.jsxs("span",{className:"pa-costo__valor",children:["$",f(l)]}),a.jsx("span",{className:"pa-costo__ico",children:a.jsx(Fa,{})})]}),i&&a.jsxs("div",{className:"pa-costo__desglose",children:[a.jsx(la,{titulo:"Almacén",items:v,tagCls:"pa-costo__item-tag--almacen",fmt:f}),a.jsx(la,{titulo:"Frescos",items:k,tagCls:"pa-costo__item-tag--fresco",fmt:f}),a.jsxs("div",{className:"pa-costo__subtotal",children:[a.jsx("span",{children:"Total esta comida"}),a.jsxs("span",{children:["$",f(l)]})]}),a.jsx("p",{className:"pa-costo__leyenda",children:"Datos de góndola actualizados · Posadas, Misiones"})]})]})}function la({titulo:e,items:r,tagCls:i,fmt:c}){return r.length?a.jsxs("div",{children:[a.jsx("p",{className:"pa-costo__seccion-titulo",children:e}),r.map((l,p)=>a.jsxs("div",{className:"pa-costo__item",children:[a.jsxs("span",{className:"pa-costo__item-nombre",children:[l.nombre," · ",l.porcion>=1e3?`${(l.porcion/1e3).toFixed(1)} kg`:`${l.porcion} g`]}),a.jsx("span",{className:`pa-costo__item-tag ${i}`,children:e}),a.jsxs("span",{className:"pa-costo__item-precio",children:["$",c(l.costo)]})]},p))]}):null}function Ya(){const e=ya(r=>r.pacienteId);return a.jsx(Ma,{pacienteId:e})}export{Ya as default};
