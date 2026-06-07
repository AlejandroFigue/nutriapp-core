import{r as h,u as $,j as a,l as I,d as j}from"./index-D-RqeLd2.js";import{c as D,p as F}from"./costos-V0IoYBoe.js";const P=`
/* ══ Wrapper ═══════════════════════════════════════════════════════════════ */
.adash {
  max-width: 1060px;
  margin-inline: auto;
  padding: var(--space-5) var(--space-4) var(--space-12);
  animation: fade-in var(--transition-normal) both;
}

/* ══ Header ══════════════════════════════════════════════════════════════════ */
.adash__header {
  margin-bottom: var(--space-6);
}
.adash__patient-name {
  font-size: var(--text-2xl);
  font-weight: 800;
  color: var(--color-text-high);
  letter-spacing: -0.025em;
  line-height: 1.15;
}
.adash__patient-meta {
  font-size: var(--text-sm);
  color: var(--color-text-mid);
  margin-top: var(--space-1);
  line-height: 1.55;
  letter-spacing: 0.01em;
}

/* ══ Section label ════════════════════════════════════════════════════════════ */
.adash__section-label {
  font-size: var(--text-xs);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--color-primary);
  margin-bottom: var(--space-3);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.adash__section-label::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-divider);
}

/* ══ Main grid ════════════════════════════════════════════════════════════════ */
.adash__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-5);
  align-items: start;
  margin-bottom: var(--space-5);
}
@media (max-width: 740px) {
  .adash__grid { grid-template-columns: 1fr; }
}

/* ══ Left panel — gráficos ════════════════════════════════════════════════════ */
.adash__left {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.adash__chart-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-divider);
  box-shadow: 0 4px 20px rgba(255, 208, 185, 0.14);
  padding: var(--space-5) var(--space-5) var(--space-4);
  position: relative;
  overflow: hidden;
  transition: box-shadow var(--transition-fast);
}
.adash__chart-card:hover {
  box-shadow: 0 8px 28px rgba(255, 208, 185, 0.22);
}
.adash__chart-card::before {
  content: '';
  position: absolute;
  inset-block-start: 0;
  inset-inline: 0;
  height: 3px;
  background: linear-gradient(90deg,
    var(--color-durazno-dark), var(--color-durazno), var(--color-amarillo-deep));
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.adash__chart-title {
  font-size: var(--text-xs);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--color-text-mid);
  margin-bottom: var(--space-4);
}

/* ══ Donut chart — conic-gradient + mask-image radial ════════════════════════ */
.adash-donut {
  position: relative;
  width: var(--donut-size, 160px);
  height: var(--donut-size, 160px);
  margin-inline: auto;
}

.adash-donut__ring {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  will-change: transform;
  transform: translateZ(0);
}

.adash-donut__center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  padding-inline: 12%;
}

.adash-donut__value {
  font-size: var(--text-xl);
  font-weight: 800;
  color: var(--color-text-high);
  letter-spacing: -0.03em;
  line-height: 1;
  text-align: center;
}

.adash-donut__sub {
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--color-text-low);
  margin-top: 3px;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  text-align: center;
  line-height: 1.3;
}

/* ── Leyenda del donut ── */
.adash-legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-4);
  justify-content: center;
  margin-top: var(--space-4);
}

.adash-legend__item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-xs);
  color: var(--color-text-mid);
  font-weight: 500;
  letter-spacing: 0.01em;
}

.adash-legend__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ═══ Right panel — tarjetas médicas ════════════════════════════════════════ */
.adash__right {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
@media (max-width: 480px) {
  .adash__right { grid-template-columns: 1fr; }
}

/* ── Info card ── */
.adash__card {
  background: #ffffff;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-divider);
  box-shadow:
    0 2px 10px rgba(255, 208, 185, 0.12),
    0 1px 4px  rgba(0, 0, 0, 0.04);
  padding: var(--space-4) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast);
}
.adash__card:hover {
  transform: translate3d(0, -2px, 0);
  box-shadow:
    0 8px 24px rgba(255, 208, 185, 0.20),
    0 2px 8px  rgba(0, 0, 0, 0.06);
}
.dark .adash__card { background: var(--color-surface); }

.adash__card--wide {
  grid-column: 1 / -1;
}

.adash__card__label {
  font-size: 0.64rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--color-text-low);
  line-height: 1;
}

.adash__card__value {
  font-size: var(--text-xl);
  font-weight: 800;
  color: var(--color-text-high);
  letter-spacing: -0.03em;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
}

.adash__card__unit {
  font-size: var(--text-xs);
  font-weight: 400;
  color: var(--color-text-mid);
  letter-spacing: 0;
  margin-inline-start: 2px;
}

.adash__card__badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #fff;
  align-self: flex-start;
  white-space: nowrap;
  line-height: 1.5;
  margin-top: 2px;
}

.adash__card__empty {
  font-size: var(--text-xs);
  color: var(--color-text-disabled);
  font-style: italic;
  font-weight: 400;
}

/* ══ Bloque de costos regionales ═══════════════════════════════════════════ */
.adash__cost {
  background: var(--color-amarillo);
  border: 1px solid var(--color-amarillo-deep);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: var(--space-5);
  box-shadow:
    0 4px 20px rgba(232, 200, 112, 0.24),
    0 1px 6px  rgba(0, 0, 0, 0.04);
}
@media (max-width: 560px) {
  .adash__cost { grid-template-columns: 1fr; }
}

.dark .adash__cost {
  background: var(--color-accent-surface);
  border-color: var(--color-accent-light);
}

.adash__cost__header {
  font-size: 0.64rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--color-warning);
  margin-bottom: var(--space-3);
}

.adash__cost__grid {
  display: flex;
  gap: var(--space-8);
  flex-wrap: wrap;
}

.adash__cost__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.adash__cost__item-label {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--texto-suave);
}

.adash__cost__amount {
  font-size: var(--text-2xl);
  font-weight: 800;
  color: var(--texto-principal);
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.adash__cost__provenance {
  font-size: var(--text-xs);
  color: var(--texto-muy-suave);
  font-style: italic;
  margin-top: var(--space-3);
  line-height: 1.5;
}

.adash__cost__desglose {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.adash__cost__desglose-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  font-size: var(--text-xs);
  color: var(--texto-suave);
}

.adash__cost__desglose-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-inline-end: 4px;
}

.adash__cost__desglose-name {
  display: flex;
  align-items: center;
  gap: 4px;
}

.adash__cost__desglose-val {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--texto-principal);
}

/* ══ Estado sin paciente ══════════════════════════════════════════════════════ */
.adash__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-16) var(--space-6);
  text-align: center;
  animation: fade-in var(--transition-slow) both;
}

.adash__empty__orb {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 40%,
    var(--color-durazno) 0%,
    var(--color-amarillo) 60%,
    transparent 100%);
  border: 2px solid var(--color-durazno);
  flex-shrink: 0;
}

.adash__empty__title {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-text-mid);
  letter-spacing: -0.02em;
}

.adash__empty__text {
  font-size: var(--text-sm);
  color: var(--color-text-low);
  max-width: 320px;
  line-height: 1.75;
}
`;function R(){if(typeof document>"u"||document.getElementById("adash-styles-v1"))return;const r=document.createElement("style");r.id="adash-styles-v1",r.textContent=P,document.head.appendChild(r)}function y(r,t,p){const o=h.useMemo(()=>I(r),t),l=h.useRef(p);return h.useSyncExternalStore(e=>{const m=o.subscribe({next:n=>{l.current=n,e()},error:()=>e()});return()=>m.unsubscribe()},()=>l.current,()=>p)}const z=[{label:"Bajo peso",min:0,max:18.5,color:"#4ECDC4"},{label:"Normal",min:18.5,max:25,color:"#2ECC71"},{label:"Sobrepeso",min:25,max:30,color:"#F1C40F"},{label:"Obesidad I",min:30,max:35,color:"#E67E22"},{label:"Obesidad II",min:35,max:40,color:"#E74C3C"},{label:"Obesidad III",min:40,max:1/0,color:"#C0392B"}];function B(r){return r==null?null:z.find(t=>r>=t.min&&r<t.max)??z.at(-1)}function k({segments:r,size:t=164,holeRatio:p=.58,centerValue:o,centerLabel:l}){const e=r.reduce((i,d)=>i+Math.max(0,d.value),0),m=h.useMemo(()=>{if(e===0)return"var(--color-border) 0% 100%";let i=0;return r.filter(d=>d.value>0).map(d=>{const x=d.value/e*100,v=i;return i+=x,`${d.color} ${v.toFixed(2)}% ${i.toFixed(2)}%`}).join(", ")},[r,e]),n=`${Math.round(p*100)}%`;return a.jsxs("div",{className:"adash-donut",style:{"--donut-size":`${t}px`},children:[a.jsx("div",{className:"adash-donut__ring","aria-hidden":"true",style:{background:`conic-gradient(${m})`,maskImage:`radial-gradient(transparent ${n}, black ${n})`,WebkitMaskImage:`radial-gradient(transparent ${n}, black ${n})`}}),a.jsxs("div",{className:"adash-donut__center","aria-hidden":"true",children:[o!=null&&a.jsx("span",{className:"adash-donut__value",children:o}),l&&a.jsx("span",{className:"adash-donut__sub",children:l})]})]})}function u({label:r,value:t,unit:p,badge:o,badgeColor:l,wide:e}){return a.jsxs("div",{className:`adash__card${e?" adash__card--wide":""}`,children:[a.jsx("span",{className:"adash__card__label",children:r}),t!=null?a.jsxs(a.Fragment,{children:[a.jsxs("span",{className:"adash__card__value",children:[t,p&&a.jsx("span",{className:"adash__card__unit",children:p})]}),o&&a.jsx("span",{className:"adash__card__badge",style:{background:l??"var(--color-primary)"},children:o})]}):a.jsx("span",{className:"adash__card__empty",children:"Sin datos"})]})}const L={bajar:"Bajar peso",mantener:"Mantener",subir:"Subir peso",musculo:"Ganar músculo",salud:"Salud general"},S={desayuno:"#E8956A",almuerzo:"#7BAE70",merienda:"#E8C870",cena:"#7EB8E0"};function q(){h.useEffect(()=>{R()},[]);const r=$(s=>s.pacienteId),t=y(()=>r?j.pacientes.get(r):Promise.resolve(null),[r],null),p=y(()=>r?j.historias.where("pacienteId").equals(r).toArray().then(s=>[...s].sort((c,g)=>g.fecha.localeCompare(c.fecha))):Promise.resolve([]),[r],[]),o=y(()=>r?j.planes.where("pacienteId").equals(r).toArray().then(s=>s.sort((c,g)=>g.fecha.localeCompare(c.fecha))[0]??null):Promise.resolve(null),[r],null),l=y(()=>j.productos.toArray(),[],[]),e=p[0]??null,m=(e==null?void 0:e.imc)??null,n=h.useMemo(()=>B(m),[m]),i=(e==null?void 0:e.masaGrasa)??0,d=(e==null?void 0:e.masaMuscular)??0,x=(e==null?void 0:e.aguaCorporal)??0,v=Math.max(0,100-i-d-x),f=i>0||d>0||x>0,w=h.useMemo(()=>[{value:i,color:"#E8956A",label:"Grasa"},{value:d,color:"#7BAE70",label:"Músculo"},{value:x,color:"#7EB8E0",label:"Agua corporal"},{value:v,color:"#F0EAE2",label:"Resto"}],[i,d,x,v]),_=h.useMemo(()=>!o||!l.length?{costoDiario:0,costoMensual:0,desglose:{}}:D(o,l),[o,l]),N=h.useMemo(()=>!o||!l.length?[]:["desayuno","almuerzo","merienda","cena"].map(c=>{const{total:g}=F(o[c]??"",l);return{label:c.charAt(0).toUpperCase()+c.slice(1),value:g,color:S[c]}}).filter(c=>c.value>0),[o,l]),C=N.reduce((s,c)=>s+c.value,0),b=C>0,E=e!=null&&e.cintura&&(e!=null&&e.cadera)?(e.cintura/e.cadera).toFixed(2):null;if(!r||!t)return a.jsx(O,{});const A=[t.nombre,t.apellido].filter(Boolean).join(" "),M=e?new Date(e.fecha+"T12:00:00").toLocaleDateString("es-AR",{day:"numeric",month:"long",year:"numeric"}):null;return a.jsxs("div",{className:"adash",children:[a.jsxs("div",{className:"adash__header",children:[a.jsx("h1",{className:"adash__patient-name",children:A}),a.jsxs("p",{className:"adash__patient-meta",children:[M?`Última consulta: ${M}`:"Sin consultas registradas",t.objetivo?` · ${L[t.objetivo]??t.objetivo}`:""]})]}),a.jsx("p",{className:"adash__section-label",children:"Análisis clínico"}),a.jsxs("div",{className:"adash__grid",children:[a.jsxs("div",{className:"adash__left",children:[a.jsxs("div",{className:"adash__chart-card",children:[a.jsx("p",{className:"adash__chart-title",children:"Composición corporal"}),a.jsx(k,{segments:f?w:[{value:1,color:"var(--color-border)",label:""}],size:164,holeRatio:.58,centerValue:f&&i>0?`${i.toFixed(0)}%`:null,centerLabel:f?"Grasa":"Sin datos"}),f&&a.jsx("div",{className:"adash-legend",children:w.filter(s=>s.value>.5).map(s=>a.jsxs("div",{className:"adash-legend__item",children:[a.jsx("div",{className:"adash-legend__dot",style:{background:s.color}}),a.jsxs("span",{children:[s.label,s.label!=="Resto"?` ${s.value.toFixed(1)}%`:""]})]},s.label))})]}),a.jsxs("div",{className:"adash__chart-card",children:[a.jsx("p",{className:"adash__chart-title",children:"Distribución del plan alimentario"}),a.jsx(k,{segments:b?N:[{value:1,color:"var(--color-border)",label:""}],size:164,holeRatio:.58,centerValue:b?`$${Math.round(C).toLocaleString("es-AR")}`:null,centerLabel:b?"Plan diario":"Sin plan"}),b&&a.jsx("div",{className:"adash-legend",children:N.map(s=>a.jsxs("div",{className:"adash-legend__item",children:[a.jsx("div",{className:"adash-legend__dot",style:{background:s.color}}),a.jsx("span",{children:s.label})]},s.label))})]})]}),a.jsxs("div",{className:"adash__right",children:[a.jsx(u,{label:"Peso actual",value:(e==null?void 0:e.peso)!=null?e.peso.toFixed(1):null,unit:"kg"}),a.jsx(u,{label:"IMC",value:m!=null?m.toFixed(1):null,unit:"kg/m²",badge:n==null?void 0:n.label,badgeColor:n==null?void 0:n.color}),a.jsx(u,{label:"Masa grasa",value:(e==null?void 0:e.masaGrasa)!=null?e.masaGrasa.toFixed(1):null,unit:"%"}),a.jsx(u,{label:"Masa muscular",value:(e==null?void 0:e.masaMuscular)!=null?e.masaMuscular.toFixed(1):null,unit:"%"}),a.jsx(u,{label:"Agua corporal",value:(e==null?void 0:e.aguaCorporal)!=null?e.aguaCorporal.toFixed(1):null,unit:"%"}),a.jsx(u,{label:"Relación cintura / cadera",value:E}),a.jsx(u,{label:"Glucosa en sangre",value:(e==null?void 0:e.glucosa)!=null?e.glucosa:null,unit:"mg/dL"}),a.jsx(u,{label:"Presión arterial",value:(e==null?void 0:e.presionArterial)??null})]})]}),a.jsx("p",{className:"adash__section-label",children:"Presupuesto alimentario"}),a.jsxs("div",{className:"adash__cost",children:[a.jsxs("div",{children:[a.jsx("p",{className:"adash__cost__header",children:"Costo estimado del plan — Posadas, Misiones"}),a.jsxs("div",{className:"adash__cost__grid",children:[a.jsxs("div",{className:"adash__cost__item",children:[a.jsx("span",{className:"adash__cost__item-label",children:"Por día"}),a.jsx("span",{className:"adash__cost__amount",children:_.costoDiario>0?`$${_.costoDiario.toLocaleString("es-AR",{maximumFractionDigits:0})}`:"—"})]}),a.jsxs("div",{className:"adash__cost__item",children:[a.jsx("span",{className:"adash__cost__item-label",children:"Proyección mensual"}),a.jsx("span",{className:"adash__cost__amount",children:_.costoMensual>0?`$${_.costoMensual.toLocaleString("es-AR",{maximumFractionDigits:0})}`:"—"})]})]}),a.jsx("p",{className:"adash__cost__provenance",children:"Precios de referencia: Hipermercado Libertad y Mercado Central de Misiones"})]}),_.costoDiario>0&&a.jsx("div",{className:"adash__cost__desglose","aria-label":"Desglose por comida",children:["desayuno","almuerzo","merienda","cena"].filter(s=>_.desglose[s]>0).map(s=>a.jsxs("div",{className:"adash__cost__desglose-item",children:[a.jsxs("div",{className:"adash__cost__desglose-name",children:[a.jsx("div",{className:"adash__cost__desglose-dot",style:{background:S[s]},"aria-hidden":"true"}),a.jsx("span",{style:{textTransform:"capitalize"},children:s})]}),a.jsxs("span",{className:"adash__cost__desglose-val",children:["$",_.desglose[s].toLocaleString("es-AR",{maximumFractionDigits:0})]})]},s))}),_.costoDiario===0&&a.jsx("span",{style:{fontSize:"var(--text-sm)",color:"var(--texto-suave)",fontStyle:"italic",fontWeight:400},children:"Cargá un plan alimentario para estimar el costo"})]})]})}function O(){return a.jsxs("div",{className:"adash__empty",role:"status","aria-live":"polite",children:[a.jsx("div",{className:"adash__empty__orb","aria-hidden":"true"}),a.jsx("p",{className:"adash__empty__title",children:"Seleccioná un paciente"}),a.jsx("p",{className:"adash__empty__text",children:"Accedé a la sección Pacientes, elegí un paciente de la lista y regresá aquí para ver su análisis clínico completo con composición corporal, métricas y estimación de costos del plan alimentario."})]})}export{q as default};
