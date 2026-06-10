import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase.js";

const NA_VALUE = '__NA__';
const LS_KEY = 'sog_odoo_eval_v3';
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
    {code:'E.03',cobit:'APO11.04',text:"Le traitement des factures fournisseurs pétroliers (saisie, validation, comptabilisation SYSCOHADA) est-il correct ?",type:'likert',hesk:"Non-conformité SYSCOHADA signalée par CAC"},
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
    {code:'I.07',cobit:'APO11.04',text:"Les états financiers SYSCOHADA générés par Odoo sont-ils conformes aux normes ?",type:'likert',hesk:"Non-conformité SYSCOHADA signalée par CAC"},
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

// ─── Utils ────────────────────────────────────────────────────────────────────
const isNA = v => v === NA_VALUE;

function genCode(nom, pays) {
  const initials = (nom||'XX').slice(0,2).toUpperCase();
  const pays2 = (pays||'XX').slice(0,2).toUpperCase();
  const rand = Math.random().toString(36).slice(2,6).toUpperCase();
  return `SOG-${initials}${pays2}-${rand}`;
}

function lsSave(payload) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(payload)); } catch(e) {}
}
function lsLoad() {
  try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : null; } catch(e) { return null; } 
}
function lsClear() {
  try { localStorage.removeItem(LS_KEY); } catch(e) {}
}

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
  const prompt = `Tu es expert COBIT® 2019, ERP Odoo, DSI conseil pour Star Oil Group (distribution pétrolière, Afrique de l'Ouest, 10 filiales).\n\nCONTEXTE : 1 066 tickets HESK depuis 2023 dont bugs non résolus :\n- ~67 tickets : compte analytique requis bloquant BL/TI\n- ~48 tickets : valorisation stocks OverflowError float infinity\n- ~41 tickets : BL impossibles à valider "no picking out"\n- ~31 tickets : structured_vat non défini — facturation bloquée\n- ~28 tickets : import CYNOD/Paycard erreur SQL\n\nScores : ${lines}\nN/A : ${naCount}\nPays : ${data.id_pays||'N/R'}\nRecommandation Q.04 : ${data['Q.04']||'N/R'}\nSatisfaction Q.01 : ${data['Q.01']||'N/R'}/5\n\nRédige une analyse COBIT® 2019 en 4 parties (180 mots max) :\n1. DIAGNOSTIC GLOBAL\n2. DOMAINES CRITIQUES (3 pires)\n3. POINTS FORTS (si score ≥ 3.5)\n4. RECOMMANDATION DSI\n\nFrançais, structuré, pas de markdown.`;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({model:'claude-sonnet-4-20250514', max_tokens:1000, messages:[{role:'user',content:prompt}]})
  });
  const d = await r.json();
  return d.content?.[0]?.text || 'Analyse non disponible.';
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Toast({msg}) {
  return msg ? <div className="fixed bottom-4 right-4 bg-blue-800 text-white px-4 py-2 rounded-lg text-xs z-50 shadow-lg animate-pulse">{msg}</div> : null;
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
        {opts.map(o => (
          <button key={o} onClick={() => onChange(o)}
            className={`px-3 py-1.5 rounded-full text-xs border transition-all ${!isNA(value)&&value===o ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>{o}</button>
        ))}
        <button onClick={() => onChange(NA_VALUE)}
          className={`px-3 py-1.5 rounded-full text-xs border transition-all ${isNA(value) ? 'bg-gray-200 text-gray-600 border-gray-400' : 'bg-white text-gray-400 border-dashed border-gray-300 hover:border-gray-500'}`}>🚫 N/A</button>
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
        {opts.map(o => (
          <button key={o} onClick={() => onChange(o)}
            className={`px-3 py-1.5 rounded-full text-xs border transition-all ${!isNA(value)&&value===o ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>{o}</button>
        ))}
        <button onClick={() => onChange(NA_VALUE)}
          className={`px-3 py-1.5 rounded-full text-xs border transition-all ${isNA(value) ? 'bg-gray-200 text-gray-600 border-gray-400' : 'bg-white text-gray-400 border-dashed border-gray-300 hover:border-gray-500'}`}>🚫 N/A</button>
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
            return (
              <label key={o} className="flex items-start gap-2 cursor-pointer p-1.5 rounded hover:bg-gray-50">
                <input type="checkbox" checked={vals.includes(o)} onChange={() => {
                  const nv = vals.includes(o) ? vals.filter(x=>x!==o) : [...vals,o];
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

// ─── Welcome Screen ───────────────────────────────────────────────────────────
function WelcomeScreen({onNew, onResume}) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const ls = lsLoad();

  const handleResume = async () => {
    if (!code.trim()) { setErr('Veuillez saisir votre code de reprise.'); return; }
    setLoading(true); setErr('');
    try {
      const {data, error} = await supabase.from('reponses').select('*').eq('code_reprise', code.trim().toUpperCase()).single();
      if (error || !data) { setErr('Code introuvable. Vérifiez votre code et réessayez.'); setLoading(false); return; }
      if (data.statut === 'soumis') { setErr('Ce questionnaire a déjà été soumis définitivement.'); setLoading(false); return; }
      onResume({...data.reponses, _id: data.id, _code: data.code_reprise});
    } catch(e) { setErr('Erreur de connexion. Réessayez.'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        <div className="bg-blue-800 p-6 text-center">
          <div className="inline-block bg-red-600 text-white text-xs font-bold px-3 py-0.5 rounded-full mb-3 tracking-widest">🔒 CONFIDENTIEL</div>
          <h1 className="text-2xl font-bold text-white">Star Oil Group</h1>
          <p className="text-blue-300 text-sm mt-1">Direction des Systèmes d'Information</p>
        </div>
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-800 text-center">Questionnaire d'évaluation</h2>
          <p className="text-blue-700 font-semibold text-center mt-1">Performance de la plateforme ODOO</p>
          <p className="text-gray-400 text-xs text-center mt-0.5">Réf. MEA01-QUEST-ODOO-002 v3.1 · COBIT® 2019 · Toutes filiales</p>

          <div className="mt-5 bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs text-blue-700 font-semibold mb-1">📋 À propos de ce questionnaire</p>
            <p className="text-xs text-blue-600 leading-relaxed">17 sections · ~100 questions · COBIT® 2019 · Enrichi 1 066 tickets HESK. Durée estimée : 30–40 min. Vous pouvez interrompre et reprendre à tout moment grâce à votre code de reprise.</p>
          </div>

          <button onClick={onNew} className="w-full mt-5 bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl transition-all text-sm shadow-sm">
            🆕 Commencer un nouveau questionnaire
          </button>

          {/* Reprise par code */}
          <div className="mt-4 border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-700 mb-2">🔄 Reprendre un questionnaire en cours</p>
            <div className="flex gap-2">
              <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="Ex : SOG-ABSN-K7X2"
                onKeyDown={e => e.key==='Enter' && handleResume()}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400 font-mono tracking-widest uppercase"/>
              <button onClick={handleResume} disabled={loading}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-all">
                {loading ? '...' : 'Reprendre'}
              </button>
            </div>
            {err && <p className="text-xs text-red-500 mt-2">{err}</p>}
          </div>

          {/* Reprise depuis localStorage */}
          {ls && ls._code && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-700 mb-1">💾 Sauvegarde locale détectée</p>
              <p className="text-xs text-amber-600 mb-2">Questionnaire en cours — <strong>{ls.id_nom||'Répondant'}</strong> · {ls.id_filiale||''} · Code : <span className="font-mono font-bold">{ls._code}</span></p>
              <button onClick={() => onResume(ls)} className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg transition-all">
                ↩️ Reprendre ma session locale
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Code Banner ──────────────────────────────────────────────────────────────
function CodeBanner({code, onCopy}) {
  return (
    <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-center gap-3 mb-4">
      <span className="text-lg">🔑</span>
      <div className="flex-1">
        <p className="text-xs font-semibold text-amber-800">Votre code de reprise</p>
        <p className="font-mono font-bold text-amber-900 tracking-widest text-base">{code}</p>
        <p className="text-xs text-amber-600 mt-0.5">Notez ce code — il vous permettra de reprendre votre questionnaire depuis n'importe quel appareil.</p>
      </div>
      <button onClick={onCopy} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg transition-all flex-shrink-0">
        📋 Copier
      </button>
    </div>
  );
}

// ─── Email Modal
