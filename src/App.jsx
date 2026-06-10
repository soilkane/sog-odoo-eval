import { useState } from "react";
import { supabase } from "./supabase.js";

const NA_VALUE = '__NA__';
const PAYS = ["Côte d'Ivoire",'Gambie','Guinée','Mali','Mauritanie','Niger','Sénégal','Tchad'];

const HESK_STATS = {
  total: 1066,
  bugs_critiques: [
    {label:'Compte analytique requis (blocage BL/TI)',count:67,section:'G'},
    {label:'Valorisation stocks — OverflowError (float infinity)',count:48,section:'G'},
    {label:'Erreur TVA structured_vat non défini',count:31,section:'H'},
    {label:'Import CYNOD/Paycard — erreur SQL',count:28,section:'M'},
    {label:'Réconciliation Stations POS — boucle infinie',count:26,section:'K'},
    {label:'Rapprochement bancaire — champ invalide',count:19,section:'I'},
    {label:'Module Paie — erreur calcul ITS/règles Python',count:18,section:'J'},
    {label:'Immobilisations — amortissements incorrects',count:15,section:'I'},
    {label:'BL/TI bloqués validation — no picking out',count:41,section:'G'},
    {label:'Connexion impossible / certificat expiré',count:12,section:'A'},
  ],
  modules_sinistres: {'Stocks & Logistique':312,'Comptabilité & Finance':198,'Ventes & Facturation':134,'Stations POS (CYNOD)':127}
};

const SECTIONS = [
  {id:'id',  label:'Identification', icon:'👤', cobit:'',            critical:false},
  {id:'A',   label:'Disponibilité',  icon:'🖥️', cobit:'DSS01/BAI04', critical:false},
  {id:'B',   label:'Incidents',      icon:'⚠️', cobit:'DSS02',       critical:true},
  {id:'C',   label:'Problèmes',      icon:'🐛', cobit:'DSS03',       critical:true},
  {id:'D',   label:'Prestataire',    icon:'📋', cobit:'APO09',       critical:false},
  {id:'E',   label:'Achats Pétro.', icon:'⛽', cobit:'APO11',       critical:false},
  {id:'F',   label:'Achats B&S',    icon:'🛒', cobit:'APO11',       critical:false},
  {id:'G',   label:'Stocks',         icon:'📦', cobit:'APO11',       critical:true},
  {id:'H',   label:'Ventes',         icon:'🧾', cobit:'APO11',       critical:true},
  {id:'I',   label:'Comptabilité',   icon:'🧮', cobit:'APO11',       critical:true},
  {id:'J',   label:'RH & Paie',     icon:'👥', cobit:'APO11',       critical:false},
  {id:'K',   label:'Stations POS',  icon:'🏪', cobit:'APO11',       critical:true},
  {id:'L',   label:'Maintenance',    icon:'🔧', cobit:'BAI04',       critical:false},
  {id:'M',   label:'CYNOD',          icon:'💳', cobit:'DSS06',       critical:true},
  {id:'N',   label:'CRM',            icon:'📊', cobit:'APO11',       critical:false},
  {id:'O',   label:'Sécurité',       icon:'🛡️', cobit:'APO13',       critical:false},
  {id:'P',   label:'Reporting',      icon:'📈', cobit:'MEA01',       critical:false},
  {id:'Q',   label:'Satisfaction',   icon:'⭐', cobit:'BAI02',       critical:false},
  {id:'dash',label:'Synthèse',       icon:'📊', cobit:'',            critical:false},
];

const SECTION_LABELS = {A:'Disponibilité & Performance',B:'Incidents & Support',C:'Problèmes Récurrents',D:'Engagements Prestataire',E:'Achats Produits Pétroliers',F:'Achats Biens & Services',G:'Stocks & Logistique',H:'Ventes & Facturation',I:'Comptabilité & Finance',J:'RH & Paie',K:'POS — Stations',L:'Maintenance (GMAO)',M:'Cartes & CYNOD',N:'CRM',O:'Sécurité',P:'Reporting & Pilotage',Q:'Satisfaction Globale'};

const QUESTIONS = {
  A:[
    {code:'A.01',cobit:'DSS01.01/BAI04.01',text:"Comment évaluez-vous la disponibilité générale de l'ERP Odoo (accès, temps de fonctionnement) ?",type:'likert'},
    {code:'A.02',cobit:'DSS01.01',text:"À quelle fréquence rencontrez-vous des interruptions de service ?",type:'freq',hesk:"12 tickets : certificat SSL expiré / Internal Server Error"},
    {code:'A.03',cobit:'BAI04.01',text:"Comment évaluez-vous le temps de réponse d'Odoo lors des opérations courantes ?",type:'likert'},
    {code:'A.04',cobit:'DSS01.03',text:"L'ERP reste-t-il stable lors des périodes de forte activité (clôtures mensuelles) ?",type:'likert',hesk:"Pics d'erreurs constatés aux clôtures de fin de mois"},
    {code:'A.05',cobit:'BAI04.01',text:"Durée moyenne d'indisponibilité observée par mois :",type:'custom_radio',opts:["< 1 heure","1 à 4 heures","4 à 8 heures","8 à 24 heures","Plus de 24 heures cumulées"]},
    {code:'A.06',cobit:'BAI04.04',text:"Des alertes ou tableaux de bord de surveillance des performances sont-ils disponibles et consultés ?",type:'oui_non'},
    {code:'A.07',cobit:'DSS01',text:"Commentaires libres sur la disponibilité et les incidents de connexion :",type:'texte'},
  ],
  B:[
    {code:'B.01',cobit:'DSS02.02',text:"Comment évaluez-vous la réactivité du support DSI lors d'un incident bloquant Odoo ?",type:'likert'},
    {code:'B.02',cobit:'DSS02.04',text:"Les incidents déclarés sur HESK sont-ils effectivement résolus ou seulement fermés sans correction réelle ?",type:'oui_non',hesk:"1 066 tickets HESK recensés depuis 2023"},
    {code:'B.03',cobit:'DSS02.03',text:"Délai moyen de résolution pour un incident bloquant :",type:'custom_radio',opts:["< 4 heures","4 à 24 heures","1 à 3 jours","3 à 7 jours","> 7 jours","Jamais résolu"]},
    {code:'B.04',cobit:'DSS02.01',text:"Le canal de support HESK est-il clairement communiqué et accessible à tous les utilisateurs ?",type:'oui_non'},
    {code:'B.05',cobit:'DSS02.05',text:"Êtes-vous informé de l'avancement du traitement de vos tickets ?",type:'oui_non'},
    {code:'B.06',cobit:'DSS02.04',text:"Comment évaluez-vous la qualité des réponses apportées (pertinence, solution définitive vs contournement) ?",type:'likert'},
    {code:'B.07',cobit:'DSS02',text:"Commentaires libres sur le support et la gestion des tickets HESK :",type:'texte'},
  ],
  C:[
    {code:'C.01',cobit:'DSS03.01',text:"Les mêmes problèmes reviennent-ils régulièrement sans correction définitive ?",type:'freq',hesk:"Patterns récurrents identifiés dans 1 066 tickets HESK"},
    {code:'C.02',cobit:'DSS03.01',text:"Quels problèmes récurrents impactent le plus votre travail ? (plusieurs choix possibles)",type:'custom_check',
      opts:["Compte analytique requis bloquant les BL et transferts (~67 tickets)","Erreurs de valorisation des stocks (OverflowError, float infinity) (~48 tickets)","Bons de livraison impossibles à valider (no picking out) (~41 tickets)","Erreur TVA — structured_vat non défini lors de la facturation (~31 tickets)","Import CYNOD/Paycard — erreurs SQL ou card_id introuvable (~28 tickets)","Boucle infinie lors de la modification du registre station (~26 tickets)","Rapprochement bancaire — erreur champ invalide (~19 tickets)","Paie — erreurs calcul ITS/règles Python incorrectes (~18 tickets)","Amortissements immobilisations — comptes incorrects (~15 tickets)","Connexion impossible / Session expirée / Certificat SSL (~12 tickets)","Autre problème récurrent"]},
    {code:'C.03',cobit:'DSS03.02',text:"Une analyse des causes racines est-elle menée pour ces problèmes récurrents ?",type:'oui_non'},
    {code:'C.04',cobit:'DSS03.03',text:"Des solutions définitives sont-elles apportées ou restez-vous sur des contournements ?",type:'custom_radio',opts:["Solutions définitives systématiques","Mix solutions définitives et contournements","Principalement des contournements","Aucune solution — on subit"]},
    {code:'C.05',cobit:'DSS03',text:"Décrivez le problème récurrent le plus impactant pour vous (avec exemple concret) :",type:'texte'},
  ],
  D:[
    {code:'D.01',cobit:'APO09.01',text:"Les SLA du prestataire Odoo/intégrateur sont-ils définis, documentés et communiqués ?",type:'oui_non'},
    {code:'D.02',cobit:'APO09.03',text:"Comment évaluez-vous le respect des délais contractuels pour les correctifs bloquants ?",type:'likert',hesk:"Bugs critiques non corrigés depuis 2023"},
    {code:'D.03',cobit:'APO09.03',text:"Les évolutions fonctionnelles demandées sont-elles livrées dans les délais ?",type:'likert'},
    {code:'D.04',cobit:'APO09.04',text:"Recevez-vous des rapports de suivi de performance de la part du prestataire ?",type:'oui_non'},
    {code:'D.05',cobit:'APO09.05',text:"Comment évaluez-vous la relation globale avec le prestataire Odoo (réactivité, qualité, engagement) ?",type:'likert'},
    {code:'D.06',cobit:'APO09',text:"Remarques sur les engagements contractuels et la qualité du service prestataire :",type:'texte'},
  ],
  E:[
    {code:'E.01',cobit:'APO11.04',text:"La saisie et validation des bons de commande d'achats pétroliers fonctionnent-elles correctement ?",type:'likert'},
    {code:'E.02',cobit:'APO11.04',text:"Le traitement des bons de réception produits pétroliers est-il fiable ?",type:'likert'},
    {code:'E.03',cobit:'APO11.04',text:"Le traitement des factures fournisseurs pétroliers (saisie, validation, comptabilisation ) est-il correct ?",type:'likert',hesk:"Non-conformité signalée"},
    {code:'E.04',cobit:'APO11.04',text:"Les écarts de prix entre bon de commande et facture définitive sont-ils correctement gérés ?",type:'oui_non',hesk:"Problème récurrent : différence BC/facture sans compte d'écart isolé"},
    {code:'E.05',cobit:'APO11.04',text:"Le règlement des factures fournisseurs et la gestion des échéances sont-ils satisfaisants ?",type:'likert'},
    {code:'E.06',cobit:'APO11.02',text:"Lacunes critiques du module Achats Pétroliers :",type:'texte'},
  ],
  F:[
    {code:'F.01',cobit:'APO11.04',text:"La saisie des demandes d'achat et bons de commande biens/services fonctionne-t-elle correctement ?",type:'likert',hesk:"Bugs signalés : DA inaccessible, création BC bloquée"},
    {code:'F.02',cobit:'APO11.04',text:"Le contrôle budgétaire lors de la saisie des demandes d'achat est-il opérationnel ?",type:'oui_non',hesk:"Module budget non activé dans certaines filiales"},
    {code:'F.03',cobit:'APO11.04',text:"Le circuit d'approbation des bons de commande inclut-il le contrôleur de gestion en premier signataire ?",type:'oui_non',hesk:"Demande explicite de mise en place workflow contrôle de gestion"},
    {code:'F.04',cobit:'APO11.02',text:"Lacunes critiques du module Achats Biens & Services :",type:'texte'},
  ],
  G:[
    {code:'G.01',cobit:'APO11.04',text:"La saisie et validation des transferts inter-dépôts (TI/) se déroulent-elles sans blocage ?",type:'likert',hesk:"~67 tickets : compte analytique requis bloque les TI — bug critique non résolu"},
    {code:'G.02',cobit:'DSS03',text:"Les erreurs de valorisation des stocks (OverflowError, ZeroDivisionError, float infinity) sont-elles fréquentes ?",type:'freq',hesk:"~48 tickets : bug extra_inventory/stock_quant.py — erreur CMP"},
    {code:'G.03',cobit:'APO11.04',text:"Les reclassements de produits (ex : Jet sous douane → Jet tout cours) fonctionnent-ils correctement ?",type:'likert',hesk:"Nombreux tickets reclassement bloqués"},
    {code:'G.04',cobit:'APO11.04',text:"La gestion des inventaires périodiques (comptage, ajustements, validation) est-elle satisfaisante ?",type:'likert'},
    {code:'G.05',cobit:'APO11.04',text:"Le bilan matières (état des stocks, valorisation CMP) est-il fiable et disponible en temps réel ?",type:'likert',hesk:"Fiabilité CMP remise en question — décalages stocks/comptabilité"},
    {code:'G.06',cobit:'APO11.04',text:"Les charges logistiques (frais de transport, droits de douane) sont-elles correctement imputées ?",type:'likert',hesk:"Tickets : compte analytique requis sur comptes 651521, 603102, 603103"},
    {code:'G.07',cobit:'APO11.04',text:"Le rapprochement stock physique / comptabilité analytique est-il cohérent ?",type:'oui_non'},
    {code:'G.08',cobit:'APO11.02',text:"Lacunes critiques du module Stocks & Logistique :",type:'texte'},
  ],
  H:[
    {code:'H.01',cobit:'APO11.04',text:"La confirmation et validation des bons de livraison (BL/) se déroulent-elles sans blocage ?",type:'likert',hesk:"~41 tickets BL bloqués : 'no picking out', erreur structured_vat"},
    {code:'H.02',cobit:'APO11.04',text:"Le calcul de la TVA (18% ou structurée selon filiale/client) est-il correct sur les factures ?",type:'likert',hesk:"~31 tickets : structured_vat non défini — blocage facturation"},
    {code:'H.03',cobit:'APO11.04',text:"Les contrats de vente (remises, rétentions, DMA, régime douanier) sont-ils correctement paramétrés ?",type:'likert',hesk:"Champs contrat/régime douanier devenus inactifs — facturation aviation bloquée"},
    {code:'H.04',cobit:'APO11.04',text:"La gestion des limites de crédit (DMA) et factures échues est-elle opérationnelle ?",type:'oui_non'},
    {code:'H.05',cobit:'APO11.04',text:"La gestion des encaissements clients (chèques, virements, rapprochement) est-elle satisfaisante ?",type:'likert'},
    {code:'H.06',cobit:'APO11.04',text:"Les bons de livraison sont-ils imprimés avec mention Original/Copie (client, transporteur, ADV, dépôt) ?",type:'oui_non',hesk:"Demande : 4 exemplaires distincts non encore mise en place"},
    {code:'H.07',cobit:'APO11.02',text:"Lacunes critiques du module Ventes & Facturation :",type:'texte'},
  ],
  I:[
    {code:'I.01',cobit:'APO11.04',text:"Le lettrage et rapprochement des écritures comptables sont-ils fiables ?",type:'likert',hesk:"Erreur rapprochement bancaire — champ move_id invalide"},
    {code:'I.02',cobit:'APO11.04',text:"Le rapprochement bancaire automatique fonctionne-t-il correctement ?",type:'likert',hesk:"Rapprochement bancaire cassé — InvalidField account.bank.statement.move_id"},
    {code:'I.03',cobit:'APO11.04',text:"Les immobilisations (création, amortissements, sorties/cessions) sont-elles correctement gérées ?",type:'likert',hesk:"Amortissements déc 2023 sur comptes 68** génériques au lieu des comptes spécifiques"},
    {code:'I.04',cobit:'APO11.04',text:"Les écritures analytiques des mouvements de stock restent-elles cohérentes avec la comptabilité générale ?",type:'oui_non',hesk:"Déconnexion signalée : analytique et comptabilité coûts stocks divergent"},
    {code:'I.05',cobit:'APO11.04',text:"Les comptes fournisseurs 401 sont-ils correctement séparés (produits pétroliers vs biens et services) ?",type:'oui_non'},
    {code:'I.06',cobit:'APO11.04',text:"La gestion budgétaire (contrôle engagements, alertes dépassement) est-elle opérationnelle ?",type:'oui_non',hesk:"Module budget non activé — relances répétées"},
    {code:'I.07',cobit:'APO11.04',text:"Les états financiers SYSCOHADA générés par Odoo sont-ils conformes aux normes ?",type:'likert',hesk:"Non-conformité"},
    {code:'I.08',cobit:'APO11.02',text:"Lacunes critiques du module Comptabilité & Finance :",type:'texte'},
  ],
  J:[
    {code:'J.01',cobit:'APO11.04',text:"La génération de la paie mensuelle (calcul fiches, rubriques ITS) se déroule-t-elle sans erreur ?",type:'likert',hesk:"~18 tickets : erreur Python calcul ITS, taux de présence TAUXTRAV incorrect"},
    {code:'J.02',cobit:'APO11.04',text:"Les bulletins de paie respectent-ils la convention collective locale (ITS, HS, ancienneté) ?",type:'likert',hesk:"Anomalies : ITS, primes spéciales, heures supplémentaires incorrects"},
    {code:'J.03',cobit:'APO11.04',text:"La gestion des congés (demandes, validation, décompte dans la paie) est-elle correcte ?",type:'oui_non'},
    {code:'J.04',cobit:'APO11.04',text:"La gestion des prêts aux employés (saisie, validation, déduction paie) est-elle satisfaisante ?",type:'likert'},
    {code:'J.05',cobit:'APO11.04',text:"Les ordres de virement de la paie peuvent-ils être générés sans erreur ?",type:'oui_non',hesk:"Erreur template QWeb x_studio_afficher_sur_les_factures"},
    {code:'J.06',cobit:'APO11.02',text:"Lacunes critiques du module RH & Paie :",type:'texte'},
  ],
  K:[
    {code:'K.01',cobit:'APO11.04',text:"La saisie de la fiche de vente journalière (gérant/inspecteur) est-elle stable et sans boucle infinie ?",type:'likert',hesk:"Bug critique : RecursionError gas_station/operation_sale.py — boucle infinie registre"},
    {code:'K.02',cobit:'APO11.04',text:"Les index des pompes sont-ils correctement repris d'un jour à l'autre ?",type:'oui_non',hesk:"Tickets Guinée : index pompes reviennent à 00 — Mamou Km7, Somayah"},
    {code:'K.03',cobit:'APO11.04',text:"Les retours en cuve sont-ils correctement pris en compte dans les index et stocks de la station ?",type:'oui_non',hesk:"Retours en cuve non comptabilisés — Mamou KM7, Kagbelen 1"},
    {code:'K.04',cobit:'DSS01.03',text:"Les bons de livraison des stations remontent-ils correctement dans la Note de Livraison du registre ?",type:'oui_non',hesk:"BL non remontés dans registre station — Niamana, Mamou KM7"},
    {code:'K.05',cobit:'APO11.04',text:"La comptabilisation des dépenses POS et versements caisse se déversent-ils correctement en comptabilité ?",type:'oui_non',hesk:"Dépenses POS ne se déversent plus en comptabilité"},
    {code:'K.06',cobit:'APO11.02',text:"Lacunes critiques du module Stations-Service (POS, registre, index) :",type:'texte'},
  ],
  L:[
    {code:'L.01',cobit:'APO11.04',text:"Le portail de déclaration des pannes (tickets maintenance) est-il fonctionnel et utilisé dans votre filiale ?",type:'oui_non'},
    {code:'L.02',cobit:'APO11.04',text:"La gestion des ordres de maintenance (planification, exécution, clôture) est-elle satisfaisante ?",type:'likert'},
    {code:'L.03',cobit:'APO11.04',text:"Le stock de pièces détachées est-il correctement intégré avec la maintenance dans Odoo ?",type:'oui_non'},
    {code:'L.04',cobit:'APO11.02',text:"Lacunes critiques du module Maintenance / GMAO :",type:'texte'},
  ],
  M:[
    {code:'M.01',cobit:'APO11.04',text:"L'importation des fichiers CYNOD (ND/NC quotidiens) dans Odoo se déroule-t-elle sans erreur SQL ?",type:'likert',hesk:"~28 tickets : erreur SQL paycard_transaction — syntax error near ')' et card_id bool"},
    {code:'M.02',cobit:'APO11.04',text:"La réconciliation entre les données CYNOD et la comptabilité Odoo est-elle fiable ?",type:'likert',hesk:"Intégration ND/NC Cynod impossible — tickets récurrents toutes filiales"},
    {code:'M.03',cobit:'APO11.04',text:"La vente de bons carburant (carnets, coupons, transferts, annulations) fonctionne-t-elle correctement ?",type:'likert',hesk:"Tickets : impression coupons partielle, annulation carnet non détachée"},
    {code:'M.04',cobit:'APO11.04',text:"Les limites de consommation clients (ex : SMD 30 milliards) sont-elles correctement contrôlées ?",type:'oui_non',hesk:"Ticket : SMD limite 30 Mds mais système affiche 57 Mds consommés"},
    {code:'M.05',cobit:'APO11.02',text:"Lacunes critiques du module Cartes & Bons / interface CYNOD :",type:'texte'},
  ],
  N:[
    {code:'N.01',cobit:'APO11.04',text:"La gestion des relations clients (contacts, opportunités, pipeline commercial) est-elle satisfaisante ?",type:'likert'},
    {code:'N.02',cobit:'APO11.04',text:"Les reportings CRM (taux de conversion, pipeline, activité commerciale) sont-ils disponibles et fiables ?",type:'oui_non'},
    {code:'N.03',cobit:'APO11.02',text:"Lacunes critiques du module CRM :",type:'texte'},
  ],
  O:[
    {code:'O.01',cobit:'DSS05.04',text:"Les droits d'accès par rôles (RBAC) sont-ils correctement paramétrés et à jour ?",type:'likert',hesk:"Nombreux tickets : droits qui sautent, accès perdus — gestion manuelle réactive"},
    {code:'O.02',cobit:'DSS05.04',text:"La ségrégation des tâches (maker/checker) est-elle effective sur les processus critiques ?",type:'oui_non',hesk:"Ticket : une signature suffit pour approuver 2 transferts"},
    {code:'O.03',cobit:'APO13.02',text:"Avez-vous connaissance d'accès non autorisés ou de failles dans le système ?",type:'oui_non'},
    {code:'O.04',cobit:'APO13.01',text:"Les données sensibles (paie, financières, clients) vous semblent-elles correctement protégées ?",type:'likert'},
    {code:'O.05',cobit:'DSS05.05',text:"Les actions utilisateurs sont-elles tracées dans une piste d'audit (journalisation des modifications) ?",type:'oui_non'},
    {code:'O.06',cobit:'APO13',text:"Commentaires libres sur la sécurité et les droits d'accès :",type:'texte'},
  ],
  P:[
    {code:'P.01',cobit:'MEA01.02',text:"Les rapports disponibles dans Odoo couvrent-ils vos besoins quotidiens sans export Excel systématique ?",type:'likert',hesk:"~61 tickets reporting : exports bloqués, rapports non disponibles"},
    {code:'P.02',cobit:'MEA01.02',text:"Le reporting des ventes (analyse, reporting analytique) peut-il être généré sans erreur ?",type:'oui_non',hesk:"Erreur TypeError xlsxwriter lors de l'export reporting ventes"},
    {code:'P.03',cobit:'MEA01.03',text:"Les écritures analytiques restent-elles cohérentes avec la comptabilité après les valorisations de stock ?",type:'oui_non',hesk:"Déconnexion analytique/comptabilité signalée"},
    {code:'P.04',cobit:'MEA01.02',text:"Les états de réconciliation inter-modules (stocks ↔ comptabilité, ventes ↔ encaissements) sont-ils disponibles ?",type:'oui_non'},
    {code:'P.05',cobit:'MEA01.03',text:"À quelle fréquence constatez-vous des écarts lors des réconciliations ?",type:'freq'},
    {code:'P.06',cobit:'MEA01.02',text:"Le tableau d'amortissement et la balance générale sont-ils cohérents ?",type:'oui_non',hesk:"Soldes tableau amortissement ≠ balance générale au 31/12/2023"},
    {code:'P.07',cobit:'MEA01.02',text:"La devise de facturation (USD vs XOF) est-elle correctement affichée dans le reporting des ventes ?",type:'oui_non',hesk:"Valorisation en USD au lieu de XOF pour certaines commandes Jet"},
    {code:'P.08',cobit:'MEA01.02',text:"Quels reportings ou états vous manquent le plus dans Odoo actuellement ?",type:'texte'},
  ],
  Q:[
    {code:'Q.01',cobit:'BAI02.04',text:"Quelle est votre satisfaction globale vis-à-vis de l'ERP Odoo pour votre travail quotidien ?",type:'likert'},
    {code:'Q.02',cobit:'BAI02.04',text:"Compte tenu des 1 066 tickets support enregistrés depuis 2023, estimez-vous que les problèmes fondamentaux ont été résolus ?",type:'oui_non',hesk:"Base factuelle : 1 066 tickets HESK"},
    {code:'Q.03',cobit:'BAI02.04',text:"L'ERP répond-il adéquatement aux besoins spécifiques du secteur pétrolier ?",type:'likert'},
    {code:'Q.04',cobit:'BAI02.04',text:"Quelle est votre recommandation pour l'avenir de l'ERP Odoo dans le Groupe ?",type:'custom_radio',
      opts:["Migration vers Odoo v17 — fortement recommandée (résoudrait les bugs de fond)","Migration Odoo v17 — sous réserve correction des bugs critiques en amont","Maintien version actuelle avec correctifs massifs du prestataire","Remplacement par un autre ERP (SAP, Microsoft Dynamics, autre)","Sans opinion / je ne sais pas"]},
    {code:'Q.05',cobit:'BAI02.01',text:"Quels sont vos 3 points de douleur absolus qui doivent être résolus en priorité ?",type:'texte'},
    {code:'Q.06',cobit:'BAI02.01',text:"Avez-vous des remarques complémentaires pour la DSI Groupe ?",type:'texte'},
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const isNA = v => v === NA_VALUE;

function scoreLevel(s) {
  if (s === null || s === undefined) return {lvl:'—', badge:'badge-2', color:'#888780', label:'Non évalué'};
  if (s < 1.5) return {lvl:'N0', badge:'badge-0', color:'#E24B4A', label:'Critique'};
  if (s < 2.5) return {lvl:'N1', badge:'badge-1', color:'#EF9F27', label:'Insuffisant'};
  if (s < 3.5) return {lvl:'N2', badge:'badge-2', color:'#888780', label:'Partiel'};
  if (s < 4.5) return {lvl:'N3', badge:'badge-3', color:'#639922', label:'Conforme'};
  return {lvl:'N4', badge:'badge-4', color:'#1D9E75', label:'Excellent'};
}

function sectionScore(sid, data) {
  const qs = QUESTIONS[sid]; if (!qs) return null;
  const nums = [];
  qs.forEach(q => {
    const v = data[q.code]; if (!v || isNA(v)) return;
    if (q.type === 'likert') { const s = parseInt(v); if (s) nums.push(s); }
    else if (q.type === 'oui_non') { const m = {Oui:5,Partiellement:3,Non:1,'Ne sais pas':2}; const s = m[v]; if (s) nums.push(s); }
    else if (q.type === 'freq') { const m = {Jamais:5,Rarement:4,Parfois:3,Souvent:2,'Très souvent':1}; const s = m[v]; if (s) nums.push(s); }
  });
  if (!nums.length) return null;
  return +(nums.reduce((a,b) => a+b, 0) / nums.length).toFixed(2);
}

function secProgress(sid, data) {
  const qs = QUESTIONS[sid]; if (!qs) return {answered:0, total:0, na:0};
  let answered = 0, na = 0;
  qs.forEach(q => { const v = data[q.code]; if (v !== undefined && v !== null && v !== '') { if (isNA(v)) na++; else answered++; } });
  return {answered, na, total: qs.length};
}

function totalProgress(data) {
  let total = 0, answered = 0, na = 0;
  Object.keys(QUESTIONS).forEach(sid => { const p = secProgress(sid, data); total += p.total; answered += p.answered; na += p.na; });
  return {answered, na, total};
}

async function generateAI(data) {
  const secKeys = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q'];
  const lines = secKeys.map(sid => { const sc = sectionScore(sid, data); const lvl = scoreLevel(sc); return `${sid}:${sc !== null ? sc.toFixed(1) : 'N/A'}(${lvl.label})`; }).join(', ');
  const naCount = secKeys.reduce((acc, sid) => { const p = secProgress(sid, data); return acc + p.na; }, 0);
  const prompt = `Tu es expert COBIT® 2019, ERP Odoo, DSI conseil pour Star Oil Group (distribution pétrolière, Afrique de l'Ouest, 10 filiales).\n\nCONTEXTE : 1 066 tickets HESK depuis 2023 dont bugs non résolus :\n- ~67 tickets : compte analytique requis bloquant BL/TI\n- ~48 tickets : valorisation stocks OverflowError float infinity\n- ~41 tickets : BL impossibles à valider "no picking out"\n- ~31 tickets : structured_vat non défini — facturation bloquée\n- ~28 tickets : import CYNOD/Paycard erreur SQL\n\nScores questionnaire : ${lines}\nQuestions N/A (modules non utilisés) : ${naCount}\nPays répondant : ${data.id_pays||'N/R'}\nRecommandation (Q.04) : ${data['Q.04']||'N/R'}\nSatisfaction globale (Q.01) : ${data['Q.01']||'N/R'}/5\n\nRédige une analyse COBIT® 2019 en 4 parties (180 mots max) :\n1. DIAGNOSTIC GLOBAL : niveau COBIT atteint, gravité au regard des 1 066 tickets\n2. DOMAINES CRITIQUES : les 3 pires avec score et lien bug HESK\n3. POINTS FORTS : si score ≥ 3.5\n4. RECOMMANDATION DSI : migration Odoo v17 ou remplacement, justification factuelle\n\nFrançais, texte structuré, pas de markdown.`;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({model:'claude-sonnet-4-20250514', max_tokens:1000, messages:[{role:'user',content:prompt}]})
  });
  const d = await r.json();
  return d.content?.[0]?.text || 'Analyse non disponible.';
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Toast({msg}) {
  return msg ? <div className="fixed bottom-4 right-4 bg-blue-800 text-white px-4 py-2 rounded-lg text-xs z-50 shadow-lg">{msg}</div> : null;
}

function SelBtn({label, selected, onClick, colorClass}) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs border transition-all ${selected ? (colorClass||'bg-blue-700 text-white border-blue-700') : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
      {label}
    </button>
  );
}

function LikertRow({value, onChange}) {
  const opts = [{v:1,l:'1 — Très insatisfaisant',c:'bg-red-100 border-red-400 text-red-800'},{v:2,l:'2 — Insatisfaisant',c:'bg-orange-100 border-orange-400 text-orange-800'},{v:3,l:'3 — Neutre',c:'bg-gray-100 border-gray-400 text-gray-700'},{v:4,l:'4 — Satisfaisant',c:'bg-green-100 border-green-500 text-green-800'},{v:5,l:'5 — Très satisfaisant',c:'bg-emerald-100 border-emerald-500 text-emerald-800'}];
  return (
    <div className="flex flex-col gap-1.5 mt-2">
      {opts.map(o => (
        <button key={o.v} onClick={() => onChange(o.v)}
          className={`px-3 py-2 rounded-lg text-xs text-left border transition-all ${value===o.v ? o.c+' font-medium' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
          {o.l}
        </button>
      ))}
      <div className="flex justify-end mt-1">
        <button onClick={() => onChange(NA_VALUE)}
          className={`px-3 py-1 rounded-full text-xs border transition-all ${isNA(value) ? 'bg-gray-200 border-gray-500 text-gray-700 font-medium' : 'border-dashed border-gray-400 text-gray-400 hover:border-gray-500'}`}>
          🚫 Non applicable
        </button>
      </div>
    </div>
  );
}

function FreqRow({value, onChange}) {
  const opts = ['Jamais','Rarement','Parfois','Souvent','Très souvent'];
  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2">
        {opts.map(o => <SelBtn key={o} label={o} selected={!isNA(value)&&value===o} onClick={() => onChange(o)}/>)}
        <SelBtn label="🚫 N/A" selected={isNA(value)} onClick={() => onChange(NA_VALUE)} colorClass="bg-gray-200 text-gray-600 border-gray-400"/>
      </div>
      <p className="text-xs text-gray-400 italic mt-1">N/A = module non utilisé dans votre filiale</p>
    </div>
  );
}

function OuiNonRow({value, onChange}) {
  const opts = ['Oui','Non','Partiellement','Ne sais pas'];
  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2">
        {opts.map(o => <SelBtn key={o} label={o} selected={!isNA(value)&&value===o} onClick={() => onChange(o)}/>)}
        <SelBtn label="🚫 N/A" selected={isNA(value)} onClick={() => onChange(NA_VALUE)} colorClass="bg-gray-200 text-gray-600 border-gray-400"/>
      </div>
      <p className="text-xs text-gray-400 italic mt-1">N/A = module non utilisé dans votre filiale</p>
    </div>
  );
}

function QuestionCard({q, value, onChange}) {
  const answered = value !== undefined && value !== null && value !== '';
  const na = isNA(value);
  return (
    <div className={`rounded-xl p-4 mb-3 border transition-all ${answered && !na ? 'border-green-400 bg-green-50/30' : na ? 'border-gray-400 bg-gray-50 opacity-80' : 'border-gray-200 bg-white'} ${q.hesk ? 'border-l-4 border-l-red-400' : ''}`}>
      <p className="text-sm font-medium text-gray-800 leading-snug mb-1">{q.text}</p>
      <p className="text-xs text-blue-500 mb-1">{q.code} · COBIT® {q.cobit}</p>
      {q.hesk && <p className="text-xs text-red-500 italic mb-2">🎫 Source HESK : {q.hesk}</p>}
      {q.type === 'texte' && <textarea value={na ? '' : (value||'')} onChange={e => onChange(e.target.value)} placeholder="Votre réponse… (laissez vide si non applicable)" rows={3} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400 resize-none text-gray-600 bg-gray-50"/>}
      {q.type === 'likert' && <LikertRow value={value} onChange={onChange}/>}
      {q.type === 'freq' && <FreqRow value={value} onChange={onChange}/>}
      {q.type === 'oui_non' && <OuiNonRow value={value} onChange={onChange}/>}
      {q.type === 'custom_radio' && (
        <div className="mt-2 space-y-1">
          {q.opts.map(o => (
            <label key={o} className="flex items-start gap-2 cursor-pointer p-1.5 rounded hover:bg-gray-50">
              <input type="radio" name={`r_${q.code}`} checked={value===o} onChange={() => onChange(o)} className="mt-0.5 accent-blue-600"/>
              <span className="text-xs text-gray-700">{o}</span>
            </label>
          ))}
        </div>
      )}
      {q.type === 'custom_check' && (
        <div className="mt-2 space-y-1">
          {q.opts.map(o => {
            const vals = value ? JSON.parse(value) : [];
            const checked = vals.includes(o);
            return (
              <label key={o} className="flex items-start gap-2 cursor-pointer p-1.5 rounded hover:bg-gray-50">
                <input type="checkbox" checked={checked} onChange={() => {
                  const nv = checked ? vals.filter(x=>x!==o) : [...vals,o];
                  onChange(JSON.stringify(nv));
                }} className="mt-0.5 accent-blue-600"/>
                <span className="text-xs text-gray-700">{o}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Email Modal ──────────────────────────────────────────────────────────────
function EmailModal({data, onClose, onSubmit}) {
  const [step, setStep] = useState(1);
  const [to, setTo] = useState('dsi@staroilgroup.com');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(`[MEA01-QUEST-ODOO-002] Évaluation ERP Odoo — ${data.id_pays||''} ${data.id_filiale||'Filiale'} — ${data.id_nom||'Répondant'}`);
  const [aiText, setAiText] = useState('');
  const [aiStatus, setAiStatus] = useState('idle');
  const prog = totalProgress(data);
  const pct = Math.round((prog.answered+prog.na)/prog.total*100);
  const secKeys = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q'];
  const avg_arr = secKeys.map(s=>sectionScore(s,data)).filter(s=>s!==null);
  const avg = avg_arr.length ? (avg_arr.reduce((a,b)=>a+b,0)/avg_arr.length).toFixed(2) : null;

  const buildBody = (ai) => {
    const lines = secKeys.map(sid=>{const sc=sectionScore(sid,data);const lvl=scoreLevel(sc);const p=secProgress(sid,data);return`  Section ${sid} — ${SECTION_LABELS[sid]}: ${sc!==null?sc.toFixed(1)+'/5':'N/A'} (${lvl.lvl} — ${lvl.label})${p.na>0?' ['+p.na+' N/A]':''}`;});
    return `QUESTIONNAIRE D'ÉVALUATION ERP ODOO — STAR OIL GROUP\nRef : MEA01-QUEST-ODOO-002 v3.0 | COBIT® 2019\nDate : ${new Date().toLocaleDateString('fr-FR')}\n\nRÉPONDANT\nNom : ${data.id_nom||'—'}\nPays : ${data.id_pays||'—'}\nFiliale : ${data.id_filiale||'—'}\nDirection : ${data.id_dir||'—'}\nAncienneté : ${data.id_anc||'—'}\nComplétion : ${prog.answered}/${prog.total} répondues, ${prog.na} N/A (${pct}% traité)\n\nSCORES COBIT® PAR SECTION\n${lines.join('\n')}\n\nScore moyen global : ${avg||'N/A'}/5\n\nANALYSE IA COBIT® 2019\n${ai||'[Non générée]'}\n\n---\nStar Oil Group — DSI Groupe — CONFIDENTIEL`;
  };

  const handleAI = async () => {
    setAiStatus('generating');
    try { const t = await generateAI(data); setAiText(t); setAiStatus('done'); }
    catch { setAiStatus('error'); }
  };

  const handleEmail = () => {
    const body = buildBody(aiText);
    window.open(`mailto:${encodeURIComponent(to)}?${cc?'cc='+encodeURIComponent(cc)+'&':''}subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  const steps = ['Destinataires','Analyse IA','Aperçu & Envoi'];
  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-8 z-50 px-4" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-xl">📧</span>
          <div><p className="font-semibold text-gray-800">Envoyer les résultats à la DSI</p><p className="text-xs text-gray-400">MEA01-QUEST-ODOO-002 v3.0 — 1 066 tickets HESK</p></div>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        {/* Step bar */}
        <div className="flex items-center mb-5">
          {steps.map((l,i) => (
            <div key={l} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${i+1===step?'bg-blue-700 text-white':i+1<step?'bg-green-500 text-white':'bg-gray-100 text-gray-400'}`}>{i+1<step?'✓':i+1}</div>
                <span className={`text-xs ${i+1===step?'text-blue-700':i+1<step?'text-green-600':'text-gray-400'}`}>{l}</span>
              </div>
              {i<2&&<div className={`flex-1 h-0.5 mx-2 mb-4 ${i+1<step?'bg-green-400':'bg-gray-200'}`}/>}
            </div>
          ))}
        </div>
        {step===1 && (
          <div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[['Réponses',pct+'%','text-blue-700'],['Score moy.',(avg||'—')+'/5',`text-${scoreLevel(avg?parseFloat(avg):null).color}`],['N/A',prog.na,'text-gray-500']].map(([l,v,c])=>(
                <div key={l} className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-xs text-gray-500">{l}</p><p className={`text-lg font-semibold ${c}`}>{v}</p></div>
              ))}
            </div>
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-gray-600">Destinataire DSI *</label><input type="email" value={to} onChange={e=>setTo(e.target.value)} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400"/></div>
              <div><label className="text-xs font-medium text-gray-600">Copie (CC)</label><input type="email" value={cc} onChange={e=>setCc(e.target.value)} placeholder="responsable@filiale.com" className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400"/></div>
              <div><label className="text-xs font-medium text-gray-600">Objet</label><input type="text" value={subject} onChange={e=>setSubject(e.target.value)} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400"/></div>
            </div>
            <div className="flex justify-between mt-4 pt-3 border-t border-gray-100">
              <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">Annuler</button>
              <button onClick={()=>setStep(2)} className="px-4 py-2 rounded-lg bg-blue-700 text-white text-xs font-medium hover:bg-blue-800">Générer l'analyse IA ✨</button>
            </div>
          </div>
        )}
        {step===2 && (
          <div>
            <div className="bg-blue-50 rounded-xl p-3 mb-4 text-xs text-blue-800">🤖 <strong>Claude AI</strong> — analyse intégrant vos réponses + 1 066 tickets HESK + {prog.na} questions N/A</div>
            {aiStatus==='idle' && <div className="text-center py-6"><p className="text-xs text-gray-500 mb-3">L'IA analysera vos réponses et les données HESK pour un diagnostic COBIT factuel.</p><button onClick={handleAI} className="px-4 py-2 rounded-lg bg-blue-700 text-white text-xs font-medium hover:bg-blue-800">✨ Lancer l'analyse IA</button></div>}
            {aiStatus==='generating' && <div className="text-center py-6"><p className="text-sm text-blue-600 font-medium animate-pulse">Analyse en cours...</p></div>}
            {aiStatus==='done' && <div><p className="text-xs text-green-700 font-medium mb-2">✅ Analyse générée</p><div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600 max-h-40 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed">{aiText}</div><button onClick={()=>navigator.clipboard.writeText(aiText)} className="mt-2 px-3 py-1 rounded border border-gray-200 text-xs text-gray-500 hover:bg-gray-50">📋 Copier</button></div>}
            {aiStatus==='error' && <div className="bg-red-50 rounded-lg p-3 text-xs text-red-700">Erreur IA — l'e-mail sera envoyé sans analyse.</div>}
            <div className="flex justify-between mt-4 pt-3 border-t border-gray-100">
              <button onClick={()=>setStep(1)} className="px-4 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">← Retour</button>
              <button onClick={()=>setStep(3)} disabled={aiStatus==='generating'} className="px-4 py-2 rounded-lg bg-blue-700 text-white text-xs font-medium hover:bg-blue-800 disabled:opacity-50">Aperçu →</button>
            </div>
          </div>
        )}
        {step===3 && (
          <div>
            <div className="bg-gray-50 rounded-lg p-3 mb-3 text-xs"><div>À : <strong>{to}</strong></div>{cc&&<div>CC : {cc}</div>}<div>Objet : {subject}</div></div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-500 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono">{buildBody(aiText)}</div>
            <div className="bg-green-50 rounded-lg p-3 mt-3 text-xs text-green-700">ℹ️ Ouvre votre client de messagerie (Outlook, Thunderbird…) avec tout prérempli.</div>
            <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
              <button onClick={()=>setStep(2)} className="px-4 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">← Retour</button>
              <div className="flex gap-2">
                <button onClick={()=>navigator.clipboard.writeText(buildBody(aiText))} className="px-3 py-2 rounded-lg border border-gray-200 text-xs hover:bg-gray-50">📋</button>
                <button onClick={handleEmail} className="px-4 py-2 rounded-lg bg-yellow-400 text-yellow-900 text-xs font-medium hover:bg-yellow-500">📤 Ouvrir messagerie</button>
                <button onClick={onSubmit} className="px-4 py-2 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700">💾 Enregistrer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [si, setSi] = useState(0);
  const [data, setData] = useState({});
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const setAnswer = (code, val) => setData(p => ({...p, [code]: val}));
  const setId = (k, v) => setData(p => ({...p, [k]: v}));

  const handleSubmit = async () => {
    if (!data.id_nom || !data.id_pays) { showToast('⚠️ Nom et pays obligatoires'); return; }
    setSubmitting(true);
    try {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
      const {error} = await supabase.from('reponses').insert({
        id, nom: data.id_nom||'', filiale: data.id_filiale||'',
        fonction: data.id_dir||'', anciennete: data.id_anc||'',
        frequence: data.id_freq||'', reponses: data,
      });
      if (error) throw error;
      setSubmitted(true); setModal(false);
      showToast('✅ Réponses enregistrées !');
    } catch(e) { showToast('❌ Erreur : ' + e.message); console.error(e); }
    setSubmitting(false);
  };

  const prog = totalProgress(data);
  const pct = Math.round((prog.answered + prog.na) / prog.total * 100);
  const sec = SECTIONS[si];

  if (submitted) return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Réponses enregistrées !</h2>
        <p className="text-gray-500 text-sm mb-2">Merci <strong>{data.id_nom||''}</strong>, votre retour d'expérience a bien été soumis à la DSI Groupe.</p>
        <p className="text-xs text-gray-400 mb-6">MEA01-QUEST-ODOO-002 v3.0 · Star Oil Group · CONFIDENTIEL</p>
        <button onClick={() => { setSubmitted(false); setData({}); setSi(0); }} className="w-full bg-blue-700 hover:bg-blue-800 text-white font-medium py-2.5 rounded-xl transition-all text-sm">Nouvelle réponse</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center py-4 px-2">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Topbar */}
        <div className="bg-blue-800 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-white font-medium text-sm">🗄️ Évaluation ERP Odoo — Star Oil Group</p>
            <p className="text-blue-300 text-xs">MEA01-QUEST-ODOO-002 v3.0 | COBIT® 2019 | HESK (1 066 tickets)</p>
          </div>
          <span className="text-xs text-blue-100 bg-blue-900 px-2 py-1 rounded-full">{pct}% traité</span>
        </div>
        {/* Progress */}
        <div className="h-1 bg-blue-900"><div className="h-1 bg-yellow-400 transition-all duration-300" style={{width:`${pct}%`}}/></div>
        {/* Section nav */}
        <div className="flex overflow-x-auto gap-1 px-3 py-2 bg-slate-50 border-b border-gray-100 scrollbar-hide">
          {SECTIONS.map((s,i) => {
            const p = s.id !== 'id' && s.id !== 'dash' ? secProgress(s.id, data) : null;
            const done = p && p.answered + p.na === p.total && p.total > 0;
            return (
              <button key={s.id} onClick={() => setSi(i)}
                className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs border transition-all whitespace-nowrap ${i===si?'bg-blue-700 text-white border-blue-700':done?'bg-green-100 text-green-800 border-green-400':'bg-white text-gray-500 border-gray-200 hover:border-blue-300'} ${s.critical&&i!==si?'border-l-2 border-l-red-400':''}`}>
                {s.icon} {s.label}{s.critical&&i!==si?<span className="text-red-500 ml-0.5">●</span>:null}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-4">
          {sec.id === 'id' && <IdentSection data={data} setId={setId} onNext={() => setSi(1)}/>}
          {sec.id === 'dash' && <DashSection data={data} si={si} onBack={() => setSi(si-1)} onEmail={() => setModal(true)} onSubmit={handleSubmit} submitting={submitting}/>}
          {sec.id !== 'id' && sec.id !== 'dash' && (
            <SectionView sec={sec} si={si} data={data} setAnswer={setAnswer} onEmail={() => setModal(true)} onGo={setSi}/>
          )}
        </div>
      </div>
      {modal && <EmailModal data={data} onClose={() => setModal(false)} onSubmit={handleSubmit}/>}
      <Toast msg={toast}/>
    </div>
  );
}

function IdentSection({data, setId, onNext}) {
  const dirs = ["DAF — Finances","DEX — Exploitation","DRH — Ressources Humaines","DC — Commercial","DSI — Systèmes d'Information","DG — Direction Générale","Autre"];
  return (
    <div>
      {/* HESK summary */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
        <p className="text-xs font-semibold text-blue-700 mb-3">📊 Contexte : 1 066 tickets support HESK (2023–2026)</p>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(HESK_STATS.modules_sinistres).map(([k,v]) => (
            <div key={k} className="bg-white rounded-lg p-2 text-center border border-slate-100">
              <p className="text-lg font-bold text-red-500">{v}</p>
              <p className="text-xs text-gray-500 leading-tight">{k}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-xs text-blue-800">
        🚫 <strong>Option Non applicable (N/A)</strong> — Si un module n'est pas utilisé dans votre filiale, sélectionnez N/A. Ces réponses sont exclues du calcul du score COBIT.
      </div>
      <div className="border-l-4 border-blue-600 pl-3 mb-4 bg-slate-50 py-2 rounded-r-lg">
        <h2 className="font-semibold text-gray-800">👤 Identification du répondant</h2>
        <p className="text-xs text-blue-500 mt-0.5">Vos réponses seront analysées conjointement avec les tickets HESK de votre filiale</p>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-600">Nom et prénom *</label>
          <input value={data.id_nom||''} onChange={e=>setId('id_nom',e.target.value)} placeholder="Votre nom complet" className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400"/>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Pays *</label>
          <select value={data.id_pays||''} onChange={e=>setId('id_pays',e.target.value)} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400 bg-white">
            <option value="">— Sélectionner —</option>
            {PAYS.map(p=><option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Filiale / Entité</label>
          <input value={data.id_filiale||''} onChange={e=>setId('id_filiale',e.target.value)} placeholder="Ex : Star Oil Mali" className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400"/>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Direction</label>
          <select value={data.id_dir||''} onChange={e=>setId('id_dir',e.target.value)} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400 bg-white">
            <option value="">— Sélectionner —</option>
            {dirs.map(d=><option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Ancienneté Odoo</label>
          <select value={data.id_anc||''} onChange={e=>setId('id_anc',e.target.value)} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400 bg-white">
            <option value="">— Sélectionner —</option>
            {['< 1 an','1 à 3 ans','> 3 ans'].map(f=><option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Fréquence d'utilisation</label>
          <select value={data.id_freq||''} onChange={e=>setId('id_freq',e.target.value)} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400 bg-white">
            <option value="">— Sélectionner —</option>
            {['Quotidienne','Hebdomadaire','Mensuelle','Occasionnelle'].map(f=><option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-600">Modules Odoo utilisés</label>
          <input value={data.id_modules||''} onChange={e=>setId('id_modules',e.target.value)} placeholder="Comptabilité, Stocks, Ventes, Paie…" className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400"/>
        </div>
      </div>
      <div className="flex justify-end pt-3 border-t border-gray-100">
        <button onClick={onNext} className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-xl text-sm transition-all">Commencer →</button>
      </div>
    </div>
  );
}

function SectionView({sec, si, data, setAnswer, onEmail, onGo}) {
  const qs = QUESTIONS[sec.id] || [];
  const p = secProgress(sec.id, data);
  const criticalBugs = HESK_STATS.bugs_critiques.filter(b => b.section === sec.id);
  const isLast = sec.id === 'Q';
  return (
    <div>
      <div className="border-l-4 border-blue-600 pl-3 mb-4 bg-slate-50 py-2 rounded-r-lg">
        <h2 className="font-semibold text-gray-800">{sec.icon} Section {sec.id} — {SECTION_LABELS[sec.id]||sec.label}</h2>
        <p className="text-xs text-blue-500 mt-0.5">COBIT® : {sec.cobit} · {p.answered} répondues · {p.na} N/A · {p.total} total</p>
      </div>
      {criticalBugs.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex gap-2">
          <span className="text-red-500 mt-0.5 flex-shrink-0">⚠️</span>
          <div>
            <p className="text-xs font-semibold text-red-700 mb-1">Bugs HESK critiques dans ce module :</p>
            {criticalBugs.map(b => <p key={b.label} className="text-xs text-red-600">{b.label} <span className="inline-block bg-red-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{b.count}</span></p>)}
          </div>
        </div>
      )}
      {qs.map(q => <QuestionCard key={q.code} q={q} value={data[q.code]} onChange={v => setAnswer(q.code, v)}/>)}
      <div className="flex justify-between items-center pt-3 border-t border-gray-100 mt-2">
        <button onClick={() => onGo(si-1)} className="px-4 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">← Préc.</button>
        <span className="text-xs text-gray-400">{p.answered} répondues · {p.na} N/A</span>
        {isLast ? (
          <div className="flex gap-2">
            <button onClick={onEmail} className="px-4 py-2 rounded-lg bg-yellow-400 text-yellow-900 text-xs font-medium hover:bg-yellow-500">📧 Envoyer à la DSI</button>
            <button onClick={() => onGo(SECTIONS.length-1)} className="px-4 py-2 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700">📊 Synthèse</button>
          </div>
        ) : (
          <button onClick={() => onGo(si+1)} className="px-4 py-2 rounded-lg bg-blue-700 text-white text-xs font-medium hover:bg-blue-800">Suivant →</button>
        )}
      </div>
    </div>
  );
}

function DashSection({data, si, onBack, onEmail, onSubmit, submitting}) {
  const secKeys = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q'];
  const scores = secKeys.map(sid => ({sid, sc: sectionScore(sid,data), p: secProgress(sid,data)}));
  const validSc = scores.filter(x=>x.sc!==null).map(x=>x.sc);
  const avg = validSc.length ? +(validSc.reduce((a,b)=>a+b,0)/validSc.length).toFixed(2) : null;
  const avgLvl = scoreLevel(avg);
  const prog = totalProgress(data);
  const pct = Math.round((prog.answered+prog.na)/prog.total*100);
  const critiques = scores.filter(x=>x.sc!==null&&x.sc<2.5).map(x=>SECTION_LABELS[x.sid]);
  return (
    <div>
      <p className="font-semibold text-gray-800 mb-1">📊 Tableau de synthèse COBIT® 2019</p>
      <p className="text-xs text-gray-400 mb-4">MEA01-QUEST-ODOO-002 v3.0 — {data.id_pays||''} {data.id_filiale||'Filiale non renseignée'}</p>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          ['Score global', avg?(avg.toFixed(1)+'/5'):'—', avgLvl.color, avgLvl.lvl+' — '+avgLvl.label],
          ['Traité', pct+'%', '#1A6B9A', prog.answered+prog.na+'/'+prog.total],
          ['N/A', prog.na, '#888780', 'exclu du score'],
          ['Critiques', critiques.length, '#E24B4A', 'score < 2.5'],
        ].map(([l,v,c,sub])=>(
          <div key={l} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
            <p className="text-xs text-gray-500 mb-1">{l}</p>
            <p className="text-xl font-bold" style={{color:c}}>{v}</p>
            <p className="text-xs text-gray-400">{sub}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        {scores.map(({sid,sc,p}) => {
          const lvl = scoreLevel(sc); const pct2 = sc?Math.round((sc/5)*100):0;
          return (
            <div key={sid} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-xs text-gray-400">Section {sid}</p>
              <p className="text-xs font-medium text-gray-700 leading-tight mb-1">{SECTION_LABELS[sid]}</p>
              <p className="text-xl font-bold" style={{color:lvl.color}}>{sc!==null?sc.toFixed(1):'—'}</p>
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${lvl.badge==='badge-0'?'bg-red-100 text-red-700':lvl.badge==='badge-1'?'bg-orange-100 text-orange-700':lvl.badge==='badge-2'?'bg-gray-100 text-gray-600':lvl.badge==='badge-3'?'bg-green-100 text-green-700':'bg-emerald-100 text-emerald-700'}`}>{lvl.lvl} — {lvl.label}</span>
              {p.na>0&&<span className="ml-1 inline-block text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{p.na} N/A</span>}
              <div className="h-1 bg-gray-200 rounded-full mt-2"><div className="h-1 rounded-full" style={{width:`${pct2}%`,backgroundColor:lvl.color}}/></div>
            </div>
          );
        })}
      </div>
      {critiques.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
          <p className="text-xs font-semibold text-red-700 mb-1">⚠️ Domaines critiques :</p>
          <p className="text-xs text-red-600">{critiques.join(' • ')}</p>
        </div>
      )}
      <p className="text-xs text-gray-400 italic mb-4">ℹ️ Les questions N/A sont exclues du calcul du score COBIT — modules non utilisés dans votre filiale.</p>
      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
        <button onClick={onBack} className="px-4 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">← Retour</button>
        <div className="flex gap-2">
          <button onClick={onEmail} className="px-4 py-2 rounded-lg bg-yellow-400 text-yellow-900 text-xs font-medium hover:bg-yellow-500">📧 Envoyer à la DSI</button>
          <button onClick={onSubmit} disabled={submitting} className="px-4 py-2 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50">
            {submitting ? 'Enregistrement...' : '💾 Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
