import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

const SUBS = ['Côte-Ivoire','Gambie','Guinée','Mali','Mauritanie','Niger','Sénégal','Tchad'];
const FCTS = ['DG','DEX', 'DAF', 'RH','DSI','DC'];
const DURS = ['< 6 mois','6-12 mois','1-2 ans','> 2 ans'];
const FRQS = ['Quotidienne','Hebdomadaire','Mensuelle','Occasionnelle'];
const F5 = ['Jamais','Rarement','Parfois','Souvent','Très souvent'];
const YN4 = ['Oui','Non','Partiellement','Ne sais pas'];
const DT_OPTS = ['< 1 heure','1 – 4 heures','4 – 8 heures','> 8 heures','> 24h cumulées'];
const RT_OPTS = ['< 4 heures','4 – 24 heures','1 – 3 jours','3 – 7 jours','> 7 jours','Jamais résolu'];
const SOL_OPTS = ['Solutions définitives systématiques','Mix solutions / contournements','Principalement des contournements','Aucune solution proposée'];
const RC_OPTS = ['Oui, sans réserve','Oui, avec améliorations majeures','Non, un remplacement est nécessaire','Sans opinion'];
const ADMIN_P = "SOG-DSI-2026";
const TARGET = 3.0;

const SECS = [
  { id:'A', title:'Disponibilité & Performance', cobit:'DSS01', full:'DSS01 — Manage Operations',
    qs:[
      {id:'A1',t:"Disponibilité générale d'Odoo (accès back-office, uptime global)",tp:'L'},
      {id:'A2',t:"Fréquence des interruptions de service (Odoo inaccessible, erreurs système)",tp:'F',inv:1},
      {id:'A3',t:"Temps de réponse pour les opérations courantes (saisie, recherche, validation)",tp:'L'},
      {id:'A4',t:"Stabilité lors des périodes de forte activité (clôtures mensuelles, fin d'exercice)",tp:'L'},
      {id:'A5',t:"Fiabilité des opérations de masse (imports, exports, traitements batch)",tp:'L'},
      {id:'A6',t:"Durée moyenne d'indisponibilité observée par mois",tp:'DT'},
      {id:'A7',t:"Commentaires libres — Disponibilité & Performance",tp:'TX'},
    ]},
  { id:'B', title:'Gestion des Incidents & Support', cobit:'DSS02', full:'DSS02 — Manage Service Requests and Incidents',
    qs:[
      {id:'B1',t:"Réactivité du support IT interne lors de la déclaration d'un incident Odoo",tp:'L'},
      {id:'B2',t:"Les incidents signalés sont-ils effectivement résolus (non simplement fermés) ?",tp:'YN'},
      {id:'B3',t:"Délai moyen de résolution constaté pour un incident bloquant",tp:'RT'},
      {id:'B4',t:"Canal de communication clair et accessible pour déclarer les incidents Odoo ?",tp:'YN'},
      {id:'B5',t:"Informé de l'avancement du traitement de vos incidents (suivi, notifications) ?",tp:'YN'},
      {id:'B6',t:"Qualité des réponses apportées par le support (pertinence, clarté)",tp:'L'},
      {id:'B7',t:"Avez-vous constaté des tickets fermés alors que le problème persistait ?",tp:'F',inv:1},
      {id:'B8',t:"Commentaires libres — Incidents & Support",tp:'TX'},
    ]},
  { id:'C', title:'Problèmes Récurrents', cobit:'DSS03', full:'DSS03 — Manage Problems',
    qs:[
      {id:'C1',t:"Fréquence des problèmes récurrents dans Odoo (mêmes dysfonctionnements répétés)",tp:'F',inv:1},
      {id:'C2',t:"Problèmes récurrents les plus impactants (cochez tout ce qui s'applique)",tp:'MC',
        opts:["Lenteur générale de la plateforme","Erreurs lors des clôtures comptables","Bugs sur des modules spécifiques","Problèmes d'impression / génération de documents","Erreurs de synchronisation ou d'intégration","Pertes de données ou incohérences","Problèmes de droits d'accès","Autre"]},
      {id:'C3',t:"Une analyse des causes racines est-elle menée pour les problèmes récurrents ?",tp:'YN'},
      {id:'C4',t:"Des solutions définitives sont-elles apportées ou restez-vous sur des contournements ?",tp:'SOL'},
      {id:'C5',t:"Commentaires libres — Problèmes récurrents",tp:'TX'},
    ]},
  { id:'D', title:'Qualité Fonctionnelle par Module', cobit:'APO11', full:'APO11 — Manage Quality',
    note:'Sélectionnez N/A pour les modules non utilisés dans votre filiale',
    qs:[
      {id:'D1',t:"Module Comptabilité & Finance",tp:'LN'},
      {id:'D2',t:"Module Achats",tp:'LN'},
      {id:'D3',t:"Module Ventes",tp:'LN'},
      {id:'D4',t:"Module Stocks & Inventaire",tp:'LN'},
      {id:'D5',t:"Module Facturation",tp:'LN'},
      {id:'D6',t:"Module RH / Paie",tp:'LN'},
      {id:'D7',t:"Module Gestion de Projet",tp:'LN'},
      {id:'D8',t:"Ergonomie générale d'Odoo (navigation, clarté, facilité d'usage)",tp:'L'},
      {id:'D9',t:"Adéquation des paramétrages actuels à vos processus métiers réels",tp:'L'},
      {id:'D10',t:"Commentaires libres — Qualité fonctionnelle",tp:'TX'},
    ]},
  { id:'E', title:"Sécurité & Contrôle d'Accès", cobit:'APO13/DSS05', full:"APO13 / DSS05 — Manage Security",
    qs:[
      {id:'E1',t:"Gestion des droits d'accès par rôles (RBAC) correctement appliquée dans Odoo",tp:'L'},
      {id:'E2',t:"Ségrégation des tâches (maker/checker) effective dans les processus critiques",tp:'YN'},
      {id:'E3',t:"Avez-vous connaissance de failles de sécurité ou d'accès non autorisés ?",tp:'YN',inv:1},
      {id:'E4',t:"Données sensibles (financières, RH) correctement protégées dans Odoo",tp:'L'},
      {id:'E5',t:"Actions des utilisateurs tracées (journalisation, piste d'audit)",tp:'YN'},
      {id:'E6',t:"Commentaires libres — Sécurité",tp:'TX'},
    ]},
  { id:'F', title:'Reporting & Pilotage', cobit:'MEA01', full:'MEA01 — Monitor, Evaluate and Assess Performance',
    qs:[
      {id:'F1',t:"Les rapports disponibles dans Odoo couvrent vos besoins opérationnels quotidiens",tp:'L'},
      {id:'F2',t:"Génération des rapports en autonomie totale (sans dépendance vis-à-vis de l'IT)",tp:'YN'},
      {id:'F3',t:"Rapports complets et fiables (pas de données manquantes ou incohérentes)",tp:'L'},
      {id:'F4',t:"États disponibles pour effectuer vos réconciliations et clôtures",tp:'YN'},
      {id:'F5',t:"Indicateurs de performance (KPIs) disponibles et suivis dans Odoo",tp:'YN'},
      {id:'F6',t:"Fréquence des incohérences ou pertes de données dans les rapports",tp:'F',inv:1},
      {id:'F7',t:"Rapports manquants dans la configuration actuelle d'Odoo",tp:'TX'},
    ]},
  { id:'G', title:'Satisfaction Globale & Recommandations', cobit:'BAI02.04', full:'BAI02.04 — Obtain Stakeholder Approval',
    qs:[
      {id:'G1',t:"Satisfaction globale vis-à-vis d'Odoo",tp:'L'},
      {id:'G2',t:"Odoo répond-il adéquatement à vos besoins métier au quotidien ?",tp:'L'},
      {id:'G3',t:"Recommandation sur la poursuite de l'utilisation d'Odoo dans sa configuration actuelle",tp:'RC'},
      {id:'G4',t:"Si une migration ou refonte était envisagée : vos 3 priorités absolues",tp:'TX'},
      {id:'G5',t:"Fonctionnalités manquantes souhaitées dans Odoo ou une future solution",tp:'TX'},
      {id:'G6',t:"Remarques supplémentaires sur votre expérience avec Odoo",tp:'TX'},
    ]},
];

function qScore(q, v) {
  if (v == null || v === '' || v === 'NA') return null;
  if (q.tp === 'L' || q.tp === 'LN') return typeof v === 'number' ? v : null;
  if (q.tp === 'F') { const m={Jamais:5,Rarement:4,Parfois:3,Souvent:2,'Très souvent':1}; return q.inv ? m[v]??null : 6-(m[v]??3); }
  if (q.tp === 'YN') { if(q.inv) return {Oui:1,Non:5,Partiellement:2,'Ne sais pas':2.5}[v]??null; return {Oui:5,Non:1,Partiellement:3,'Ne sais pas':2.5}[v]??null; }
  if (q.tp === 'DT') return {'< 1 heure':5,'1 – 4 heures':4,'4 – 8 heures':3,'> 8 heures':2,'> 24h cumulées':1}[v]??null;
  if (q.tp === 'RT') return {'< 4 heures':5,'4 – 24 heures':4,'1 – 3 jours':3,'3 – 7 jours':2,'> 7 jours':1,'Jamais résolu':0}[v]??null;
  if (q.tp === 'SOL') return {'Solutions définitives systématiques':5,'Mix solutions / contournements':3,'Principalement des contournements':2,'Aucune solution proposée':1}[v]??null;
  if (q.tp === 'RC') return {'Oui, sans réserve':5,'Oui, avec améliorations majeures':3,'Non, un remplacement est nécessaire':1,'Sans opinion':2.5}[v]??null;
  return null;
}

function secAvg(sec, answers) {
  const scores = sec.qs.map(q => qScore(q, answers[q.id])).filter(x => x !== null);
  if (!scores.length) return null;
  return +(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(2);
}

function getLevel(s) {
  if (s===null||s===undefined) return {c:'#94a3b8',txt:'N/A',action:'—'};
  if (s<1.5) return {c:'#dc2626',txt:'Niveau 0 — Incomplet',action:'🔴 Remplacement urgent'};
  if (s<2.5) return {c:'#ea580c',txt:'Niveau 1 — Réalisé',action:'🟠 Améliorations majeures'};
  if (s<3.5) return {c:'#ca8a04',txt:'Niveau 2 — Géré',action:'🟡 Améliorations souhaitables'};
  if (s<4.5) return {c:'#16a34a',txt:'Niveau 3 — Établi',action:'🟢 Conforme à la cible'};
  return {c:'#15803d',txt:'Niveau 4-5 — Optimisé',action:'🟢 Excellence'};
}

function SelBtns({opts, value, onChange}) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {opts.map(o=>(
        <button key={o} onClick={()=>onChange(o)}
          className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${value===o?'bg-blue-700 text-white border-blue-700 font-medium':'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}>
          {o}
        </button>
      ))}
    </div>
  );
}

function LikertBtns({value, onChange, hasNA}) {
  const opts=[
    {v:1,l:'1 — Très insatisfaisant',sel:'bg-red-600 text-white'},
    {v:2,l:'2 — Insatisfaisant',sel:'bg-orange-500 text-white'},
    {v:3,l:'3 — Neutre',sel:'bg-yellow-500 text-white'},
    {v:4,l:'4 — Satisfaisant',sel:'bg-green-500 text-white'},
    {v:5,l:'5 — Très satisfaisant',sel:'bg-green-700 text-white'}
  ];
  return (
    <div className="flex flex-col gap-1.5 mt-2">
      {opts.map(o=>(
        <button key={o.v} onClick={()=>onChange(o.v)}
          className={`px-4 py-2 rounded-lg text-sm text-left border transition-all ${value===o.v?o.sel+' border-transparent font-medium':'bg-white text-gray-700 border-gray-200 hover:border-gray-400'}`}>
          {o.l}
        </button>
      ))}
      {hasNA&&(
        <button onClick={()=>onChange('NA')}
          className={`px-4 py-2 rounded-lg text-sm text-left border transition-all ${value==='NA'?'bg-slate-500 text-white border-transparent font-medium':'bg-white text-gray-400 border-gray-200 hover:border-gray-400'}`}>
          N/A — Module non utilisé dans ma filiale
        </button>
      )}
    </div>
  );
}

function MCBtns({opts, value=[], onChange}) {
  const tog = o => onChange(value.includes(o)?value.filter(x=>x!==o):[...value,o]);
  return (
    <div className="flex flex-col gap-1.5 mt-2">
      {opts.map(o=>(
        <button key={o} onClick={()=>tog(o)}
          className={`px-4 py-2.5 rounded-lg text-sm text-left border transition-all flex items-start gap-2 ${value.includes(o)?'bg-blue-700 text-white border-blue-700 font-medium':'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}>
          <span className="mt-0.5 flex-shrink-0">{value.includes(o)?'☑':'☐'}</span><span>{o}</span>
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState('welcome');
  const [si, setSi] = useState(-1);
  const [info, setInfo] = useState({name:'',sub:'',fn:'',dur:'',frq:''});
  const [ans, setAns] = useState({});
  const [allD, setAllD] = useState([]);
  const [saving, setSaving] = useState(false);
  const [apwd, setApwd] = useState('');
  const [aOk, setAOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const setA = (id,v) => setAns(p=>({...p,[id]:v}));

  const loadAll = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('reponses').select('*').order('soumis_le', { ascending: false });
      if (error) throw error;
      setAllD(data || []);
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  };

  const submit = async () => {
    setSaving(true);
    setErrMsg('');
    const id = `${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    try {
      const { error } = await supabase.from('reponses').insert({
        id,
        nom: info.name,
        filiale: info.sub,
        fonction: info.fn,
        anciennete: info.dur,
        frequence: info.frq,
        reponses: ans,
      });
      if (error) throw error;
      setView('done');
    } catch(e) {
      setErrMsg("Erreur lors de l'envoi. Vérifiez votre connexion et réessayez.");
      console.error(e);
    }
    setSaving(false);
  };

  const infoOk = info.name && info.sub && info.fn && info.dur && info.frq;
  const sec = SECS[si];

  // ─ WELCOME ─
  if (view==='welcome') return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#1e40af 100%)'}} className="flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}} className="p-6 text-center">
          <div className="inline-block bg-red-600 text-white text-xs font-bold px-3 py-0.5 rounded-full mb-3 tracking-widest">🔒 CONFIDENTIEL</div>
          <h1 className="text-2xl font-bold text-white">Star Oil Group</h1>
          <p className="text-blue-200 text-sm mt-1">Direction des Systèmes d'Information</p>
        </div>
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-800 text-center">Questionnaire d'évaluation</h2>
          <p className="text-blue-700 font-semibold text-center mt-1">Performance de la plateforme ODOO</p>
          <p className="text-gray-400 text-xs text-center mt-0.5">Réf. MEA01-QUEST-ODOO-001 · COBIT® 2019 · Toutes filiales</p>
          <div className="mt-5 bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs text-blue-700 font-semibold mb-1">📋 À propos de ce questionnaire</p>
            <p className="text-xs text-blue-600 leading-relaxed">Ce questionnaire mesure la performance d'Odoo au sein de Star Oil Group et recueille votre retour d'expérience structuré. Les résultats alimenteront l'évaluation de maturité COBIT® 2019. Durée estimée : 15–20 min.</p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {['7 sections','~35 questions','Multi-filiales'].map((t,i)=>(
              <div key={i} className="bg-gray-50 rounded-lg p-2"><p className="text-xs font-semibold text-gray-600">{t}</p></div>
            ))}
          </div>
          <button onClick={()=>{setSi(-1);setView('form');}}
            className="w-full mt-5 bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl transition-all text-base shadow-sm">
            Commencer le questionnaire →
          </button>
          <button onClick={()=>setView('admin')}
            className="w-full mt-2 bg-gray-100 hover:bg-gray-200 text-gray-500 font-medium py-2 rounded-xl transition-all text-sm">
            🔐 Accès administration DSI
          </button>
        </div>
      </div>
    </div>
  );

  // ─ FORM ─
  if (view==='form') {
    if (si===-1) return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center gap-2 mb-4 text-sm text-gray-400">
            <button onClick={()=>setView('welcome')} className="hover:text-blue-600">← Retour</button>
            <span>/</span><span className="text-gray-700 font-medium">Identification</span>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-900 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0">ID</div>
              <div>
                <h2 className="font-bold text-gray-800">Identification du répondant</h2>
                <p className="text-xs text-gray-400 mt-0.5">Ces informations permettent l'analyse par filiale et par profil</p>
              </div>
            </div>
            <div className="space-y-5">
              <div>
                <label className="text-sm font-medium text-gray-700">Nom et Prénom *</label>
                <input value={info.name} onChange={e=>setInfo(p=>({...p,name:e.target.value}))} placeholder="Votre nom complet"
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"/>
              </div>
              <div><label className="text-sm font-medium text-gray-700">Filiale *</label><SelBtns opts={SUBS} value={info.sub} onChange={v=>setInfo(p=>({...p,sub:v}))}/></div>
              <div><label className="text-sm font-medium text-gray-700">Fonction *</label><SelBtns opts={FCTS} value={info.fn} onChange={v=>setInfo(p=>({...p,fn:v}))}/></div>
              <div><label className="text-sm font-medium text-gray-700">Ancienneté d'utilisation d'Odoo *</label><SelBtns opts={DURS} value={info.dur} onChange={v=>setInfo(p=>({...p,dur:v}))}/></div>
              <div><label className="text-sm font-medium text-gray-700">Fréquence d'utilisation *</label><SelBtns opts={FRQS} value={info.frq} onChange={v=>setInfo(p=>({...p,frq:v}))}/></div>
            </div>
          </div>
          <button disabled={!infoOk} onClick={()=>setSi(0)}
            className={`w-full mt-4 py-3 rounded-xl font-semibold transition-all text-base ${infoOk?'bg-blue-700 hover:bg-blue-800 text-white shadow-sm':'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
            Commencer l'évaluation →
          </button>
        </div>
      </div>
    );

    const pct = Math.round((si/SECS.length)*100);
    return (
      <div className="min-h-screen bg-slate-50 pb-8">
        <div className="sticky top-0 bg-white shadow-sm z-10">
          <div className="max-w-xl mx-auto px-4 py-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span className="font-medium text-gray-700">{info.name} · {info.sub}</span>
              <span>Section {si+1}/{SECS.length} — {pct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{width:`${pct}%`}}/>
            </div>
            <div className="flex gap-1 mt-1.5">
              {SECS.map((s,i)=>(
                <div key={s.id} className={`flex-1 h-1 rounded-full transition-all ${i<si?'bg-blue-600':i===si?'bg-blue-300':'bg-gray-200'}`}/>
              ))}
            </div>
          </div>
        </div>
        <div className="max-w-xl mx-auto p-4 space-y-4">
          <div style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}} className="text-white rounded-2xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-2xl font-black flex-shrink-0">{sec.id}</div>
              <div>
                <p className="text-blue-200 text-xs font-medium tracking-wide mb-0.5">{sec.full}</p>
                <h2 className="text-lg font-bold">{sec.title}</h2>
                {sec.note&&<p className="text-blue-300 text-xs mt-1 italic">{sec.note}</p>}
              </div>
            </div>
          </div>
          {sec.qs.map(q=>(
            <div key={q.id} className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-sm font-semibold text-gray-700 mb-3 leading-snug">
                <span className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded mr-2">{q.id}</span>
                {q.t}
              </p>
              {q.tp==='TX'&&<textarea value={ans[q.id]||''} onChange={e=>setA(q.id,e.target.value)} placeholder="Votre réponse (facultatif)..." rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none text-gray-600"/>}
              {(q.tp==='L'||q.tp==='LN')&&<LikertBtns value={ans[q.id]} onChange={v=>setA(q.id,v)} hasNA={q.tp==='LN'}/>}
              {q.tp==='F'&&<SelBtns opts={F5} value={ans[q.id]} onChange={v=>setA(q.id,v)}/>}
              {q.tp==='YN'&&<SelBtns opts={YN4} value={ans[q.id]} onChange={v=>setA(q.id,v)}/>}
              {q.tp==='MC'&&<MCBtns opts={q.opts} value={ans[q.id]||[]} onChange={v=>setA(q.id,v)}/>}
              {q.tp==='DT'&&<SelBtns opts={DT_OPTS} value={ans[q.id]} onChange={v=>setA(q.id,v)}/>}
              {q.tp==='RT'&&<SelBtns opts={RT_OPTS} value={ans[q.id]} onChange={v=>setA(q.id,v)}/>}
              {q.tp==='SOL'&&<SelBtns opts={SOL_OPTS} value={ans[q.id]} onChange={v=>setA(q.id,v)}/>}
              {q.tp==='RC'&&<SelBtns opts={RC_OPTS} value={ans[q.id]} onChange={v=>setA(q.id,v)}/>}
            </div>
          ))}
          {errMsg&&<div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4">{errMsg}</div>}
          <div className="flex gap-3 pt-2">
            <button onClick={()=>si===0?setSi(-1):setSi(si-1)} className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-xl transition-all">← Retour</button>
            {si<SECS.length-1?(
              <button onClick={()=>setSi(si+1)} className="flex-1 py-3 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl transition-all">Section suivante →</button>
            ):(
              <button onClick={submit} disabled={saving}
                className={`flex-1 py-3 font-semibold rounded-xl transition-all text-white ${saving?'bg-gray-400 cursor-not-allowed':'bg-green-600 hover:bg-green-700'}`}>
                {saving?'Envoi en cours...':'✓ Soumettre le questionnaire'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─ DONE ─
  if (view==='done') return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#064e3b,#1e40af)'}} className="flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✅</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Réponses enregistrées !</h2>
        <p className="text-gray-500 text-sm mb-4">Merci {info.name}, votre retour d'expérience a bien été soumis.</p>
        <div className="bg-gray-50 rounded-xl p-4 text-sm text-left space-y-1 mb-5">
          <p><strong className="text-gray-600">Filiale :</strong> {info.sub}</p>
          <p><strong className="text-gray-600">Fonction :</strong> {info.fn}</p>
          <p><strong className="text-gray-600">Date :</strong> {new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}</p>
        </div>
        <p className="text-xs text-gray-400 mb-5">MEA01-QUEST-ODOO-001 · Star Oil Group · CONFIDENTIEL</p>
        <button onClick={()=>{setView('welcome');setSi(-1);setAns({});setInfo({name:'',sub:'',fn:'',dur:'',frq:''});}}
          className="w-full bg-blue-700 hover:bg-blue-800 text-white font-medium py-2.5 rounded-xl transition-all">
          Retour à l'accueil
        </button>
      </div>
    </div>
  );

  // ─ ADMIN ─
  if (view==='admin') {
    if (!aOk) return (
      <div style={{minHeight:'100vh',background:'#0f172a'}} className="flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-blue-900 rounded-xl flex items-center justify-center mx-auto mb-3 text-3xl">🔐</div>
            <h2 className="text-xl font-bold text-gray-800">Administration DSI</h2>
            <p className="text-gray-400 text-sm mt-1">Star Oil Group — Accès restreint</p>
          </div>
          <input type="password" value={apwd} onChange={e=>setApwd(e.target.value)} placeholder="Mot de passe DSI"
            onKeyDown={e=>e.key==='Enter'&&(apwd===ADMIN_P?(setAOk(true),loadAll()):alert('Mot de passe incorrect'))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm mb-3 focus:outline-none focus:border-blue-500"/>
          <button onClick={()=>apwd===ADMIN_P?(setAOk(true),loadAll()):alert('Mot de passe incorrect')}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2.5 rounded-xl transition-all mb-2">
            Accéder au tableau de bord
          </button>
          <button onClick={()=>setView('welcome')} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 rounded-xl text-sm transition-all">← Retour</button>
        </div>
      </div>
    );

    const n = allD.length;
    const getAns = d => d.reponses || {};
    const secScores = SECS.map(s=>{
      const scores = allD.map(d=>secAvg(s, getAns(d))).filter(x=>x!==null);
      const avg = scores.length ? +(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(2) : null;
      const lv = getLevel(avg);
      const gap = avg!==null ? +(TARGET-avg).toFixed(2) : null;
      return {sec:s.id,title:s.title,cobit:s.cobit,full:s.full,avg,lv,gap};
    });
    const validS = secScores.filter(x=>x.avg!==null);
    const globalAvg = validS.length ? +(validS.reduce((a,b)=>a+b.avg,0)/validS.length).toFixed(2) : null;
    const glv = getLevel(globalAvg);
    const radarData = secScores.map(x=>({subject:x.sec,score:x.avg||0,fullMark:5}));

    const bySub = SUBS.map(sub=>{
      const d = allD.filter(x=>x.filiale===sub);
      if(!d.length) return null;
      const all = SECS.flatMap(s=>d.map(x=>secAvg(s,getAns(x))).filter(x=>x!==null));
      const avg = all.length ? +(all.reduce((a,b)=>a+b,0)/all.length).toFixed(2) : null;
      return {name:sub,score:avg,count:d.length};
    }).filter(x=>x&&x.score!==null);

    const problems = {};
    allD.forEach(d=>{const v=getAns(d)['C2'];if(Array.isArray(v))v.forEach(p=>{problems[p]=(problems[p]||0)+1;});});
    const problemData = Object.entries(problems).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>({name:k.length>28?k.slice(0,28)+'…':k,count:v}));

    const recoMap = {'Oui, sans réserve':0,'Oui, avec améliorations majeures':0,'Non, un remplacement est nécessaire':0,'Sans opinion':0};
    allD.forEach(d=>{const v=getAns(d)['G3'];if(v&&recoMap.hasOwnProperty(v))recoMap[v]++;});
    const recoData = Object.entries(recoMap).filter(([,v])=>v>0).map(([k,v])=>({name:k.length>18?k.slice(0,18)+'…':k,full:k,count:v}));
    const recoColors = ['#16a34a','#ca8a04','#dc2626','#94a3b8'];

    return (
      <div className="min-h-screen bg-slate-100">
        <div style={{background:'linear-gradient(135deg,#1e3a5f,#1e40af)'}} className="text-white p-4 sticky top-0 z-10 shadow-lg">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-blue-300 text-xs font-medium tracking-widest">TABLEAU DE BORD DSI</p>
              <h1 className="text-lg font-bold">Évaluation ODOO — Star Oil Group</h1>
              <p className="text-blue-300 text-xs mt-0.5">MEA01-QUEST-ODOO-001 · COBIT® 2019</p>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={loadAll} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-all">
                {loading?'⏳ Chargement...':'↻ Actualiser'}
              </button>
              <div className="text-center">
                <div className="text-3xl font-black">{n}</div>
                <div className="text-blue-300 text-xs">réponse{n!==1?'s':''}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto p-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="col-span-2 bg-white rounded-2xl p-5 shadow-sm">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Score global de maturité COBIT®</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black" style={{color:glv.c}}>{globalAvg??'—'}</span>
                <span className="text-gray-400 text-sm">/5</span>
              </div>
              <p className="text-sm font-semibold mt-1" style={{color:glv.c}}>{glv.txt}</p>
              <p className="text-xs text-gray-400 mt-1">Cible : 3.0 — Niveau 3 (Établi) · 18 mois</p>
              <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{width:`${((globalAvg||0)/5)*100}%`,backgroundColor:glv.c}}/>
              </div>
            </div>
            {bySub.slice(0,2).map(s=>(
              <div key={s.name} className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-gray-400 font-medium mb-0.5">{s.name}</p>
                <div className="text-3xl font-black" style={{color:getLevel(s.score).c}}>{s.score}</div>
                <p className="text-xs mt-1" style={{color:getLevel(s.score).c}}>{getLevel(s.score).txt}</p>
                <p className="text-xs text-gray-400">{s.count} répondant{s.count>1?'s':''}</p>
              </div>
            ))}
          </div>

          {n>0&&(
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-semibold text-gray-700 mb-3 text-sm">Profil de maturité COBIT® 2019</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData} margin={{top:10,right:20,bottom:10,left:20}}>
                    <PolarGrid stroke="#e2e8f0"/>
                    <PolarAngleAxis dataKey="subject" tick={{fontSize:13,fontWeight:'bold',fill:'#334155'}}/>
                    <PolarRadiusAxis domain={[0,5]} tickCount={6} tick={{fontSize:9}}/>
                    <Radar name="Score" dataKey="score" stroke="#1d4ed8" fill="#3b82f6" fillOpacity={0.35}/>
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-semibold text-gray-700 mb-3 text-sm">Scores par section</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={secScores.map(s=>({name:s.sec,score:s.avg||0}))} layout="vertical" margin={{left:0,right:25,top:5,bottom:5}}>
                    <XAxis type="number" domain={[0,5]} tick={{fontSize:9}}/>
                    <YAxis type="category" dataKey="name" tick={{fontSize:11,fontWeight:'bold'}} width={25}/>
                    <Tooltip formatter={v=>[v+'/5','Score moyen']}/>
                    <Bar dataKey="score" radius={[0,4,4,0]}>
                      {secScores.map((s,i)=><Cell key={i} fill={s.lv.c}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-700">Grille de synthèse — Évaluation de maturité COBIT® 2019</h3>
              <p className="text-xs text-gray-400 mt-0.5">Niveau cible global : 3.0 (Processus établi) à 18 mois</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>{['Sect.','Domaine','Processus COBIT®','Score /5','Niveau actuel','Cible','Écart','Action requise'].map(h=>(
                    <th key={h} className="px-3 py-2.5 text-left text-gray-500 font-medium whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {secScores.map(s=>(
                    <tr key={s.sec} className="hover:bg-gray-50">
                      <td className="px-3 py-3 font-bold text-blue-700">{s.sec}</td>
                      <td className="px-3 py-3 text-gray-700 font-medium">{s.title}</td>
                      <td className="px-3 py-3 text-gray-400">{s.full}</td>
                      <td className="px-3 py-3 font-black text-base" style={{color:s.lv.c}}>{s.avg??'—'}</td>
                      <td className="px-3 py-3 font-medium text-xs" style={{color:s.lv.c}}>{s.lv.txt}</td>
                      <td className="px-3 py-3 text-gray-400">3.0</td>
                      <td className="px-3 py-3 font-bold" style={{color:s.gap===null?'#94a3b8':s.gap>0?'#dc2626':'#16a34a'}}>
                        {s.gap===null?'—':s.gap>0?`+${s.gap}`:s.gap}
                      </td>
                      <td className="px-3 py-3 text-xs">{s.lv.action}</td>
                    </tr>
                  ))}
                  <tr className="bg-blue-50 font-bold">
                    <td className="px-3 py-3 text-blue-900" colSpan={3}>MOYENNE GÉNÉRALE</td>
                    <td className="px-3 py-3 text-xl" style={{color:glv.c}}>{globalAvg??'—'}</td>
                    <td className="px-3 py-3 text-xs" style={{color:glv.c}}>{glv.txt}</td>
                    <td className="px-3 py-3 text-gray-600">3.0</td>
                    <td className="px-3 py-3" style={{color:globalAvg&&TARGET-globalAvg>0?'#dc2626':globalAvg&&TARGET-globalAvg<0?'#16a34a':'#94a3b8'}}>
                      {globalAvg?(+(TARGET-globalAvg).toFixed(2)>0?`+${(TARGET-globalAvg).toFixed(2)}`:(TARGET-globalAvg).toFixed(2)):'—'}
                    </td>
                    <td className="px-3 py-3 text-xs">{glv.action}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {(problemData.length>0||recoData.length>0)&&(
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {problemData.length>0&&(
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-700 mb-3 text-sm">🔴 Problèmes récurrents signalés</h3>
                  <div className="space-y-2">
                    {problemData.map((p,i)=>(
                      <div key={p.name} className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-300 w-4">{i+1}</span>
                        <div className="flex-1 bg-gray-100 rounded-lg h-7 relative overflow-hidden">
                          <div className="h-full rounded-lg" style={{width:`${Math.max((p.count/Math.max(n,1))*100,8)}%`,background:'linear-gradient(to right,#f97316,#dc2626)'}}/>
                          <span className="absolute inset-0 flex items-center px-2 text-xs text-gray-800 font-medium">{p.name}</span>
                        </div>
                        <span className="text-xs font-bold text-gray-500 w-5 text-right">{p.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {recoData.length>0&&(
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-700 mb-3 text-sm">💬 Recommandation de poursuite</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={recoData} margin={{top:5,right:5,bottom:45,left:0}}>
                      <XAxis dataKey="name" tick={{fontSize:9}} angle={-20} textAnchor="end"/>
                      <YAxis tick={{fontSize:9}} allowDecimals={false}/>
                      <Tooltip formatter={(v,nm,e)=>[`${v} répondant(s)`,e?.payload?.full||'']}/>
                      <Bar dataKey="count" radius={[4,4,0,0]}>
                        {recoData.map((_,i)=><Cell key={i} fill={recoColors[i]||'#64748b'}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {bySub.length>0&&(
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-semibold text-gray-700 mb-3 text-sm">📍 Score moyen par filiale</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={bySub} margin={{top:5,right:10,bottom:5,left:0}}>
                  <XAxis dataKey="name" tick={{fontSize:10}}/>
                  <YAxis domain={[0,5]} tick={{fontSize:9}}/>
                  <Tooltip formatter={v=>[v+'/5','Score moyen']}/>
                  <Bar dataKey="score" radius={[4,4,0,0]}>
                    {bySub.map((e,i)=><Cell key={i} fill={getLevel(e.score).c}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-700">Répondants ({n})</h3>
              <span className="text-xs text-gray-400">{SUBS.filter(s=>allD.find(d=>d.filiale===s)).length} filiale(s)</span>
            </div>
            {n===0?(
              <div className="p-8 text-center text-gray-400">
                <p className="text-4xl mb-2">📭</p>
                <p className="text-sm font-medium">Aucune réponse collectée.</p>
              </div>
            ):(
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50"><tr>{['Nom','Filiale','Fonction','Ancienneté','Date','Score'].map(h=>(
                    <th key={h} className="px-3 py-2.5 text-left text-gray-500 font-medium">{h}</th>
                  ))}</tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {allD.map((d,i)=>{
                      const sc = SECS.map(s=>secAvg(s,getAns(d))).filter(x=>x!==null);
                      const ind = sc.length ? +(sc.reduce((a,b)=>a+b,0)/sc.length).toFixed(2) : null;
                      return(
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2.5 font-medium text-gray-700">{d.nom}</td>
                          <td className="px-3 py-2.5">{d.filiale}</td>
                          <td className="px-3 py-2.5">{d.fonction}</td>
                          <td className="px-3 py-2.5">{d.anciennete}</td>
                          <td className="px-3 py-2.5 text-gray-400">{new Date(d.soumis_le).toLocaleDateString('fr-FR')}</td>
                          <td className="px-3 py-2.5 font-black" style={{color:getLevel(ind).c}}>{ind??'—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex gap-3 pb-4">
            <button onClick={()=>setView('welcome')} className="flex-1 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-xl transition-all text-sm">← Accueil</button>
            <button onClick={()=>{setAOk(false);setApwd('');}} className="flex-1 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-medium rounded-xl transition-all text-sm">Se déconnecter</button>
          </div>
          <p className="text-center text-xs text-gray-400 pb-4">MEA01-QUEST-ODOO-001 · Star Oil Group · CONFIDENTIEL</p>
        </div>
      </div>
    );
  }
  return null;
}
