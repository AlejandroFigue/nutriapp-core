import{r as i,j as e,l as C,d as h}from"./index-D4__-TOU.js";import{c as f,P}from"./plus-CGzsNtvU.js";/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const M=[["path",{d:"M12 6.528V3a1 1 0 0 1 1-1h0",key:"11qiee"}],["path",{d:"M18.237 21A15 15 0 0 0 22 11a6 6 0 0 0-10-4.472A6 6 0 0 0 2 11a15.1 15.1 0 0 0 3.763 10 3 3 0 0 0 3.648.648 5.5 5.5 0 0 1 5.178 0A3 3 0 0 0 18.237 21",key:"110c12"}]],g=f("apple",M);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const T=[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]],b=f("calendar",T);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const F=[["path",{d:"M21 10.656V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.344",key:"2acyp4"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]],_=f("square-check-big",F),w=n=>n.toISOString().split("T")[0];function I(n){const s=new Date,t=new Date(s);return n==="weekly"?t.setDate(t.getDate()+6):n==="monthly"&&t.setDate(t.getDate()+29),{start:w(s),end:w(t)}}function j(n){const[s,t,o]=n.split("-").map(Number);return new Date(s,t-1,o).toLocaleDateString("es-AR",{weekday:"short",day:"numeric",month:"short"})}function x(n){return(n||"?").split(" ").slice(0,2).map(s=>s[0]??"").join("").toUpperCase()||"?"}function L(n,s,t){const o=i.useMemo(()=>C(n),s),c=i.useRef(t);return i.useSyncExternalStore(a=>{const d=o.subscribe({next:p=>{c.current=p,a()},error:()=>a()});return()=>d.unsubscribe()},()=>c.current,()=>t)}let y=!1;function R(){if(y)return;y=!0;const n=document.createElement("style");n.dataset.id="home-dashboard",n.textContent=Y,document.head.appendChild(n)}const $=[{key:"daily",label:"Hoy"},{key:"weekly",label:"Semana"},{key:"monthly",label:"Mes"}],B={turnos:[],tareas:[],planes:[]};function V({onNewPatient:n}){i.useEffect(()=>{R()},[]);const[s,t]=i.useState("daily"),o=L(async()=>{var v;const{start:a,end:d}=I(s),[p,N,k,z]=await Promise.all([h.pacientes.toArray(),h.turnos.where("fecha").between(a,d,!0,!0).toArray(),h.planes.where("fecha").between(a,d,!0,!0).toArray(),((v=h.clinicalSuggestions)==null?void 0:v.where("status").equals("pending").toArray())??[]]),S=new Map(p.map(r=>[r.id,r.nombre])),m=r=>S.get(r)??"Paciente",A=N.filter(r=>r.estado!=="cancelado").sort((r,l)=>r.fecha.localeCompare(l.fecha)||(r.hora??"").localeCompare(l.hora??"")).map(r=>({id:r.id,pacienteNombre:m(r.pacienteId),fecha:r.fecha,hora:r.hora,estado:r.estado})),D=k.sort((r,l)=>r.fecha.localeCompare(l.fecha)).map(r=>({id:r.id,pacienteNombre:m(r.pacienteId),fecha:r.fecha,sincronizado:r.sincronizado})),E=z.map(r=>({id:r.id,pacienteNombre:m(r.pacienteId)}));return{turnos:A,tareas:E,planes:D}},[s],B),c=new Date().toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"});return e.jsxs("section",{className:"hd","aria-label":"Panel de inicio",children:[e.jsxs("div",{className:"hd-header",children:[e.jsxs("div",{children:[e.jsx("h1",{className:"hd-title",children:"Bienvenido/a"}),e.jsx("p",{className:"hd-subtitle",children:c})]}),e.jsxs("button",{className:"hd-btn-new",onClick:n,"aria-label":"Agregar nuevo paciente",children:[e.jsx(P,{size:16,"aria-hidden":"true"}),"Nuevo paciente"]})]}),e.jsx("div",{className:"hd-range",role:"group","aria-label":"Selector de período",children:$.map(({key:a,label:d})=>e.jsx("button",{className:`hd-range__btn${s===a?" hd-range__btn--on":""}`,onClick:()=>t(a),"aria-pressed":s===a,children:d},a))}),e.jsxs("div",{className:"hd-grid",children:[e.jsxs("article",{className:"hd-card",children:[e.jsxs("header",{className:"hd-card__head",children:[e.jsx("span",{className:"hd-card__icon hd-card__icon--cal","aria-hidden":"true",children:e.jsx(b,{size:18})}),e.jsx("span",{className:"hd-card__label",children:"Próximos Turnos"}),e.jsx("span",{className:"hd-badge","aria-label":`${o.turnos.length} turnos`,children:o.turnos.length})]}),e.jsx("div",{className:"hd-card__body",children:o.turnos.length===0?e.jsx(u,{icon:e.jsx(b,{size:28}),text:"Sin turnos en este período"}):o.turnos.map(a=>e.jsxs("div",{className:"hd-item",children:[e.jsx("span",{className:"hd-avatar","aria-hidden":"true",children:x(a.pacienteNombre)}),e.jsxs("div",{className:"hd-item__info",children:[e.jsx("p",{className:"hd-item__name",children:a.pacienteNombre}),e.jsxs("p",{className:"hd-item__meta",children:[j(a.fecha),a.hora?` · ${a.hora}`:""]})]}),e.jsx("span",{className:`hd-pill hd-pill--${a.estado==="confirmado"?"conf":"pend"}`,children:a.estado})]},a.id))})]}),e.jsxs("article",{className:"hd-card",children:[e.jsxs("header",{className:"hd-card__head",children:[e.jsx("span",{className:"hd-card__icon hd-card__icon--check","aria-hidden":"true",children:e.jsx(_,{size:18})}),e.jsx("span",{className:"hd-card__label",children:"Trabajos Pendientes"}),e.jsx("span",{className:"hd-badge",children:o.tareas.length})]}),e.jsx("div",{className:"hd-card__body",children:o.tareas.length===0?e.jsx(u,{icon:e.jsx(_,{size:28}),text:"Sin tareas clínicas pendientes"}):o.tareas.map(a=>e.jsxs("div",{className:"hd-item",children:[e.jsx("span",{className:"hd-avatar","aria-hidden":"true",children:x(a.pacienteNombre)}),e.jsxs("div",{className:"hd-item__info",children:[e.jsx("p",{className:"hd-item__name",children:a.pacienteNombre}),e.jsx("p",{className:"hd-item__meta",children:"Sugerencia clínica pendiente"})]}),e.jsx("span",{className:"hd-pill hd-pill--pend",children:"Pendiente"})]},a.id))})]}),e.jsxs("article",{className:"hd-card",children:[e.jsxs("header",{className:"hd-card__head",children:[e.jsx("span",{className:"hd-card__icon hd-card__icon--apple","aria-hidden":"true",children:e.jsx(g,{size:18})}),e.jsx("span",{className:"hd-card__label",children:"Planes Alimentarios"}),e.jsx("span",{className:"hd-badge",children:o.planes.length})]}),e.jsx("div",{className:"hd-card__body",children:o.planes.length===0?e.jsx(u,{icon:e.jsx(g,{size:28}),text:"Sin planes en este período"}):o.planes.map(a=>e.jsxs("div",{className:"hd-item",children:[e.jsx("span",{className:"hd-avatar","aria-hidden":"true",children:x(a.pacienteNombre)}),e.jsxs("div",{className:"hd-item__info",children:[e.jsx("p",{className:"hd-item__name",children:a.pacienteNombre}),e.jsx("p",{className:"hd-item__meta",children:j(a.fecha)})]}),e.jsx("span",{className:`hd-pill ${a.sincronizado?"hd-pill--conf":"hd-pill--new"}`,children:a.sincronizado?"Guardado":"En curso"})]},a.id))})]})]})]})}function u({icon:n,text:s}){return e.jsxs("div",{className:"hd-empty",role:"status","aria-live":"polite",children:[e.jsx("span",{className:"hd-empty__icon","aria-hidden":"true",children:n}),e.jsx("p",{className:"hd-empty__txt",children:s})]})}const Y=`
@keyframes hd-in {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

.hd {
  max-width: 1100px;
  margin-inline: auto;
  padding: var(--space-6) var(--space-4) calc(var(--space-16) + var(--space-6));
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  animation: hd-in var(--transition-normal) both;
}

/* ── Header ── */
.hd-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-4);
}
.hd-title {
  font-size: var(--text-2xl);
  font-weight: 800;
  color: var(--color-text-high);
  line-height: 1.2;
}
.hd-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-mid);
  margin-top: var(--space-1);
  text-transform: capitalize;
}

/* ── Botón nuevo paciente ── */
.hd-btn-new {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 10px var(--space-5);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, var(--color-durazno-deep) 0%, var(--color-durazno-dark) 100%);
  box-shadow: 0 4px 14px rgba(232, 149, 106, 0.36);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
  outline-offset: 3px;
  flex-shrink: 0;
  white-space: nowrap;
  border: none;
  cursor: pointer;
}
.hd-btn-new:hover,
.hd-btn-new:focus-visible {
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 7px 20px rgba(232, 149, 106, 0.46);
}
.hd-btn-new:active { transform: scale(0.97); }

/* ── Selector de período ── */
.hd-range {
  display: flex;
  gap: 3px;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  padding: 3px;
  align-self: flex-start;
}
.hd-range__btn {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-mid);
  transition: color var(--transition-fast), background var(--transition-fast), box-shadow var(--transition-fast);
  outline-offset: 2px;
  white-space: nowrap;
  border: none;
  cursor: pointer;
  background: none;
}
.hd-range__btn--on {
  color: #fff;
  background: linear-gradient(135deg, var(--color-durazno-deep) 0%, var(--color-durazno-dark) 100%);
  box-shadow: var(--shadow-sm);
}
.hd-range__btn:not(.hd-range__btn--on):hover,
.hd-range__btn:not(.hd-range__btn--on):focus-visible {
  color: var(--color-text-high);
  background: var(--color-divider);
}

/* ── Cuadrícula ── */
.hd-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-5);
}
@media (min-width: 600px) { .hd-grid { grid-template-columns: 1fr 1fr; } }
@media (min-width: 900px) { .hd-grid { grid-template-columns: repeat(3, 1fr); } }

/* ── Tarjeta ── */
.hd-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: box-shadow var(--transition-normal), transform var(--transition-normal);
}
.hd-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
.hd-card__head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-5);
  border-bottom: 1px solid var(--color-divider);
}
.hd-card__icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.hd-card__icon--cal   { background: #EEF2FF; color: #4F6FDE; }
.hd-card__icon--check { background: #FFF7ED; color: var(--color-warning); }
.hd-card__icon--apple { background: var(--color-verde); color: var(--color-verde-dark); }
.dark .hd-card__icon--cal   { background: #1B243C; color: #7B96F0; }
.dark .hd-card__icon--check { background: #291C09; color: var(--color-warning); }
.dark .hd-card__icon--apple { background: var(--color-verde); color: var(--color-verde-deep); }
.hd-card__label {
  flex: 1;
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--color-text-high);
  line-height: 1.2;
}
.hd-badge {
  font-size: var(--text-xs);
  font-weight: 700;
  padding: 2px 9px;
  border-radius: var(--radius-full);
  background: var(--color-primary-surface);
  color: var(--color-primary);
  min-width: 26px;
  text-align: center;
}
.hd-card__body { flex: 1; overflow-y: auto; }

/* ── Ítems de lista ── */
.hd-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-5);
  border-bottom: 1px solid var(--color-divider);
  transition: background var(--transition-fast);
}
.hd-item:last-child { border-bottom: none; }
.hd-item:hover { background: var(--color-surface-raised); }

.hd-avatar {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--color-durazno) 0%, var(--color-durazno-deep) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
  letter-spacing: 0.04em;
}
.hd-item__info { flex: 1; min-width: 0; }
.hd-item__name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-high);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hd-item__meta {
  font-size: var(--text-xs);
  color: var(--color-text-mid);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}

/* ── Píldoras de estado ── */
.hd-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
  white-space: nowrap;
}
.hd-pill--pend { background: var(--color-warning-surface); color: var(--color-warning); }
.hd-pill--conf { background: var(--color-verde);           color: var(--color-verde-dark); }
.hd-pill--new  { background: var(--color-primary-surface); color: var(--color-primary); }

/* ── Estado vacío ── */
.hd-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-10) var(--space-4);
  color: var(--color-text-low);
}
.hd-empty__icon { opacity: 0.3; }
.hd-empty__txt  { font-size: var(--text-sm); text-align: center; line-height: 1.5; }
`;export{V as default};
