import{u as re,r as _,j as e,L as q,d as S}from"./index-FDgCwTGM.js";import{c as ae}from"./costos-V0IoYBoe.js";import{G as te}from"./PlanAlimentario-BGkC80Cq.js";const b={titulo:"Lic.",nombre:"Nombre",apellido:"Apellido",matricula:"M.N. 00000"},P="nutriapp-reporte-css-v2",J="nutriapp-quicksand",se=["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"],Y=(a="")=>a.replace(/\b\w/g,n=>n.toUpperCase());function y(a){return a?new Date(a.length===10?`${a}T12:00:00`:a).toLocaleDateString("es-AR",{day:"numeric",month:"short",year:"numeric"}):"—"}function ne(a=new Date){return a.toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}function ie(a=new Date){const n=String(a.getDate()).padStart(2,"0"),i=String(a.getMonth()+1).padStart(2,"0");return`${n}/${i}/${a.getFullYear()}`}function oe(){const a=new Date,n=String(a.getMonth()+1).padStart(2,"0"),i=String(a.getDate()).padStart(2,"0");return`NRP-${a.getFullYear()}${n}-${i}${String(a.getHours()).padStart(2,"0")}`}function le(a){if(!a)return null;const n=new Date(a+"T12:00:00"),i=new Date;let h=i.getFullYear()-n.getFullYear();const p=i.getMonth()-n.getMonth();return(p<0||p===0&&i.getDate()<n.getDate())&&h--,h}function ce(){const a=new Date,n=a.getDay(),i=new Date(a);return i.setDate(a.getDate()-(n===0?6:n-1)),i.setHours(0,0,0,0),Array.from({length:7},(h,p)=>{const o=new Date(i);return o.setDate(i.getDate()+p),o.toISOString().slice(0,10)})}function de(a){if(!a)return"—";if(a.tablaRP)try{const h=JSON.parse(a.tablaRP).filter(o=>{var m;return(m=o.alimento)==null?void 0:m.trim()});if(!h.length)return"—";const p=h.slice(0,4).map(o=>o.alimento.trim()).join(", ");return h.length>4?p+"…":p}catch{}const n=[a.desayuno,a.almuerzo,a.merienda,a.cena].filter(Boolean).filter(i=>i.trim());return n.length?`${n.length} comidas registradas`:"—"}const Q=[{max:18.5,label:"Bajo peso",cls:"bajo"},{max:25,label:"Peso normal",cls:"normal"},{max:30,label:"Sobrepeso",cls:"sobrepeso"},{max:35,label:"Obesidad I",cls:"obesidad"},{max:40,label:"Obesidad II",cls:"obesidad"},{max:1/0,label:"Obesidad III",cls:"obesidad"}];function U(a){return!a||a<=0?{label:"Sin dato",cls:"normal"}:Q.find(n=>a<n.max)??Q.at(-1)}const pe={bajar:"Reducción de peso",mantener:"Mantenimiento",subir:"Aumento de peso",musculo:"Ganancia muscular",salud:"Salud general"},me=`
  .rp-quicksand {
    font-family: 'Quicksand', 'Plus Jakarta Sans', system-ui, sans-serif;
  }

  /* Secciones de color */
  .rp-section--durazno {
    background: linear-gradient(180deg, var(--color-durazno, #FFE4D0) 0%, #FFF5EF 75%, #FFFFFF 100%) !important;
  }
  .rp-section--verde {
    background: linear-gradient(180deg, var(--color-verde, #D9EDD0) 0%, #F2F9EE 70%, #FFFFFF 100%) !important;
  }
  .rp-section--amarillo {
    background: linear-gradient(180deg, var(--color-amarillo, #FFF3BF) 0%, #FFFDF5 60%, #FFFFFF 100%) !important;
  }

  /* Saltos de página */
  .rp-print-page { break-after: always; page-break-after: always; }
  .rp-print-page:last-child { break-after: auto; page-break-after: auto; }

  .rp-page-title {
    padding: 20px 32px 14px;
    border-bottom: 1px solid #F0EAE2;
  }
  .rp-page-title__heading {
    font-size: 1.25rem; font-weight: 700;
    color: var(--color-durazno-dark, #C87040);
    letter-spacing: -0.02em; line-height: 1.2;
    font-family: 'Quicksand', 'Plus Jakarta Sans', Georgia, serif;
  }
  .rp-page-title__sub {
    font-size: 0.8125rem; color: #757575; margin-top: 4px; line-height: 1.55;
  }

  /* ── Tabla R/P ─────────────────────────────────────────────────────────── */
  .rp-rp-table-wrap { overflow-x: auto; padding: 0 32px 20px; }
  .rp-rp-table {
    width: 100%; border-collapse: collapse;
    font-size: 0.8125rem;
  }
  .rp-rp-table thead tr {
    background: var(--color-primary, #2E7D32); color: #fff;
  }
  .rp-rp-table th {
    padding: 8px 10px;
    font-size: 9px; font-weight: 800; letter-spacing: .09em;
    text-transform: uppercase; text-align: left;
  }
  .rp-rp-table th.rp-th--alimento { width: 28%; }
  .rp-rp-table th.rp-th--caract   { width: 47%; }
  .rp-rp-table th.rp-th--cant     { width: 16%; }
  .rp-rp-table th.rp-th--precio   { width: 9%; text-align: right; }

  .rp-rp-group td {
    padding: 5px 10px;
    font-size: 10px; font-weight: 800; letter-spacing: .04em;
    color: var(--color-text-high, #1A1A1A);
    border-top: 1px solid rgba(0,0,0,.07);
    border-bottom: 1px solid rgba(0,0,0,.07);
  }
  .rp-rp-item td {
    padding: 5px 10px;
    border-bottom: 1px solid #F0F0F0;
    vertical-align: top; color: #333;
    line-height: 1.45;
  }
  .rp-rp-item td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
  .rp-rp-item--alt td { background: rgba(0,0,0,.018); }

  /* Precio — oculto en impresión */
  .rp-precio { color: #C87040; font-weight: 600; font-size: 0.75rem; }

  /* ── Menú semanal ──────────────────────────────────────────────────────── */
  .rp-menu-section { padding: 0 32px 20px; }
  .rp-menu-table {
    width: 100%; border-collapse: collapse; font-size: 0.8rem;
  }
  .rp-menu-table th {
    background: var(--color-primary, #2E7D32); color: #fff;
    padding: 7px 10px; font-size: 9px; font-weight: 800;
    letter-spacing: .08em; text-transform: uppercase; text-align: left;
  }
  .rp-menu-table td {
    padding: 7px 10px;
    border-bottom: 1px solid #F0EAE2;
    vertical-align: top; line-height: 1.5;
  }
  .rp-menu-table tr:nth-child(even) td { background: #FAFAF8; }
  .rp-menu-dia { font-weight: 700; color: var(--color-primary, #2E7D32); display: block; }
  .rp-menu-fecha { font-size: 0.7rem; color: #9E9E9E; display: block; }
  .rp-menu-vacio { color: #BDBDBD; font-style: italic; }

  /* ── Registros y Controles ─────────────────────────────────────────────── */
  .rp-reg-section { padding: 0 32px 24px; }

  /* ── Notas clínicas ────────────────────────────────────────────────────── */
  .rp-notas-box {
    background: #FAFAF8; border: 1px solid #EEE8E2;
    border-radius: 8px; padding: 14px 16px;
    font-size: 0.8125rem; line-height: 1.75; color: #424242;
    white-space: pre-wrap; word-break: break-word;
  }

  /* ── Presupuesto ───────────────────────────────────────────────────────── */
  .rp-budget-box {
    background: rgba(255,255,255,.75);
    border: 2px solid var(--color-amarillo-deep, #E8C870);
    border-radius: 12px; padding: 20px 28px;
    display: flex; flex-direction: column; align-items: center; gap: 10px;
    box-shadow: 0 4px 20px rgba(232,200,112,.22);
    max-width: 420px; margin: 0 auto var(--space-4, 16px);
  }
  .rp-budget-box__label { font-size: 0.67rem; font-weight: 800; text-transform: uppercase; letter-spacing: .12em; color: var(--color-durazno-dark, #C87040); }
  .rp-budget-box__total { font-size: 2rem; font-weight: 800; color: var(--color-durazno-dark, #C87040); font-variant-numeric: tabular-nums; letter-spacing: -0.03em; font-family: 'Quicksand', system-ui, sans-serif; }
  .rp-budget-box__daily { font-size: 0.8125rem; color: #757575; font-style: italic; }
  .rp-budget-note { background: rgba(255,255,255,.55); border: 1px solid var(--color-amarillo-deep, #E8C870); border-radius: 6px; padding: 8px 14px; font-size: 0.72rem; color: #6D5F40; line-height: 1.65; text-align: center; margin: 0 32px; }

  /* ── Pie de página ─────────────────────────────────────────────────────── */
  .rp-footer {
    padding: 12px 32px 16px;
    background: #FDFAF8; margin-top: 20px;
    position: relative;
  }
  .rp-footer::before {
    content: ''; position: absolute; top: 0; left: 32px; right: 32px; height: 1.5px;
    background: linear-gradient(90deg, var(--color-durazno-dark, #C87040) 0%, var(--color-durazno, #FFB87A) 55%, transparent 100%);
    border-radius: 1px;
  }
  .rp-footer__row {
    display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;
  }
  .rp-footer__profesional { display: flex; flex-direction: column; gap: 2px; }
  .rp-footer__nombre { font-size: 0.75rem; font-weight: 700; color: var(--color-durazno-dark, #C87040); letter-spacing: 0.01em; }
  .rp-footer__mn { font-size: 0.67rem; color: #757575; letter-spacing: 0.07em; text-transform: uppercase; font-weight: 600; }
  .rp-footer__derecha { text-align: right; display: flex; flex-direction: column; gap: 3px; }
  .rp-footer__fecha { font-size: 0.72rem; font-weight: 700; color: #424242; letter-spacing: 0.04em; font-variant-numeric: tabular-nums; }
  .rp-footer__conf { font-size: 0.67rem; color: #9E9E9E; letter-spacing: 0.03em; font-style: italic; }

  /* ── Overrides de impresión ─────────────────────────────────────────────── */
  @media print {
    .reporte-doc {
      position: static  !important;
      inset:    auto    !important;
      overflow: visible !important;
      padding:  0       !important;
    }
    .rp-print-page { break-after: always !important; page-break-after: always !important; }
    .rp-print-page:last-child { break-after: auto !important; page-break-after: auto !important; }
    .rp-footer { break-inside: avoid !important; page-break-inside: avoid !important; }
    .rp-budget-box, .rp-budget-note { break-inside: avoid !important; page-break-inside: avoid !important; }

    /* ─── REGLA ESTRICTA: ocultar todos los precios ─────────────────────── */
    .rp-precio,
    .rp-th--precio,
    .rp-costo-col,
    .rp-budget-box,
    .rp-budget-note { display: none !important; }

    .rp-page-title { padding-inline: 10mm !important; }
    .rp-rp-table-wrap, .rp-menu-section, .rp-reg-section { padding-inline: 10mm !important; }
  }
`;function be(){var B;const a=re(r=>r.pacienteId),[n,i]=_.useState(null),[h,p]=_.useState(!1),[o,m]=_.useState(!1),g=_.useRef(oe()),j=ne(),v=ie();_.useEffect(()=>{if(!document.getElementById(J)){const r=document.createElement("link");r.id=J,r.rel="stylesheet",r.href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap",document.head.appendChild(r)}if(!document.getElementById(P)){const r=document.createElement("style");r.id=P,r.textContent=me,document.head.appendChild(r)}return()=>{var r;(r=document.getElementById(P))==null||r.remove()}},[]),_.useEffect(()=>{if(!a){i(null);return}let r=!1;p(!0);async function u(){try{const[d,x,T,X]=await Promise.all([S.pacientes.get(a),S.historias.where("pacienteId").equals(a).sortBy("fecha"),S.planes.where("pacienteId").equals(a).toArray(),S.productos.toArray()]);if(r)return;const O=[...x].reverse(),Z=O[0]??null,H=[...T].sort((E,A)=>(A.fecha??"").localeCompare(E.fecha??""))[0]??null,G=ce(),ee=G.map(E=>T.find(A=>A.fecha===E)??null);i({paciente:d,historias:O,ultimaHistoria:Z,ultimoPlan:H,productos:X,diasSemana:G,plansSemana:ee})}catch(d){console.error("[ExportarReporte]",d),r||i(null)}finally{r||p(!1)}}return u(),()=>{r=!0}},[a]);const k=_.useCallback(()=>{m(!0),setTimeout(()=>{window.print(),m(!1)},260)},[]);if(!a)return e.jsx("div",{className:"reporte-wrapper",children:e.jsxs("div",{className:"reporte-no-patient",role:"status","aria-live":"polite",children:[e.jsx("div",{className:"reporte-no-patient__orb","aria-hidden":"true"}),e.jsx("p",{className:"reporte-no-patient__title",children:"Ningún paciente seleccionado"}),e.jsxs("p",{className:"reporte-no-patient__text",children:["Seleccioná un paciente en la pestaña ",e.jsx("strong",{children:"Pacientes"})," para generar su prescripción dietética imprimible."]}),e.jsx(q,{to:"/pacientes",className:"reporte-no-patient__cta",children:"Ir a Pacientes"})]})});if(h||n===null)return e.jsxs("div",{className:"reporte-loading",role:"status","aria-live":"polite",children:[e.jsx("span",{className:"loading-screen","aria-hidden":"true",style:{width:28,height:28,minHeight:"unset"}}),"Preparando reporte…"]});const{paciente:s,historias:c,ultimaHistoria:t,ultimoPlan:l,productos:F,diasSemana:W,plansSemana:V}=n,N=[s==null?void 0:s.nombre,s==null?void 0:s.apellido].filter(Boolean).join(" ")||"Paciente sin nombre",R=le(s==null?void 0:s.fechaNacimiento),I=U(t==null?void 0:t.imc),{costoDiario:w,costoMensual:K}=l&&(F!=null&&F.length)?ae(l,F):{costoDiario:0,costoMensual:0},z=(()=>{if(!(l!=null&&l.tablaRP))return[];try{return JSON.parse(l.tablaRP)}catch{return[]}})(),$=(l==null?void 0:l.indicacionesIniciales)??(l==null?void 0:l.indicaciones)??"",L=[{tipo:"IMC",val:(t==null?void 0:t.imc)!=null?Number(t.imc).toFixed(1):null,unidad:"",esIMC:!0},{tipo:"Peso",val:(t==null?void 0:t.peso)!=null?t.peso:null,unidad:"kg"},{tipo:"Talla",val:(t==null?void 0:t.altura)!=null?`${t.altura}`:null,unidad:"cm"},{tipo:"Masa Grasa",val:(t==null?void 0:t.masaGrasa)!=null?t.masaGrasa:null,unidad:"%"},{tipo:"Masa Muscular",val:(t==null?void 0:t.masaMuscular)!=null?t.masaMuscular:null,unidad:"kg"},{tipo:"Cintura",val:(t==null?void 0:t.cintura)!=null?t.cintura:null,unidad:"cm"},{tipo:"Cadera",val:(t==null?void 0:t.cadera)!=null?t.cadera:null,unidad:"cm"},{tipo:"Agua Corporal",val:(t==null?void 0:t.aguaCorporal)!=null?t.aguaCorporal:null,unidad:"%"}].filter(r=>r.val!==null),C=(()=>{if(c.length<2)return null;const r=(c[0].imc??0)-(c[1].imc??0);return Math.abs(r)<.1?{dir:"stable",label:"Estable"}:r<0?{dir:"down",label:`↓ ${Math.abs(r).toFixed(1)} pts`}:{dir:"up",label:`↑ ${Math.abs(r).toFixed(1)} pts`}})(),D=r=>r.toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2});return e.jsxs("div",{className:"reporte-wrapper",children:[e.jsxs("div",{className:"reporte-actions",children:[e.jsx(q,{to:"/pacientes",className:"reporte-back-btn",children:"← Cambiar paciente"}),e.jsx("button",{className:"reporte-print-btn",onClick:k,disabled:o,type:"button",children:o?"Preparando…":e.jsxs(e.Fragment,{children:[e.jsx(ue,{"aria-hidden":"true"})," Imprimir · Guardar PDF"]})})]}),e.jsxs("div",{className:"reporte-doc",id:"reporte-documento",children:[e.jsxs("header",{className:"reporte-letterhead",children:[e.jsxs("div",{className:"reporte-letterhead__brand",children:[e.jsx("div",{className:"reporte-letterhead__logo","aria-hidden":"true",children:"NP"}),e.jsxs("div",{children:[e.jsxs("p",{className:"reporte-letterhead__title rp-quicksand",children:[b.titulo," ",b.nombre," ",b.apellido]}),e.jsxs("p",{className:"reporte-letterhead__subtitle",children:[b.matricula," · Licenciada en Nutrición · NutriApp Profesional"]})]})]}),e.jsxs("div",{className:"reporte-letterhead__meta",children:[e.jsx("p",{className:"reporte-letterhead__date",style:{textTransform:"capitalize"},children:j}),e.jsx("p",{className:"reporte-letterhead__ref",children:g.current})]})]}),e.jsx("div",{className:"reporte-rule","aria-hidden":"true"}),e.jsxs("div",{className:"rp-print-page",children:[e.jsxs("div",{className:"rp-page-title reporte-title-section",children:[e.jsx("h1",{className:"reporte-main-title rp-quicksand",children:"Prescripción Dietética del Paciente"}),e.jsxs("p",{className:"reporte-main-subtitle",children:["Datos clínicos, objetivo y prescripción inicial de"," ",e.jsx("strong",{children:N})," · ",j]})]}),e.jsxs("section",{className:"reporte-section rp-section--durazno","aria-label":"Datos del paciente",children:[e.jsxs("h2",{className:"reporte-section__title",children:[e.jsx("span",{className:"reporte-section__num",children:"01"}),"Datos del Paciente"]}),e.jsxs("div",{className:"reporte-patient-grid",children:[e.jsxs("div",{className:"reporte-patient-col",children:[e.jsx(f,{label:"Nombre completo",value:N}),e.jsx(f,{label:"Edad",value:R!=null?`${R} años`:s!=null&&s.fechaNacimiento?y(s.fechaNacimiento):null}),e.jsx(f,{label:"Sexo biológico",value:s!=null&&s.genero?Y(s.genero.replace(/-/g," ")):null}),e.jsx(f,{label:"Objetivo clínico",value:s!=null&&s.objetivo?pe[s.objetivo]??Y(s.objetivo):null})]}),e.jsxs("div",{className:"reporte-patient-col",children:[e.jsx(f,{label:"Correo electrónico",value:s==null?void 0:s.email}),e.jsx(f,{label:"Teléfono",value:s==null?void 0:s.telefono}),e.jsx(f,{label:"Fecha de ingreso",value:s!=null&&s.creadoEn?y(s.creadoEn):null}),e.jsx(f,{label:"Última consulta",value:t!=null&&t.fecha?y(t.fecha):null})]})]}),L.length>0&&e.jsx("div",{className:"reporte-mediciones",style:{marginTop:"var(--space-3)"},children:L.map(r=>e.jsxs("div",{className:`reporte-medicion-card${r.esIMC?" reporte-medicion-card--imc":""}`,children:[e.jsx("span",{className:"reporte-medicion-card__tipo",children:r.tipo}),e.jsxs("span",{className:"reporte-medicion-card__valor",children:[r.val,r.unidad&&e.jsxs("span",{className:"reporte-medicion-card__unidad",children:[" ",r.unidad]})]}),r.esIMC&&e.jsx("span",{className:`reporte-imc-badge reporte-imc-badge--${I.cls}`,children:I.label}),C&&r.esIMC&&e.jsx("span",{className:`reporte-imc-trend reporte-imc-trend--${C.dir}`,children:C.label})]},r.tipo))})]}),e.jsxs("section",{className:"reporte-section rp-section--verde","aria-label":"Indicaciones iniciales del plan",children:[e.jsxs("h2",{className:"reporte-section__title",children:[e.jsx("span",{className:"reporte-section__num",children:"02"}),"Indicaciones Iniciales"]}),$.trim()?e.jsx("div",{className:"rp-notas-box",children:$.trim()}):e.jsxs("p",{className:"reporte-empty",children:["Sin indicaciones iniciales registradas. Creá la prescripción desde la pestaña ",e.jsx("strong",{children:"Planes"}),"."]})]}),e.jsx(M,{nombreCompleto:N,fechaCorta:v})]}),e.jsxs("div",{className:"rp-print-page",children:[e.jsxs("div",{className:"rp-page-title reporte-title-section",children:[e.jsx("h1",{className:"reporte-main-title rp-quicksand",children:"Tabla R/P — Prescripción Alimentaria"}),e.jsxs("p",{className:"reporte-main-subtitle",children:["Prescripción nutricional vigente para ",e.jsx("strong",{children:N}),(l==null?void 0:l.fecha)&&e.jsxs(e.Fragment,{children:[" · ","Fecha del plan: ",e.jsx("strong",{children:y(l.fecha)})]})]})]}),e.jsxs("section",{className:"reporte-section","aria-label":"Tabla de prescripción alimentaria",style:{background:"linear-gradient(180deg, #FFFAF7 0%, #FFFFFF 100%)"},children:[e.jsxs("h2",{className:"reporte-section__title",children:[e.jsx("span",{className:"reporte-section__num",children:"03"}),"Prescripción Dietética — R/P",e.jsx("span",{style:{marginLeft:8,fontSize:"0.72rem",fontWeight:500,color:"#9E9E9E"},children:"(precios de góndola: visibles solo para el profesional)"})]}),z.length===0?e.jsxs("p",{className:"reporte-empty",style:{padding:"0 32px 20px"},children:["Sin prescripción registrada. Completá la tabla R/P en la pestaña ",e.jsx("strong",{children:"Planes"}),"."]}):e.jsxs("div",{className:"rp-rp-table-wrap",children:[e.jsxs("table",{className:"rp-rp-table",children:[e.jsxs("colgroup",{children:[e.jsx("col",{style:{width:"28%"}}),e.jsx("col",{style:{width:"47%"}}),e.jsx("col",{style:{width:"16%"}}),e.jsx("col",{className:"rp-costo-col",style:{width:"9%"}})]}),e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{className:"rp-th--alimento",children:"Alimentos"}),e.jsx("th",{className:"rp-th--caract",children:"Características"}),e.jsx("th",{className:"rp-th--cant",children:"Cantidades"}),e.jsx("th",{className:"rp-th--precio rp-costo-col",children:"Costo est."})]})}),e.jsx("tbody",{children:te.map(r=>{const u=z.filter(d=>{var x;return d.grupo===r.label&&((x=d.alimento)==null?void 0:x.trim())});return u.length===0?null:e.jsx(he,{grupo:r,rows:u,productos:F},r.id)})})]}),w>0&&e.jsxs("p",{className:"rp-precio",style:{textAlign:"right",padding:"8px 0",fontSize:"0.75rem",fontWeight:700},children:["Costo diario estimado (Posadas): $",D(w)]})]})]}),e.jsx(M,{nombreCompleto:N,fechaCorta:v})]}),e.jsxs("div",{className:"rp-print-page",children:[e.jsxs("div",{className:"rp-page-title reporte-title-section",children:[e.jsx("h1",{className:"reporte-main-title rp-quicksand",children:"Menú Semanal y Seguimiento Clínico"}),e.jsxs("p",{className:"reporte-main-subtitle",children:["Planificación semanal, notas y evolución de ",e.jsx("strong",{children:N})]})]}),e.jsxs("section",{className:"reporte-section","aria-label":"Menú semanal",children:[e.jsxs("h2",{className:"reporte-section__title",children:[e.jsx("span",{className:"reporte-section__num",children:"04"}),"Menú Semanal"]}),e.jsx("div",{className:"rp-menu-section",children:e.jsxs("table",{className:"rp-menu-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{style:{width:"18%"},children:"Día"}),e.jsx("th",{style:{width:"62%"},children:"Alimentos destacados"}),e.jsx("th",{style:{width:"20%"},children:"Estado"})]})}),e.jsx("tbody",{children:se.map((r,u)=>{const d=V[u],x=de(d);return e.jsxs("tr",{children:[e.jsxs("td",{children:[e.jsx("span",{className:"rp-menu-dia",children:r}),e.jsx("span",{className:"rp-menu-fecha",children:W[u]})]}),e.jsx("td",{children:x==="—"?e.jsx("span",{className:"rp-menu-vacio",children:"Sin plan registrado"}):x}),e.jsx("td",{children:d?e.jsx("span",{style:{color:"var(--color-primary, #2E7D32)",fontWeight:700,fontSize:"0.75rem"},children:"Registrado"}):e.jsx("span",{style:{color:"#BDBDBD",fontSize:"0.75rem"},children:"Pendiente"})})]},r)})})]})})]}),e.jsxs("section",{className:"reporte-section","aria-label":"Notas clínicas",children:[e.jsxs("h2",{className:"reporte-section__title",children:[e.jsx("span",{className:"reporte-section__num",children:"05"}),"Notas Clínicas"]}),e.jsx("div",{style:{padding:"0 32px 16px"},children:(B=t==null?void 0:t.notas)!=null&&B.trim()?e.jsxs(e.Fragment,{children:[e.jsxs("p",{className:"reporte-section__desc",style:{marginBottom:8},children:["Notas de consulta del ",e.jsx("strong",{children:y(t.fecha)}),":"]}),e.jsx("div",{className:"rp-notas-box",children:t.notas.trim()})]}):e.jsx("p",{className:"reporte-empty",style:{padding:0},children:"Sin notas clínicas registradas en la última consulta."})})]}),e.jsxs("section",{className:"reporte-section","aria-label":"Registros y controles antropométricos",children:[e.jsxs("h2",{className:"reporte-section__title",children:[e.jsx("span",{className:"reporte-section__num",children:"06"}),"Registros y Controles"]}),e.jsx("div",{className:"rp-reg-section",children:c.length===0?e.jsx("p",{className:"reporte-empty",style:{padding:0},children:"Sin consultas registradas para este paciente."}):e.jsxs(e.Fragment,{children:[e.jsxs("p",{className:"reporte-section__desc",style:{marginBottom:10},children:["Historial de"," ",e.jsxs("strong",{children:[Math.min(c.length,10)," ",c.length===1?"consulta":"consultas"]}),c.length>10&&` (de ${c.length} totales)`," ","en orden descendente."]}),e.jsxs("table",{className:"reporte-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Fecha"}),e.jsx("th",{children:"Peso"}),e.jsx("th",{children:"IMC"}),e.jsx("th",{children:"C.C. (Cintura)"}),e.jsx("th",{children:"Categoría"})]})}),e.jsx("tbody",{children:c.slice(0,10).map((r,u)=>{const d=U(r.imc),x=d.cls==="sobrepeso"||d.cls==="obesidad";return e.jsxs("tr",{className:x?"reporte-evolucion-row--alerta":"reporte-evolucion-row--normal",children:[e.jsxs("td",{children:[e.jsx("strong",{children:y(r.fecha)}),u===0&&e.jsx("span",{className:"reporte-table__detail",children:"Más reciente"})]}),e.jsx("td",{children:r.peso!=null?`${r.peso} kg`:"—"}),e.jsx("td",{children:r.imc!=null?e.jsx("strong",{children:Number(r.imc).toFixed(1)}):"—"}),e.jsx("td",{children:r.cintura!=null?`${r.cintura} cm`:"—"}),e.jsx("td",{children:r.imc!=null?e.jsx("span",{className:`reporte-badge reporte-imc-badge--${d.cls}`,children:d.label}):"—"})]},r.id)})})]}),c.length>10&&e.jsxs("p",{className:"reporte-footnote",children:["Se muestran las 10 consultas más recientes de ",c.length," registros totales."]})]})})]}),w>0&&e.jsxs("section",{className:"reporte-section rp-section--amarillo","aria-label":"Presupuesto alimentario mensual",children:[e.jsxs("h2",{className:"reporte-section__title",children:[e.jsx("span",{className:"reporte-section__num",children:"07"}),"Presupuesto Alimentario Mensual Estimado"]}),e.jsxs("div",{className:"rp-budget-box",role:"region","aria-label":"Total mensual estimado",children:[e.jsx("p",{className:"rp-budget-box__label",children:"Presupuesto Mensual Estimado — Posadas, Misiones"}),e.jsxs("p",{className:"rp-budget-box__total",children:["$",D(K)]}),e.jsxs("p",{className:"rp-budget-box__daily",children:["≈ $",D(w)," por día · calculado sobre 30 días"]})]}),e.jsx("p",{className:"rp-budget-note",children:"Estimación basada en relevamiento de precios de góndola (Hipermercado Libertad/ChangoMás y Mercado Central de Misiones). Los precios no forman parte del informe clínico impreso. Uso orientativo para la economía familiar."})]}),e.jsx(M,{nombreCompleto:N,fechaCorta:v})]})]})]})}function f({label:a,value:n}){const i=n==null||n==="";return e.jsxs("div",{className:"reporte-patient-field",children:[e.jsx("span",{className:"reporte-patient-field__label",children:a}),e.jsx("span",{className:`reporte-patient-field__value${i?" reporte-patient-field__value--empty":""}`,children:i?"—":n})]})}function he({grupo:a,rows:n,productos:i}){const h=o=>o.toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2});function p(o,m){if(!(o!=null&&o.trim())||!(m!=null&&m.trim())||!(i!=null&&i.length))return 0;const g=m.match(/(\d+(?:[.,]\d+)?)\s*(kg|l|g|ml)?/i);if(!g)return 0;let j=parseFloat(g[1].replace(",","."));const v=(g[2]??"g").toLowerCase();if((v==="kg"||v==="l")&&(j*=1e3),!j||isNaN(j))return 0;const k=o.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").trim();let s=null,c=0;for(const t of i??[]){if(!t.precioRef||!t.cantidadRefGramo)continue;const l=t.nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");k.includes(l)&&l.length>c&&(s=t,c=l.length)}return s?s.precioRef/s.cantidadRefGramo*j:0}return e.jsxs(e.Fragment,{children:[e.jsx("tr",{className:"rp-rp-group",children:e.jsxs("td",{colSpan:4,style:{background:a.color},children:[a.emoji," ",a.label]})}),n.map((o,m)=>{const g=p(o.alimento,o.cantidad);return e.jsxs("tr",{className:`rp-rp-item${m%2===1?" rp-rp-item--alt":""}`,children:[e.jsx("td",{children:o.alimento}),e.jsx("td",{children:o.caracteristicas}),e.jsx("td",{children:o.cantidad}),e.jsx("td",{className:"rp-costo-col",children:g>0&&e.jsxs("span",{className:"rp-precio",children:["$",h(g)]})})]},o.id)})]})}function M({nombreCompleto:a,fechaCorta:n}){return e.jsx("footer",{className:"rp-footer","aria-label":"Pie de página profesional",children:e.jsxs("div",{className:"rp-footer__row",children:[e.jsxs("div",{className:"rp-footer__profesional",children:[e.jsxs("span",{className:"rp-footer__nombre",children:[b.titulo," ",b.nombre," ",b.apellido]}),e.jsx("span",{className:"rp-footer__mn",children:b.matricula})]}),e.jsxs("div",{className:"rp-footer__derecha",children:[e.jsx("span",{className:"rp-footer__fecha",children:n}),e.jsxs("span",{className:"rp-footer__conf",children:["Documento confidencial de uso exclusivo de ",a]})]})]})})}function ue(){return e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:[e.jsx("polyline",{points:"6 9 6 2 18 2 18 9"}),e.jsx("path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"}),e.jsx("rect",{x:"6",y:"14",width:"12",height:"8"})]})}export{be as default};
