import{r as o,d as y,j as e,q as J,g as O,l as ue}from"./index-D2PXe-Gk.js";const Q=[{id:"lacteos",label:"Lácteos",emoji:"🥛",color:"#FFF8E1"},{id:"huevos",label:"Huevos",emoji:"🥚",color:"#FFF3E0"},{id:"carnes",label:"Carnes y aves",emoji:"🥩",color:"#FCE4EC"},{id:"pescados",label:"Pescados y mariscos",emoji:"🐟",color:"#E3F2FD"},{id:"hortalizas",label:"Hortalizas",emoji:"🥦",color:"#E8F5E9"},{id:"frutas",label:"Frutas",emoji:"🍎",color:"#F3E5F5"},{id:"cereales",label:"Cereales y panificados",emoji:"🌾",color:"#FFFDE7"},{id:"legumbres",label:"Legumbres",emoji:"🫘",color:"#F1F8E9"},{id:"grasas",label:"Aceites y grasas",emoji:"🫒",color:"#FFF9C4"},{id:"otros",label:"Otros",emoji:"🥗",color:"#F5F5F5"}],T=`• Fraccioná las comidas en 4 a 6 tomas diarias: desayuno, colación, almuerzo, merienda y cena.
• Masticá lentamente y en un ambiente tranquilo, sin distracciones.
• Métodos de cocción recomendados: hervido, al vapor, grillado u horno. Evitá frituras y rebozados.
• Condimentá con hierbas aromáticas, limón y especias. Limitá la sal a 1 cucharadita por día (5 g).
• Hidratate con un mínimo de 2 litros de agua por día. Evitá bebidas azucaradas y alcohólicas.
• Evitá azúcares refinados, ultraprocesados y alimentos con conservantes artificiales.`,U=()=>new Date().toISOString().slice(0,10);function V(r=""){return{id:O(),grupo:r,alimento:"",caracteristicas:"",cantidad:""}}function E(){return Q.map(r=>V(r.label))}function he(r){return r?new Date(r+"T12:00:00").toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"}):""}function Y(r,t){const i=new Date(r+"T12:00:00");return i.setDate(i.getDate()+t),i.toISOString().slice(0,10)}function me(r="",t=""){return((r[0]??"")+(t[0]??"")).toUpperCase()||"🥗"}function P(r){return(r??"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").trim()}function M(r,t,i){if(!r.trim()||!t.trim()||!(i!=null&&i.length))return 0;const d=t.match(/(\d+(?:[.,]\d+)?)\s*(kg|l|g|ml)?/i);if(!d)return 0;let u=parseFloat(d[1].replace(",","."));const p=(d[2]??"g").toLowerCase();if((p==="kg"||p==="l")&&(u*=1e3),!u||isNaN(u))return 0;const c=P(r);let f=null,v=0;for(const g of i){if(!g.precioRef||!g.cantidadRefGramo)continue;const l=P(g.nombre);c.includes(l)&&l.length>v&&(f=g,v=l.length)}return f?f.precioRef/f.cantidadRefGramo*u:0}function $(r,t,i){const d=o.useMemo(()=>ue(r),t),u=o.useRef(i);return o.useSyncExternalStore(p=>{const c=d.subscribe({next:f=>{u.current=f,p()},error:()=>p()});return()=>c.unsubscribe()},()=>u.current,()=>i)}const fe=`
/* ── Raíz ──────────────────────────────────────────────────────────────── */
.pd {
  display: flex;
  flex-direction: column;
  padding-bottom: calc(var(--nav-h, 72px) + var(--space-8, 32px));
  animation: fade-in var(--transition-normal, 220ms) both;
  max-width: 780px;
  margin-inline: auto;
}

/* ── Sin paciente ─────────────────────────────────────────────────────── */
.pd-no-patient {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-16, 64px) var(--space-6, 24px);
  text-align: center;
  gap: var(--space-3, 12px);
  color: var(--color-text-low);
  font-size: var(--text-sm);
  font-weight: 500;
  line-height: 1.6;
}
.pd-no-patient span { font-size: 3rem; }

/* ── Header ─────────────────────────────────────────────────────────────── */
.pd-hdr {
  padding: var(--space-4) var(--space-4) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.pd-patient-bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.pd-avatar {
  width: 46px; height: 46px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--color-primary-dark), var(--color-primary-light));
  display: flex; align-items: center; justify-content: center;
  font-size: 1.1rem; font-weight: 800; color: #fff;
  flex-shrink: 0;
  box-shadow: 0 4px 14px rgba(46,125,50,.30);
  user-select: none;
}
.pd-patient-label {
  font-size: 10px; font-weight: 700;
  letter-spacing: .08em; text-transform: uppercase;
  color: var(--color-primary);
}
.pd-patient-name {
  font-size: var(--text-base); font-weight: 700;
  color: var(--color-text-high);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* ── Navegador de fecha ────────────────────────────────────────────────── */
.pd-date-nav {
  display: flex; align-items: center; gap: var(--space-2);
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--space-3) var(--space-4);
  box-shadow: 0 2px 4px rgba(0,0,0,.04), 0 6px 14px rgba(0,0,0,.06);
}
.pd-date-btn {
  width: 34px; height: 34px;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--color-border);
  background: transparent;
  color: var(--color-text-mid);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0;
  transition: background var(--transition-fast), color var(--transition-fast),
              transform 200ms cubic-bezier(.34,1.56,.64,1);
  -webkit-tap-highlight-color: transparent;
}
.pd-date-btn:hover  { background: var(--color-primary-surface); color: var(--color-primary); transform: scale(1.08); }
.pd-date-btn:active { transform: scale(.92); }
.pd-date-info  { flex: 1; text-align: center; }
.pd-date-dow   { font-size: 9px; font-weight: 800; text-transform: capitalize; letter-spacing: .09em; color: var(--color-primary); }
.pd-date-full  { font-size: var(--text-sm); font-weight: 600; color: var(--color-text-high); text-transform: capitalize; }
.pd-date-today {
  display: inline-block; margin-top: 2px;
  font-size: 9px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
  color: #fff; background: var(--color-primary);
  padding: 1px 8px; border-radius: var(--radius-full);
}

/* ── Toolbar plantillas ────────────────────────────────────────────────── */
.pd-toolbar {
  margin: var(--space-3) var(--space-4) 0;
  display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap;
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-divider);
  position: relative; overflow: hidden;
}
.pd-toolbar::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, var(--color-primary-dark), var(--color-primary-light), var(--color-accent-light, #ffd966), transparent);
}
.pd-tpl-select-wrap { flex: 1; min-width: 0; display: flex; align-items: center; gap: var(--space-2); }
.pd-tpl-select {
  flex: 1; min-width: 0;
  padding: var(--space-2) var(--space-3);
  border: 1.5px solid var(--color-border); border-radius: var(--radius-md);
  background: var(--color-bg); color: var(--color-text-high);
  font-size: var(--text-sm); font-weight: 500; cursor: pointer;
  -webkit-appearance: none; appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239E9E9E' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 10px center; padding-right: 30px;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  text-overflow: ellipsis;
}
.pd-tpl-select:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(46,125,50,.14); }
.pd-tpl-select:disabled { opacity: .55; cursor: not-allowed; }
.pd-btn-tpl {
  display: inline-flex; align-items: center; gap: 5px;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-full);
  border: 1.5px solid var(--color-accent, #E8A838);
  background: transparent; color: var(--color-accent, #E8A838);
  font-size: var(--text-sm); font-weight: 700; cursor: pointer;
  white-space: nowrap; flex-shrink: 0;
  transition: background var(--transition-fast), transform 200ms cubic-bezier(.34,1.56,.64,1);
  -webkit-tap-highlight-color: transparent;
}
.pd-btn-tpl:hover { background: var(--color-accent-surface, #FFF8E1); transform: scale(1.03) translateY(-1px); }
.pd-tpl-save-row { display: flex; align-items: center; gap: var(--space-2); flex: 1; animation: fade-in 160ms both; }
.pd-tpl-name-input {
  flex: 1; min-width: 0;
  padding: var(--space-2) var(--space-3);
  border: 1.5px solid var(--color-primary); border-radius: var(--radius-md);
  background: var(--color-bg); color: var(--color-text-high);
  font-size: var(--text-sm); font-weight: 500;
  box-shadow: 0 0 0 3px rgba(46,125,50,.12); outline: none;
}
.pd-tpl-confirm-btn {
  width: 34px; height: 34px; border-radius: var(--radius-full);
  border: none; background: var(--color-primary); color: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0; font-size: 1rem;
  transition: background var(--transition-fast), transform 200ms cubic-bezier(.34,1.56,.64,1);
}
.pd-tpl-confirm-btn:hover:not(:disabled) { background: var(--color-primary-dark); transform: scale(1.08); }
.pd-tpl-confirm-btn:disabled { opacity: .40; cursor: not-allowed; }
.pd-tpl-cancel-btn {
  width: 34px; height: 34px; border-radius: var(--radius-full);
  border: 1.5px solid var(--color-border); background: transparent;
  color: var(--color-text-mid); display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0; font-size: 1.1rem;
  transition: background var(--transition-fast), border-color var(--transition-fast),
              color var(--transition-fast), transform var(--transition-fast);
}
.pd-tpl-cancel-btn:hover { background: var(--color-error-surface, #FEE2E2); border-color: var(--color-error, #EF4444); color: var(--color-error, #EF4444); transform: rotate(90deg); }
.pd-tpl-saved { display: inline-flex; align-items: center; gap: 5px; font-size: var(--text-xs); font-weight: 600; color: var(--color-success, #16A34A); animation: fade-in 200ms both; flex-shrink: 0; }

/* ── Secciones ─────────────────────────────────────────────────────────── */
.pd-section {
  margin: var(--space-4) var(--space-4) 0;
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-divider);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}
.pd-section-hdr {
  display: flex; align-items: center; gap: var(--space-3);
  padding: var(--space-4) var(--space-4) var(--space-3);
  border-bottom: 1px solid var(--color-divider);
  background: var(--color-surface);
}
.pd-section-num {
  width: 28px; height: 28px; border-radius: var(--radius-full);
  background: var(--color-primary); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 800; letter-spacing: .04em;
  flex-shrink: 0; user-select: none;
}
.pd-section-title {
  flex: 1; font-size: var(--text-base); font-weight: 700;
  color: var(--color-text-high); letter-spacing: -.01em; margin: 0;
}
.pd-costo-total {
  font-size: var(--text-xs); font-weight: 700;
  color: #C87040; background: #FFF8E1;
  border: 1px solid #E8C870; border-radius: var(--radius-full);
  padding: 2px 10px; white-space: nowrap; flex-shrink: 0;
}

/* ── Indicaciones ──────────────────────────────────────────────────────── */
.pd-indic-area {
  display: block; width: 100%; box-sizing: border-box;
  min-height: 168px; resize: vertical;
  padding: var(--space-4);
  border: none; outline: none;
  background: var(--color-bg);
  color: var(--color-text-high);
  font-family: var(--font-sans); font-size: var(--text-sm); line-height: 1.8;
  -webkit-appearance: none; appearance: none;
}
.pd-indic-area::placeholder { color: var(--color-text-disabled); font-style: italic; }
.pd-indic-area:focus { background: var(--color-surface); }

/* ── Tabla R/P ─────────────────────────────────────────────────────────── */
.pd-table-container { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.pd-table {
  width: 100%; border-collapse: collapse; table-layout: fixed;
  min-width: 540px;
}

/* Cabecera de columnas */
.pd-thead-row { background: var(--color-primary); }
.pd-th {
  padding: 10px 12px;
  font-size: 10px; font-weight: 800; letter-spacing: .08em;
  text-transform: uppercase; color: #fff; text-align: left;
}
.pd-th--alimento { width: 30%; }
.pd-th--caract   { width: 45%; }
.pd-th--cant     { width: 20%; }
.pd-th--rm       { width: 5%; }

/* Grupo header */
.pd-group-hdr { }
.pd-group-cell {
  background: var(--_g-color, #F5F5F5);
  padding: 6px 12px;
  display: flex; align-items: center; gap: var(--space-2);
  border-top: 1px solid rgba(0,0,0,.06);
  border-bottom: 1px solid rgba(0,0,0,.06);
}
.pd-group-emoji { font-size: .95rem; line-height: 1; user-select: none; }
.pd-group-label { font-size: var(--text-xs); font-weight: 800; color: var(--color-text-high); letter-spacing: .02em; flex: 1; }
.pd-group-costo {
  font-size: 10px; font-weight: 700; color: #C87040;
  background: rgba(255,255,255,.65); border: 1px solid #E8C870;
  padding: 1px 8px; border-radius: var(--radius-full); white-space: nowrap;
}
.pd-btn-add-row {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 3px 10px; border-radius: var(--radius-full);
  border: 1px dashed var(--color-primary-light, #81C784);
  background: rgba(255,255,255,.70); color: var(--color-primary);
  font-size: 10px; font-weight: 700; letter-spacing: .02em;
  cursor: pointer; white-space: nowrap; flex-shrink: 0;
  transition: background var(--transition-fast), transform 150ms ease;
  -webkit-tap-highlight-color: transparent;
}
.pd-btn-add-row:hover { background: var(--color-primary-surface); transform: scale(1.04); }

/* Filas de items */
.pd-row-item { border-bottom: 1px solid var(--color-divider); }
.pd-row-item:hover { background: rgba(46,125,50,.025); }
.pd-cell { padding: 5px 6px; vertical-align: middle; }
.pd-cell--rm { text-align: center; width: 42px; }

/* Inputs de celda */
.pd-cell-input {
  display: block; width: 100%; box-sizing: border-box;
  padding: 5px 8px;
  border: 1px solid transparent; border-radius: var(--radius-md);
  background: transparent; color: var(--color-text-high);
  font-family: var(--font-sans); font-size: var(--text-sm);
  -webkit-appearance: none; appearance: none;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}
.pd-cell-input:focus {
  outline: none; border-color: var(--color-primary-light, #81C784);
  background: var(--color-surface); box-shadow: 0 0 0 2px rgba(76,175,80,.12);
}
.pd-cell-input::placeholder { color: var(--color-text-disabled); font-size: .8rem; }
.pd-cell-input--cant { font-variant-numeric: tabular-nums; }

/* Cant + badge de costo */
.pd-cant-row { display: flex; align-items: center; gap: 4px; }
.pd-costo-badge {
  font-size: 9px; font-weight: 700; color: #C87040;
  background: #FFF8E1; border: 1px solid #E8C870;
  padding: 1px 5px; border-radius: var(--radius-full);
  white-space: nowrap; flex-shrink: 0; user-select: none;
}

/* Botón eliminar fila */
.pd-btn-rm {
  width: 26px; height: 26px; border-radius: var(--radius-full);
  border: 1px solid var(--color-border); background: transparent;
  color: var(--color-text-low); display: flex; align-items: center; justify-content: center;
  cursor: pointer; margin: auto;
  transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast), transform 150ms ease;
  -webkit-tap-highlight-color: transparent;
}
.pd-btn-rm:hover { background: var(--color-error-surface, #FEE2E2); color: var(--color-error, #EF4444); border-color: var(--color-error, #EF4444); transform: scale(1.1); }

/* ── CaractInput autocomplete ─────────────────────────────────────────── */
.pd-caract-wrap { position: relative; }
.pd-caract-drop {
  position: absolute; left: 0; right: 0; top: calc(100% + 3px); z-index: 200;
  background: rgba(255,255,255,.97);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 4px 20px rgba(0,0,0,.12);
  list-style: none; margin: 0; padding: 4px 0;
  max-height: 200px; overflow-y: auto;
  animation: fade-in 140ms ease both;
}
.pd-caract-opt {
  display: flex; align-items: baseline; gap: 6px;
  padding: 6px 12px; cursor: pointer;
  transition: background var(--transition-fast);
}
.pd-caract-opt:hover { background: var(--color-primary-surface); }
.pd-caract-opt__name { font-size: var(--text-sm); font-weight: 600; color: var(--color-text-high); }
.pd-caract-opt__orig { font-size: 10px; color: var(--color-text-low); white-space: nowrap; }

/* ── Print: ocultar costos ──────────────────────────────────────────────── */
@media print {
  .pd-costo-badge,
  .pd-costo-total,
  .pd-group-costo { display: none !important; }
}

/* ── Footer ────────────────────────────────────────────────────────────── */
.pd-footer {
  margin: var(--space-4) var(--space-4) 0;
  display: flex; align-items: center; gap: var(--space-4); flex-wrap: wrap;
}
.pd-btn-save {
  display: inline-flex; align-items: center; justify-content: center;
  gap: var(--space-2); padding: var(--space-3) var(--space-7);
  background: linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 50%, var(--color-primary-light) 100%);
  background-size: 200% 100%; background-position: 0% center;
  color: #fff; border-radius: var(--radius-lg);
  font-size: var(--text-base); font-weight: 700;
  box-shadow: 0 4px 16px rgba(46,125,50,.38), 0 2px 6px rgba(0,0,0,.12);
  transition: background-position 350ms ease, transform var(--transition-fast),
              box-shadow var(--transition-fast), opacity var(--transition-fast);
  -webkit-tap-highlight-color: transparent;
}
.pd-btn-save:hover:not(:disabled) { background-position: 100% center; transform: translateY(-2px); box-shadow: 0 8px 28px rgba(46,125,50,.48), 0 4px 12px rgba(0,0,0,.15); }
.pd-btn-save:active:not(:disabled) { transform: translateY(0) scale(.99); }
.pd-btn-save:disabled { opacity: .55; cursor: not-allowed; }
.pd-saved-notice { display: inline-flex; align-items: center; gap: var(--space-1); font-size: var(--text-xs); font-weight: 600; color: var(--color-success, #16A34A); animation: fade-in 200ms both; }

/* ── Loading dots ──────────────────────────────────────────────────────── */
.pd-loading { display: flex; align-items: center; justify-content: center; padding: var(--space-8) var(--space-4); gap: var(--space-2); }
.pd-loading-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-primary-light); animation: pd-bounce 1.2s ease-in-out infinite; }
.pd-loading-dot:nth-child(2) { animation-delay: .2s; }
.pd-loading-dot:nth-child(3) { animation-delay: .4s; }
@keyframes pd-bounce {
  0%, 80%, 100% { transform: scale(.75); opacity: .4; }
  40%           { transform: scale(1);   opacity: 1;  }
}
`;function ge(){if(typeof document>"u"||document.getElementById("pd-styles-v1"))return;const r=document.createElement("style");r.id="pd-styles-v1",r.textContent=fe,document.head.appendChild(r)}const xe=()=>e.jsx("svg",{width:"13",height:"13",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.8",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:e.jsx("polyline",{points:"15 18 9 12 15 6"})}),be=()=>e.jsx("svg",{width:"13",height:"13",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.8",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:e.jsx("polyline",{points:"9 18 15 12 9 6"})}),ve=()=>e.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.2",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:[e.jsx("path",{d:"M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"}),e.jsx("polyline",{points:"17 21 17 13 7 13 7 21"}),e.jsx("polyline",{points:"7 3 7 8 15 8"})]}),G=()=>e.jsx("svg",{width:"13",height:"13",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:e.jsx("polyline",{points:"20 6 9 17 4 12"})}),K=()=>e.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",style:{animation:"spin 0.9s linear infinite"},"aria-hidden":"true",children:e.jsx("path",{d:"M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"})}),we=()=>e.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.8",strokeLinecap:"round","aria-hidden":"true",children:[e.jsx("line",{x1:"18",y1:"6",x2:"6",y2:"18"}),e.jsx("line",{x1:"6",y1:"6",x2:"18",y2:"18"})]}),ye=()=>e.jsx("svg",{width:"13",height:"13",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.2",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:e.jsx("polygon",{points:"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"})}),je=()=>e.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round","aria-hidden":"true",children:[e.jsx("line",{x1:"18",y1:"6",x2:"6",y2:"18"}),e.jsx("line",{x1:"6",y1:"6",x2:"18",y2:"18"})]});function ke({value:r,onChange:t,productos:i}){const[d,u]=o.useState([]),[p,c]=o.useState(!1),f=o.useRef(null);function v(l){const h=l.target.value;if(t(h),h.length>=2&&(i!=null&&i.length)){const b=P(h),j=i.filter(k=>P(k.nombre).includes(b)).slice(0,7);u(j),c(j.length>0)}else c(!1)}function g(l){t(l.nombre+(l.origen?" — "+l.origen:"")),c(!1),u([])}return o.useEffect(()=>{function l(h){f.current&&!f.current.contains(h.target)&&c(!1)}return document.addEventListener("mousedown",l),()=>document.removeEventListener("mousedown",l)},[]),e.jsxs("div",{className:"pd-caract-wrap",ref:f,children:[e.jsx("input",{className:"pd-cell-input",value:r,onChange:v,onFocus:()=>d.length>0&&c(!0),placeholder:"Corte, marca, preparación…",spellCheck:!1,autoComplete:"off"}),p&&e.jsx("ul",{className:"pd-caract-drop",role:"listbox","aria-label":"Sugerencias de producto",children:d.map(l=>e.jsxs("li",{role:"option",className:"pd-caract-opt",onMouseDown:()=>g(l),children:[e.jsx("span",{className:"pd-caract-opt__name",children:l.nombre}),l.origen&&e.jsx("span",{className:"pd-caract-opt__orig",children:l.origen})]},l.id))})]})}const Ce=o.memo(function({row:t,onUpdate:i,onRemove:d,productos:u}){const p=o.useMemo(()=>M(t.alimento,t.cantidad,u),[t.alimento,t.cantidad,u]),c=o.useCallback(h=>i(t.id,"alimento",h.target.value),[t.id,i]),f=o.useCallback(h=>i(t.id,"cantidad",h.target.value),[t.id,i]),v=o.useCallback(h=>i(t.id,"caracteristicas",h),[t.id,i]),g=o.useCallback(()=>d(t.id),[t.id,d]),l=h=>h.toLocaleString("es-AR",{minimumFractionDigits:0,maximumFractionDigits:0});return e.jsxs("tr",{className:"pd-row-item",children:[e.jsx("td",{className:"pd-cell pd-cell--alimento",children:e.jsx("input",{className:"pd-cell-input",value:t.alimento,onChange:c,placeholder:"Alimento…",spellCheck:!1,autoComplete:"off"})}),e.jsx("td",{className:"pd-cell pd-cell--caract",children:e.jsx(ke,{value:t.caracteristicas,onChange:v,productos:u})}),e.jsx("td",{className:"pd-cell pd-cell--cant",children:e.jsxs("div",{className:"pd-cant-row",children:[e.jsx("input",{className:"pd-cell-input pd-cell-input--cant",value:t.cantidad,onChange:f,placeholder:"200 ml",spellCheck:!1,autoComplete:"off"}),p>0&&e.jsxs("span",{className:"pd-costo-badge","aria-label":`Costo estimado $${l(p)}`,children:["$",l(p)]})]})}),e.jsx("td",{className:"pd-cell pd-cell--rm",children:e.jsx("button",{className:"pd-btn-rm",onClick:g,type:"button","aria-label":"Eliminar fila",children:e.jsx(je,{})})})]})},(r,t)=>r.row.alimento===t.row.alimento&&r.row.caracteristicas===t.row.caracteristicas&&r.row.cantidad===t.row.cantidad&&r.productos===t.productos&&r.onUpdate===t.onUpdate&&r.onRemove===t.onRemove);function Ee({pacienteId:r}){o.useEffect(()=>{ge()},[]);const[t,i]=o.useState(U),[d,u]=o.useState(T),[p,c]=o.useState(E),[f,v]=o.useState(!1),[g,l]=o.useState(!1),[h,b]=o.useState(!1),[j,k]=o.useState(!1),[N,F]=o.useState(""),[S,_]=o.useState(!1),[X,A]=o.useState(!1),[Z,ee]=o.useState(""),B=o.useRef(null),z=o.useRef(""),x=$(()=>r?y.pacientes.get(r):Promise.resolve(null),[r],null),C=$(()=>y.plantillas.toArray(),[],[]),R=$(()=>y.productos.toArray(),[],[]);o.useEffect(()=>{if(!r)return;const a=`${r}|${t}`;if(z.current===a)return;let s=!1;return v(!0),y.planes.where("[pacienteId+fecha]").equals([r,t]).first().then(n=>{if(!s){if(z.current=a,n!=null&&n.tablaRP)try{c(JSON.parse(n.tablaRP))}catch{c(E())}else c(E());u((n==null?void 0:n.indicacionesIniciales)??T)}}).catch(n=>console.error("[PlanAlimentario] Error cargando:",n)).finally(()=>{s||v(!1)}),()=>{s=!0}},[r,t]),o.useEffect(()=>{z.current=""},[r,t]);const L=o.useMemo(()=>p.reduce((a,s)=>a+M(s.alimento,s.cantidad,R),0),[p,R]);if(!r)return e.jsx("section",{className:"pd",children:e.jsxs("div",{className:"pd-no-patient",children:[e.jsx("span",{"aria-hidden":"true",children:"🥗"}),e.jsx("p",{children:"Seleccioná un paciente para ver y editar su prescripción dietética"})]})});const D=[x==null?void 0:x.nombre,x==null?void 0:x.apellido].filter(Boolean).join(" ")||"Paciente",H=he(t),[ae,...re]=H.split(" "),te=t===U(),W=a=>a.toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2}),oe=o.useCallback((a,s,n)=>{c(m=>m.map(w=>w.id===a?{...w,[s]:n}:w)),b(!1)},[]),ne=o.useCallback(a=>{c(s=>s.filter(n=>n.id!==a)),b(!1)},[]),ie=o.useCallback(a=>{c(s=>{const n=s.map((I,pe)=>I.grupo===a?pe:-1).filter(I=>I>=0),m=n.length>0?n[n.length-1]:s.length-1,w=[...s];return w.splice(m+1,0,V(a)),w}),b(!1)},[]),se=o.useCallback(async()=>{if(!(!r||g)){l(!0),b(!1);try{const a=await y.planes.where("[pacienteId+fecha]").equals([r,t]).first(),s={pacienteId:r,fecha:t,indicacionesIniciales:d,tablaRP:JSON.stringify(p),indicaciones:d,desayuno:"",almuerzo:"",merienda:"",cena:"",sincronizado:0,actualizadoEn:new Date().toISOString()};if(a)await y.planes.update(a.id,s),await J("planes","UPDATE",{id:a.id,...s});else{const m={id:O(),creadoEn:new Date().toISOString(),...s};await y.planes.add(m),await J("planes","CREATE",m)}z.current=`${r}|${t}`,b(!0),setTimeout(()=>b(!1),3e3)}catch(a){console.error("[PlanAlimentario] Error al guardar:",a)}finally{l(!1)}}},[r,t,d,p,g]),q=o.useCallback(async()=>{if(!(!N.trim()||S)){_(!0);try{await y.plantillas.add({id:O(),nombre_plantilla:N.trim(),indicacionesIniciales:d,tablaRP:JSON.stringify(p),indicaciones:d,desayuno:"",almuerzo:"",merienda:"",cena:"",creadoEn:new Date().toISOString()}),F(""),k(!1),A(!0),setTimeout(()=>A(!1),2800)}catch(a){console.error("[PlanAlimentario] Error guardando plantilla:",a)}finally{_(!1)}}},[N,S,d,p]),le=o.useCallback(a=>{const s=a.target.value;if(ee(s),!s)return;const n=C.find(m=>m.id===s);if(n){if(u(n.indicacionesIniciales??n.indicaciones??T),n.tablaRP)try{c(JSON.parse(n.tablaRP))}catch{c(E())}else c(E());b(!1)}},[C]),ce=o.useCallback(()=>i(a=>Y(a,-1)),[]),de=o.useCallback(()=>i(a=>Y(a,1)),[]);return o.useEffect(()=>{j&&requestAnimationFrame(()=>{var a;return(a=B.current)==null?void 0:a.focus()})},[j]),e.jsxs("section",{className:"pd","aria-label":`Prescripción dietética — ${D}`,children:[e.jsxs("div",{className:"pd-hdr",children:[e.jsxs("div",{className:"pd-patient-bar",children:[e.jsx("div",{className:"pd-avatar","aria-hidden":"true",children:me(x==null?void 0:x.nombre,x==null?void 0:x.apellido)}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsx("div",{className:"pd-patient-label",children:"Prescripción Dietética"}),e.jsx("div",{className:"pd-patient-name",children:D})]})]}),e.jsxs("nav",{className:"pd-date-nav","aria-label":"Navegar por fecha",children:[e.jsx("button",{className:"pd-date-btn",onClick:ce,"aria-label":"Día anterior",type:"button",children:e.jsx(xe,{})}),e.jsxs("div",{className:"pd-date-info",children:[e.jsx("div",{className:"pd-date-dow",children:ae}),e.jsx("div",{className:"pd-date-full",children:re.join(" ")}),te&&e.jsx("span",{className:"pd-date-today",role:"status",children:"Hoy"})]}),e.jsx("button",{className:"pd-date-btn",onClick:de,"aria-label":"Día siguiente",type:"button",children:e.jsx(be,{})})]})]}),e.jsxs("div",{className:"pd-toolbar",role:"toolbar","aria-label":"Herramientas de plantilla",children:[e.jsxs("div",{className:"pd-tpl-select-wrap",children:[e.jsx("span",{"aria-hidden":"true",children:"📂"}),e.jsxs("select",{className:"pd-tpl-select",value:Z,onChange:le,disabled:!C.length,"aria-label":"Cargar desde plantilla guardada",children:[e.jsx("option",{value:"",children:C.length?`Cargar plantilla… (${C.length})`:"Sin plantillas guardadas"}),C.map(a=>e.jsx("option",{value:a.id,children:a.nombre_plantilla},a.id))]})]}),j?e.jsxs("div",{className:"pd-tpl-save-row",role:"group","aria-label":"Nombre de nueva plantilla",children:[e.jsx("input",{ref:B,className:"pd-tpl-name-input",type:"text",value:N,onChange:a=>F(a.target.value),placeholder:"Nombre de la plantilla…",maxLength:60,onKeyDown:a=>{a.key==="Enter"&&q(),a.key==="Escape"&&(k(!1),F(""))}}),e.jsx("button",{className:"pd-tpl-confirm-btn",type:"button",onClick:q,disabled:!N.trim()||S,title:"Guardar plantilla",children:S?e.jsx(K,{}):e.jsx(G,{})}),e.jsx("button",{className:"pd-tpl-cancel-btn",type:"button",onClick:()=>{k(!1),F("")},title:"Cancelar",children:e.jsx(we,{})})]}):e.jsxs("button",{className:"pd-btn-tpl",onClick:()=>{k(!0),A(!1)},type:"button",children:[e.jsx(ye,{}),e.jsx("span",{children:"Guardar como Plantilla"})]}),X&&e.jsxs("span",{className:"pd-tpl-saved",role:"status",children:[e.jsx(G,{})," ¡Plantilla guardada!"]})]}),e.jsxs("div",{className:"pd-section",children:[e.jsxs("div",{className:"pd-section-hdr",children:[e.jsx("span",{className:"pd-section-num",children:"I"}),e.jsx("h2",{className:"pd-section-title",children:"Indicaciones Iniciales"})]}),e.jsx("textarea",{className:"pd-indic-area",value:d,onChange:a=>{u(a.target.value),b(!1)},rows:7,placeholder:"Ingresá las indicaciones iniciales del plan dietético…","aria-label":"Indicaciones iniciales del plan dietético",spellCheck:"true"})]}),e.jsxs("div",{className:"pd-section pd-section--rp",children:[e.jsxs("div",{className:"pd-section-hdr",children:[e.jsx("span",{className:"pd-section-num",children:"R"}),e.jsx("h2",{className:"pd-section-title",children:"Tabla R/P — Prescripción Alimentaria"}),L>0&&e.jsxs("span",{className:"pd-costo-total","aria-label":`Costo estimado total del día: $${W(L)}`,children:["Total día est.: $",W(L)]})]}),f?e.jsxs("div",{className:"pd-loading",role:"status","aria-live":"polite","aria-label":"Cargando prescripción…",children:[e.jsx("div",{className:"pd-loading-dot"}),e.jsx("div",{className:"pd-loading-dot"}),e.jsx("div",{className:"pd-loading-dot"})]}):e.jsx("div",{className:"pd-table-container",children:e.jsxs("table",{className:"pd-table",children:[e.jsxs("colgroup",{children:[e.jsx("col",{style:{width:"30%"}}),e.jsx("col",{style:{width:"44%"}}),e.jsx("col",{style:{width:"21%"}}),e.jsx("col",{style:{width:"5%"}})]}),e.jsx("thead",{children:e.jsxs("tr",{className:"pd-thead-row",children:[e.jsx("th",{className:"pd-th",children:"Alimentos"}),e.jsx("th",{className:"pd-th",children:"Características"}),e.jsx("th",{className:"pd-th",children:"Cantidades"}),e.jsx("th",{className:"pd-th","aria-label":"Acciones"})]})}),e.jsx("tbody",{children:Q.map(a=>{const s=p.filter(m=>m.grupo===a.label),n=s.reduce((m,w)=>m+M(w.alimento,w.cantidad,R),0);return e.jsxs(o.Fragment,{children:[e.jsx("tr",{className:"pd-group-hdr",children:e.jsxs("td",{colSpan:4,className:"pd-group-cell",style:{"--_g-color":a.color},children:[e.jsx("span",{className:"pd-group-emoji","aria-hidden":"true",children:a.emoji}),e.jsx("span",{className:"pd-group-label",children:a.label}),n>0&&e.jsxs("span",{className:"pd-group-costo","aria-label":`Subtotal ${a.label}`,children:["$",n.toLocaleString("es-AR",{maximumFractionDigits:0})]}),e.jsx("button",{className:"pd-btn-add-row",type:"button",onClick:()=>ie(a.label),"aria-label":`Agregar fila a ${a.label}`,children:"+ Agregar fila"})]})}),s.map(m=>e.jsx(Ce,{row:m,onUpdate:oe,onRemove:ne,productos:R},m.id))]},a.id)})})]})})]}),e.jsxs("footer",{className:"pd-footer",children:[e.jsx("button",{className:"pd-btn-save",onClick:se,disabled:g,type:"button","aria-label":`Guardar prescripción de ${D} del ${H}`,children:g?e.jsxs(e.Fragment,{children:[e.jsx(K,{}),e.jsx("span",{children:"Guardando…"})]}):e.jsxs(e.Fragment,{children:[e.jsx(ve,{}),e.jsx("span",{children:"Guardar Prescripción"})]})}),h&&e.jsxs("span",{className:"pd-saved-notice",role:"status",children:[e.jsx(G,{}),"Guardado · en cola de sync"]})]})]})}export{Q as G,Ee as P};
