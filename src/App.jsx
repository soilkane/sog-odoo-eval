import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase.js";

const NA = '__NA__';
const LS_KEY = 'sog_gov_pcf_v4';
const PAYS = ["Côte d'Ivoire",'Gambie','Guinée','Mali','Mauritanie','Niger','Sénégal','Tchad'];

// ─── Sections ─────────────────────────────────────────────────────────────────
const ALL_SECTIONS = [
  {id:'id',   label:'Identification', part:0, icon:'👤'},
  {id:'A',    label:'Disponibilité',  part:1, cobit:'BAI04/DSS01', icon:'🖥️'},
  {id:'B',    label:'Incidents',      part:1, cobit:'DSS02',       icon:'⚠️'},
  {id:'C',    label:'Problèmes',      part:1, cobit:'DSS03',       icon:'🐛'},
  {id:'D',    label:'Prestataire',    part:1, cobit:'APO09',       icon:'📋'},
  {id:'P',    label:'Sécurité SI',    part:1, cobit:'APO13/DSS05', icon:'🛡️'},
  {id:'E',    label:'Achats Pétro.', part:2, cobit:'APO11/BAI02', icon:'⛽',  pcf:'4.2.3/4.4.2/9.6.1'},
  {id:'F',    label:'Achats B&S',    part:2, cobit:'APO11',       icon:'🛒',  pcf:'4.2.3.1/4.2.3.2'},
  {id:'G',    label:'Stocks',         part:2, cobit:'APO11/DSS01', icon:'📦',  pcf:'4.4.3/9.1.2'},
  {id:'H',    label:'Ventes',         part:2, cobit:'APO11/DSS06', icon:'🧾',  pcf:'3.5.4/9.2.2'},
  {id:'I',    label:'Logistique',     part:2, cobit:'APO11',       icon:'🚛',  pcf:'4.4.4/9.1.2'},
  {id:'J',    label:'Comptabilité',   part:2, cobit:'APO11/MEA01', icon:'🧮',  pcf:'9.3/9.6/9.7'},
  {id:'K',    label:'RH & Paie',     part:2, cobit:'APO11',       icon:'👥',  pcf:'7.2/7.5/7.6/9.5'},
  {id:'L',    label:'Stations POS',  part:2, cobit:'APO11/DSS01', icon:'🏪',  pcf:'4.4.3.7'},
  {id:'M',    label:'Maintenance',    part:2, cobit:'BAI04/APO11', icon:'🔧',  pcf:'10.3.2/10.3.3'},
  {id:'N',    label:'Cartes/CYNOD',   part:2, cobit:'APO11/DSS06', icon:'💳',  pcf:'3.5.4/9.2.2'},
  {id:'O',    label:'CRM',            part:2, cobit:'APO11',       icon:'📊',  pcf:'3.5.2/3.3.5'},
  {id:'Q',    label:'Satisfaction',   part:2, cobit:'BAI02.04',    icon:'⭐'},
  {id:'dash', label:'Synthèse',       part:0, icon:'📊'},
];

const SLB = {A:'Disponibilité & Performance',B:'Incidents & Support',C:'Problèmes Récurrents',D:'Engagements Prestataire',P:'Sécurité du SI',E:'Achats Produits Pétroliers',F:'Achats Biens & Services',G:'Stocks & Logistique',H:'Ventes & Facturation',I:'Logistique & Transport',J:'Comptabilité & Finance',K:'RH & Paie',L:'Stations POS',M:'Maintenance (GMAO)',N:'Cartes & Bons (CYNOD)',O:'CRM',Q:'Évaluation Globale'};

// ─── Questions ────────────────────────────────────────────────────────────────
const Q = {
  A:[
    {code:'A.01',cobit:'BAI04.01',intent:'Gouvernance IT — Niveau de disponibilité du service ERP',text:"Comment évaluez-vous la disponibilité générale de l'ERP Odoo dans votre filiale ?",type:'likert'},
    {code:'A.02',cobit:'DSS01.01',intent:'Gouvernance IT — Fréquence des incidents opérationnels',text:"À quelle fréquence rencontrez-vous des interruptions de service (accès, erreurs serveur, lenteurs bloquantes) ?",type:'freq',hesk:"12 tickets HESK : certificat SSL expiré / Internal Server Error"},
    {code:'A.03',cobit:'BAI04.04',intent:'Gouvernance IT — Existence de SLA et métriques de performance',text:"Des indicateurs de performance (SLA, taux de disponibilité, temps de réponse) sont-ils définis, mesurés et suivis pour l'ERP ?",type:'oui_non'},
    {code:'A.04',cobit:'DSS01.03',intent:'Gouvernance IT — Stabilité en charge (clôtures mensuelles)',text:"L'ERP reste-t-il stable lors des périodes de forte activité (clôtures mensuelles, valorisations des stocks) ?",type:'likert',hesk:"Pics d'erreurs systématiques observés aux clôtures"},
    {code:'A.05',cobit:'BAI04.01',intent:'Gouvernance IT — Impact des indisponibilités sur l\'activité métier',text:"Estimez-vous que les indisponibilités de l'ERP ont un impact significatif sur votre activité métier ?",type:'oui_non'},
    {code:'A.06',cobit:'BAI04',intent:'Gouvernance IT — Processus formel de planification de la capacité',text:"Existe-t-il un processus formel de planification de la capacité (infrastructure, base de données, utilisateurs) pour l'ERP ?",type:'oui_non'},
    {code:'A.07',cobit:'DSS01',intent:'Commentaire libre',text:"Commentaires sur la disponibilité et les performances de l'ERP :",type:'texte'},
  ],
  B:[
    {code:'B.01',cobit:'DSS02.01',intent:'Gouvernance IT — Existence d\'un processus de gestion des incidents',text:"Existe-t-il un processus formalisé de déclaration et de suivi des incidents ERP (canal unique, ticketing, priorités) ?",type:'oui_non'},
    {code:'B.02',cobit:'DSS02.02',intent:'Gouvernance IT — Qualité du support de 1er et 2e niveau',text:"Comment évaluez-vous la réactivité du support DSI/prestataire lors d'un incident bloquant ?",type:'likert',hesk:"1 066 tickets HESK recensés (2023–2026) — temps de traitement insuffisant"},
    {code:'B.03',cobit:'DSS02.03',intent:'Gouvernance IT — Respect des délais de résolution (SLA)',text:"Le délai moyen de résolution des incidents bloquants respecte-t-il les engagements définis ?",type:'oui_non',hesk:"Délai moyen observé > 3 jours dans 40% des cas"},
    {code:'B.04',cobit:'DSS02.04',intent:'Gouvernance IT — Taux de résolution définitive vs contournement',text:"Les incidents sont-ils définitivement résolus, ou les équipes restent-elles principalement sur des contournements ?",type:'custom_radio',opts:["Résolus définitivement dans la majorité des cas","Mix — solutions définitives et contournements","Principalement des contournements","Aucune solution — on subit","N/A"]},
    {code:'B.05',cobit:'DSS02.05',intent:'Gouvernance IT — Communication sur les incidents (transparence)',text:"Les utilisateurs sont-ils informés du statut et de l'avancement du traitement de leurs tickets ?",type:'oui_non'},
    {code:'B.06',cobit:'DSS02',intent:'Commentaire libre',text:"Commentaires sur la gestion des incidents et la qualité du support :",type:'texte'},
  ],
  C:[
    {code:'C.01',cobit:'DSS03.01',intent:'Gouvernance IT — Identification des problèmes récurrents',text:"Les mêmes dysfonctionnements reviennent-ils régulièrement sans correction définitive ?",type:'freq',hesk:"Patterns récurrents dans 1 066 tickets — aucune RCA documentée"},
    {code:'C.02',cobit:'DSS03.01',intent:'Gouvernance IT — Cartographie des problèmes critiques non résolus',text:"Quels problèmes récurrents impactent le plus votre travail ? (plusieurs choix)",type:'custom_check',opts:["Compte analytique requis — blocage BL/TI (~67 tickets)","Valorisation stocks OverflowError (~48 tickets)","BL impossibles à valider no picking out (~41 tickets)","Erreur TVA structured_vat non défini (~31 tickets)","Import CYNOD/Paycard erreur SQL (~28 tickets)","Boucle infinie registre station (~26 tickets)","Rapprochement bancaire erreur champ invalide (~19 tickets)","Erreurs calcul ITS/Paie (~18 tickets)","Amortissements — mauvais comptes (~15 tickets)","Connexion/Certificat SSL (~12 tickets)","Autre"]},
    {code:'C.03',cobit:'DSS03.02',intent:'Gouvernance IT — Maturité de la gestion des causes racines (RCA)',text:"Une analyse formelle des causes racines (Root Cause Analysis) est-elle réalisée pour les problèmes récurrents ?",type:'oui_non'},
    {code:'C.04',cobit:'DSS03.04',intent:'Gouvernance IT — Capitalisation et documentation des solutions',text:"Les solutions apportées aux problèmes sont-elles documentées et partagées (base de connaissances) ?",type:'oui_non'},
    {code:'C.05',cobit:'DSS03.03',intent:'Gouvernance IT — Plan de correction formalisé avec le prestataire',text:"Les bugs critiques identifiés font-ils l'objet d'un plan de correction formalisé avec le prestataire ERP ?",type:'oui_non'},
    {code:'C.06',cobit:'DSS03',intent:'Commentaire libre',text:"Décrivez le problème récurrent le plus impactant pour vous :",type:'texte'},
  ],
  D:[
    {code:'D.01',cobit:'APO09.01',intent:'Gouvernance IT — Existence et formalisation des SLA prestataire',text:"Les niveaux de service (SLA) convenus avec le prestataire Odoo/intégrateur sont-ils documentés, signés et partagés avec les filiales ?",type:'oui_non'},
    {code:'D.02',cobit:'APO09.03',intent:'Gouvernance IT — Respect des engagements contractuels',text:"Comment évaluez-vous le respect par le prestataire de ses engagements de délai pour les correctifs critiques ?",type:'likert',hesk:"Bugs critiques non corrigés depuis 2023 — engagements de délai non tenus"},
    {code:'D.03',cobit:'APO09.04',intent:'Gouvernance IT — Reporting et redevabilité prestataire',text:"Le prestataire produit-il des rapports périodiques sur la performance du service (uptime, incidents résolus, KPIs) ?",type:'oui_non'},
    {code:'D.04',cobit:'APO09.05',intent:'Gouvernance IT — Pilotage de la relation contractuelle',text:"Des réunions formelles de revue de service (Comité de Pilotage DSI-Prestataire) sont-elles tenues régulièrement ?",type:'oui_non'},
    {code:'D.05',cobit:'APO09.03',intent:'Gouvernance IT — Qualité des évolutions fonctionnelles livrées',text:"Comment évaluez-vous la qualité des évolutions fonctionnelles livrées par le prestataire (conformité, délai, documentation) ?",type:'likert'},
    {code:'D.06',cobit:'APO09',intent:'Commentaire libre',text:"Remarques sur les engagements contractuels et la relation prestataire :",type:'texte'},
  ],
  P:[
    {code:'P.01',cobit:'APO13.01',pcf:'8.3.1',proc:'IT-001',intent:'Gouvernance IT — Existence d\'une politique de sécurité informatique',text:"Une politique de sécurité informatique (charte, règles d'utilisation) est-elle en place et connue des utilisateurs ?",type:'oui_non'},
    {code:'P.02',cobit:'DSS05.04',pcf:'8.3.8',proc:'IT-002',intent:'Gouvernance IT — Gestion des droits d\'accès (RBAC)',text:"Les droits d'accès par rôles (RBAC) sont-ils correctement configurés, à jour et révisés périodiquement dans Odoo ?",type:'likert',hesk:"Tickets : droits qui sautent après modifications — gestion manuelle réactive"},
    {code:'P.03',cobit:'DSS05.04',intent:'Gouvernance IT — Ségrégation des tâches sur processus critiques',text:"La ségrégation des tâches (maker/checker) est-elle effective sur les processus critiques (achats, paie, comptabilité) ?",type:'oui_non',hesk:"Ticket : une signature suffit pour approuver 2 transferts"},
    {code:'P.04',cobit:'APO13.02',intent:'Gouvernance IT — Contrôle des accès non autorisés',text:"Avez-vous connaissance d'accès non autorisés ou de violation de données sur l'ERP ?",type:'oui_non'},
    {code:'P.05',cobit:'DSS05.05',intent:'Gouvernance IT — Piste d\'audit et journalisation',text:"Toutes les actions critiques des utilisateurs sont-elles tracées dans une piste d'audit accessible dans Odoo ?",type:'oui_non'},
    {code:'P.06',cobit:'APO13',intent:'Commentaire libre',text:"Commentaires sur la sécurité SI et la gestion des droits d'accès :",type:'texte'},
  ],
  E:[
    {code:'E.01',cobit:'APO11.04',pcf:'4.2.3.4',proc:'ACH-001',intent:'Efficacité digitale — Digitalisation saisie/validation BC achats pétroliers',text:"Le processus de saisie et validation des bons de commande d'achats pétroliers est-il entièrement réalisé dans Odoo, sans double saisie manuelle ?",type:'oui_non'},
    {code:'E.02',cobit:'APO11.04',pcf:'4.4.2.2',intent:'Efficacité digitale — Fiabilité du traitement des bons de réception',text:"Le traitement des bons de réception de produits pétroliers dans Odoo est-il fiable (pas de pertes, valorisation correcte) ?",type:'likert',hesk:"Compte analytique requis bloque les réceptions — ~67 tickets"},
    {code:'E.03',cobit:'APO11.04',pcf:'9.6.1',proc:'CPT-001',intent:'Efficacité digitale — Conformité SYSCOHADA du traitement factures fournisseurs',text:"Le traitement des factures fournisseurs pétroliers (saisie, validation, comptabilisation SYSCOHADA) est-il conforme aux normes comptables locales ?",type:'likert',hesk:"Non-conformité SYSCOHADA signalée par le CAC"},
    {code:'E.04',cobit:'APO11.04',pcf:'4.2.4.2',intent:'Efficacité digitale — Automatisation des règlements fournisseurs',text:"Le règlement des factures fournisseurs et la gestion des échéances sont-ils correctement supportés par Odoo ?",type:'likert'},
    {code:'E.05',cobit:'APO11.04',pcf:'4.2.4.2',intent:'Efficacité digitale — Disponibilité du reporting achats',text:"Les rapports et tableaux de bord achats pétroliers (suivi BC, réceptions, factures) sont-ils disponibles en temps réel dans Odoo ?",type:'oui_non'},
    {code:'E.06',cobit:'BAI02',intent:'Commentaire libre',text:"Lacunes ou besoins non couverts dans le module Achats Pétroliers :",type:'texte'},
  ],
  F:[
    {code:'F.01',cobit:'APO11.04',pcf:'4.2.3.1',proc:'ACH-001',intent:'Efficacité digitale — Dématérialisation des demandes d\'achat',text:"Le processus de demande d'achat (DA) est-il entièrement dématérialisé dans Odoo (création, validation, workflow d'approbation) ?",type:'oui_non',hesk:"Module budget non activé dans certaines filiales"},
    {code:'F.02',cobit:'APO11.04',pcf:'4.2.3.2',intent:'Efficacité digitale — Circuit d\'approbation automatisé',text:"Le workflow d'approbation des bons de commande (incluant le contrôleur de gestion en 1er signataire) est-il correctement configuré dans Odoo ?",type:'oui_non',hesk:"Circuit contrôle de gestion non implémenté"},
    {code:'F.03',cobit:'APO11.04',pcf:'9.1.1.5',intent:'Efficacité digitale — Contrôle budgétaire en temps réel',text:"Le contrôle budgétaire (vérification du budget disponible avant validation d'une DA) est-il actif et fiable dans Odoo ?",type:'oui_non'},
    {code:'F.04',cobit:'APO11.04',pcf:'4.2.4.2',intent:'Efficacité digitale — Reporting fournisseurs et performance achats',text:"Le reporting de performance fournisseurs (délais, qualité, prix) est-il disponible et utilisé dans Odoo ?",type:'oui_non'},
    {code:'F.05',cobit:'BAI02',intent:'Commentaire libre',text:"Lacunes ou besoins non couverts dans le module Achats Biens & Services :",type:'texte'},
  ],
  G:[
    {code:'G.01',cobit:'APO11.04',pcf:'4.4.3.8',intent:'Efficacité digitale — Fiabilité des transferts inter-dépôts',text:"Les transferts inter-dépôts (TI/) sont-ils saisis et validés sans blocage dans Odoo ?",type:'likert',hesk:"~67 tickets : compte analytique requis bloque systématiquement les TI"},
    {code:'G.02',cobit:'APO11.04',pcf:'4.4.3.1',intent:'Efficacité digitale — Gestion des reclassements et mouvements internes',text:"Les reclassements de produits (ex : Jet sous douane → Jet tout cours) et les prêts/emprunts sont-ils correctement pris en charge ?",type:'likert',hesk:"Tickets reclassement bloqués — must validate stock picking first"},
    {code:'G.03',cobit:'APO11.04',pcf:'4.4.3.5',intent:'Efficacité digitale — Fiabilité des inventaires périodiques',text:"La gestion des inventaires périodiques (comptage, ajustements) est-elle réalisée sans erreur dans Odoo ?",type:'likert'},
    {code:'G.04',cobit:'APO11.04',pcf:'4.4.3.5',intent:'Efficacité digitale — Fiabilité du bilan matières et valorisation CMP',text:"Le bilan matières et la valorisation des stocks (coût moyen pondéré) sont-ils fiables et cohérents avec la comptabilité ?",type:'likert',hesk:"~48 tickets valorisation OverflowError — décalages stocks/comptabilité"},
    {code:'G.05',cobit:'APO11.04',pcf:'4.4.3',intent:'Efficacité digitale — Gestion des charges logistiques',text:"Les charges logistiques (transport, douane, EMASE) sont-elles correctement imputées aux mouvements de stock ?",type:'likert',hesk:"Compte analytique requis sur comptes 651521, 603102, 603103"},
    {code:'G.06',cobit:'APO11.04',pcf:'9.3.2.6',intent:'Efficacité digitale — Cohérence rapprochement stocks/comptabilité',text:"Le rapprochement stock physique vs comptabilité analytique est-il automatisé et cohérent dans Odoo ?",type:'oui_non'},
    {code:'G.07',cobit:'APO11.04',pcf:'9.1.4',intent:'Efficacité digitale — Disponibilité du reporting stocks',text:"Les rapports de suivi des stocks (état en temps réel, valorisation, mouvement) sont-ils disponibles sans export Excel manuel ?",type:'oui_non'},
    {code:'G.08',cobit:'BAI02',intent:'Commentaire libre',text:"Lacunes ou besoins non couverts dans le module Stocks & Logistique :",type:'texte'},
  ],
  H:[
    {code:'H.01',cobit:'APO11.04',pcf:'3.5.2',intent:'Efficacité digitale — Gestion digitale des contrats et conditions commerciales',text:"Les contrats de vente (remises, rétentions, DMA, conditions de règlement) sont-ils entièrement gérés dans Odoo ?",type:'likert'},
    {code:'H.02',cobit:'APO11.04',pcf:'3.3.3',intent:'Efficacité digitale — Paramétrage des prix multi-critères',text:"La gestion des prix de vente (par date, article, dépôt, régime douanier) est-elle correctement configurée dans Odoo ?",type:'oui_non',hesk:"Champs régime douanier aviation devenus inactifs — facturation bloquée"},
    {code:'H.03',cobit:'APO11.04',pcf:'3.5.4.1',intent:'Efficacité digitale — Fluidité du circuit de validation des BC clients',text:"La saisie et la validation des bons de commande clients se déroulent-elles sans blocage dans Odoo ?",type:'likert',hesk:"~41 tickets BL bloqués : no picking out, structured_vat non défini"},
    {code:'H.04',cobit:'APO11.04',pcf:'9.2.2',intent:'Efficacité digitale — Fiabilité de la facturation clients (TVA, comptes)',text:"La facturation clients (calcul TVA, comptes comptables, rapprochement) est-elle correcte et conforme à la réglementation locale ?",type:'likert',hesk:"~31 tickets structured_vat non défini — blocage facturation"},
    {code:'H.05',cobit:'APO11.04',pcf:'4.4.4.1',intent:'Efficacité digitale — Traitement des bons de livraison',text:"Les bons de livraison (BL) sont-ils traités et édités sans erreur dans Odoo (mentions Original/Copie, 4 exemplaires) ?",type:'oui_non'},
    {code:'H.06',cobit:'APO11.04',pcf:'9.2.3.2',intent:'Efficacité digitale — Gestion des encaissements et rapprochement',text:"La gestion des encaissements clients (réception, pointage, relances) est-elle correctement supportée par Odoo ?",type:'likert'},
    {code:'H.07',cobit:'APO11.04',pcf:'9.2.5',intent:'Efficacité digitale — Gestion des rétentions et ajustements',text:"La gestion des rétentions sur facture et sur règlement est-elle correctement implémentée dans Odoo ?",type:'oui_non'},
    {code:'H.08',cobit:'BAI02',intent:'Commentaire libre',text:"Lacunes ou besoins non couverts dans le module Ventes & Facturation :",type:'texte'},
  ],
  I:[
    {code:'I.01',cobit:'APO11.04',pcf:'4.4.4.3',intent:'Efficacité digitale — Digitalisation de la gestion de flotte',text:"La gestion de la flotte de camions-citernes (affectation, suivi, maintenance) est-elle supportée par Odoo ?",type:'oui_non'},
    {code:'I.02',cobit:'APO11.04',pcf:'9.1.2',intent:'Efficacité digitale — Suivi des coûts d\'entretien du parc',text:"Les coûts d'entretien et d'exploitation du parc de camions-citernes sont-ils correctement imputés et suivis dans Odoo ?",type:'oui_non'},
    {code:'I.03',cobit:'APO11.04',pcf:'4.4.4.1',intent:'Efficacité digitale — Optimisation des tournées et transport sortant',text:"La planification et le suivi des livraisons (tournées, chargements, confirmations) sont-ils effectués dans Odoo ?",type:'oui_non'},
    {code:'I.04',cobit:'APO11.04',pcf:'9.3.4',intent:'Efficacité digitale — Reporting logistique et indicateurs de performance',text:"Des indicateurs de performance logistique (taux de livraison, coûts/km, incidents) sont-ils disponibles dans Odoo ?",type:'oui_non'},
    {code:'I.05',cobit:'BAI02',intent:'Commentaire libre',text:"Lacunes ou besoins non couverts dans la Gestion Logistique :",type:'texte'},
  ],
  J:[
    {code:'J.01',cobit:'APO11.04',pcf:'9.2.2',proc:'CPT-001/CPT-002',intent:'Efficacité digitale — Fiabilité de la facturation et du lettrage',text:"La facturation clients/fournisseurs et le lettrage des comptes sont-ils correctement réalisés dans Odoo ?",type:'likert',hesk:"Rapprochement bancaire cassé — InvalidField account.bank.statement.move_id"},
    {code:'J.02',cobit:'APO11.04',pcf:'9.3.3',proc:'IMMO-001',intent:'Efficacité digitale — Conformité de la gestion des immobilisations',text:"La gestion des immobilisations (acquisitions, amortissements, sorties) est-elle conforme au plan comptable SYSCOHADA dans Odoo ?",type:'likert',hesk:"Amortissements comptabilisés sur comptes 68** génériques — déc 2023"},
    {code:'J.03',cobit:'APO11.04',pcf:'9.3.2.6',intent:'Efficacité digitale — Automatisation du rapprochement bancaire',text:"Le rapprochement bancaire (intégration des relevés, pointage automatique) est-il opérationnel dans Odoo ?",type:'likert',hesk:"Rapprochement bancaire cassé — InvalidField"},
    {code:'J.04',cobit:'APO11.04',pcf:'9.3.2.4',intent:'Efficacité digitale — Gestion des provisions et charges à payer',text:"La gestion des factures non parvenues, provisions et charges constatées d'avance (CCA/PCA) est-elle prise en charge dans Odoo ?",type:'oui_non'},
    {code:'J.05',cobit:'APO11.04',pcf:'9.1.1.2',proc:'CDG-001/CDG-002',intent:'Efficacité digitale — Contrôle budgétaire et analytique',text:"La gestion budgétaire et la comptabilité analytique (centres de coûts, affectation filiale/activité) sont-elles opérationnelles dans Odoo ?",type:'oui_non',hesk:"Module budget non activé dans plusieurs filiales — relances répétées"},
    {code:'J.06',cobit:'APO11.04',pcf:'9.7.2',intent:'Efficacité digitale — Gestion de la trésorerie',text:"Le suivi de la trésorerie (soldes bancaires, échéanciers, prévisions de flux) est-il disponible dans Odoo ?",type:'oui_non'},
    {code:'J.07',cobit:'APO11.04',pcf:'9.3.4',intent:'Efficacité digitale — Conformité des états financiers SYSCOHADA',text:"Les états financiers SYSCOHADA (bilan, compte de résultat, états annexes) générés par Odoo sont-ils conformes aux normes en vigueur ?",type:'likert',hesk:"Non-conformité SYSCOHADA signalée par le Commissaire aux Comptes"},
    {code:'J.08',cobit:'BAI02',intent:'Commentaire libre',text:"Lacunes ou besoins non couverts dans le module Comptabilité & Finance :",type:'texte'},
  ],
  K:[
    {code:'K.01',cobit:'APO11.04',pcf:'9.5',proc:'GRH-006/GRH-007',intent:'Efficacité digitale — Fiabilité du traitement de la paie',text:"La génération de la paie mensuelle (calcul des fiches, rubriques ITS, primes) est-elle fiable et sans erreur dans Odoo ?",type:'likert',hesk:"~18 tickets : erreur Python calcul ITS, taux TAUXTRAV incorrect"},
    {code:'K.02',cobit:'APO11.04',pcf:'7.5.2',proc:'GRH-006/GRH-007',intent:'Efficacité digitale — Gestion des avantages et prêts aux employés',text:"La gestion des prêts, avances sur salaire et avantages sociaux est-elle correctement prise en charge dans Odoo ?",type:'likert'},
    {code:'K.03',cobit:'APO11.04',pcf:'7.6.4',intent:'Efficacité digitale — Automatisation du workflow congés',text:"Les demandes de congés, le workflow de validation et la déduction dans la paie sont-ils automatisés dans Odoo ?",type:'oui_non'},
    {code:'K.04',cobit:'APO11.04',pcf:'7.2',proc:'GRH-002/GRH-003',intent:'Efficacité digitale — Digitalisation du recrutement',text:"Le processus de recrutement (candidatures, sélection, intégration) est-il géré dans Odoo ?",type:'oui_non'},
    {code:'K.05',cobit:'APO11.04',pcf:'7.3.2',intent:'Efficacité digitale — Gestion des évaluations et performance',text:"La gestion des évaluations du personnel est-elle réalisée dans Odoo ?",type:'oui_non'},
    {code:'K.06',cobit:'APO11.04',pcf:'9.6.2',intent:'Efficacité digitale — Gestion des missions et notes de frais',text:"Les missions et notes de frais (saisie, validation, comptabilisation) sont-elles entièrement gérées dans Odoo ?",type:'oui_non'},
    {code:'K.07',cobit:'APO11.04',pcf:'7.7',intent:'Efficacité digitale — Reporting RH et indicateurs',text:"Les indicateurs RH (effectifs, masse salariale, absentéisme) sont-ils disponibles en tableau de bord dans Odoo ?",type:'oui_non'},
    {code:'K.08',cobit:'BAI02',intent:'Commentaire libre',text:"Lacunes ou besoins non couverts dans le module RH & Paie :",type:'texte'},
  ],
  L:[
    {code:'L.01',cobit:'APO11.04',pcf:'4.4.3.7',intent:'Efficacité digitale — Fiabilité de la fiche de suivi journalière station',text:"La saisie de la fiche de vente journalière (gérant/inspecteur) est-elle stable et sans blocage dans Odoo ?",type:'likert',hesk:"Bug critique RecursionError gas_station/operation_sale.py — boucle infinie"},
    {code:'L.02',cobit:'APO11.04',pcf:'4.4.3.7',intent:'Efficacité digitale — Fiabilité des index de pompes',text:"Les index des pompes sont-ils correctement repris d'une journée à l'autre (pas de remise à zéro intempestive) ?",type:'oui_non',hesk:"Tickets Guinée : index pompes remis à 00 — Mamou Km7, Somayah"},
    {code:'L.03',cobit:'DSS01.03',intent:'Efficacité digitale — Remontée des BL dans le registre station',text:"Les bons de livraison remontent-ils correctement dans la Note de Livraison du registre de la station ?",type:'oui_non',hesk:"BL non remontés — Niamana, Mamou KM7"},
    {code:'L.04',cobit:'APO11.04',pcf:'9.3.4',intent:'Efficacité digitale — Disponibilité du reporting stations',text:"Les rapports de gestion des stations (volumes, encaissements, réconciliation caisse) sont-ils disponibles et fiables dans Odoo ?",type:'oui_non'},
    {code:'L.05',cobit:'APO11.04',intent:'Efficacité digitale — Portail gérant fonctionnel',text:"Le portail gérant (saisie via interface web/mobile) est-il accessible et correctement utilisé par les gérants de station ?",type:'oui_non'},
    {code:'L.06',cobit:'BAI02',intent:'Commentaire libre',text:"Lacunes ou besoins non couverts dans le module POS/Stations :",type:'texte'},
  ],
  M:[
    {code:'M.01',cobit:'APO11.04',pcf:'10.3.3.5',intent:'Efficacité digitale — Digitalisation des déclarations de pannes',text:"Le portail de déclaration des pannes est-il utilisé de manière systématique par les équipes terrain ?",type:'oui_non'},
    {code:'M.02',cobit:'APO11.04',pcf:'10.3.2',intent:'Efficacité digitale — Fiabilité de la gestion des OT maintenance',text:"La gestion des ordres de travail de maintenance (création, planification, exécution, clôture) est-elle correctement supportée par Odoo ?",type:'likert'},
    {code:'M.03',cobit:'APO11.04',pcf:'4.4.3',intent:'Efficacité digitale — Intégration stock pièces détachées / maintenance',text:"Le stock de pièces détachées est-il correctement intégré avec les ordres de maintenance dans Odoo ?",type:'oui_non'},
    {code:'M.04',cobit:'BAI04.01',pcf:'10.3.2.7',intent:'Efficacité digitale — Disponibilité des KPIs maintenance (MTBF, MTTR)',text:"Les indicateurs de performance maintenance (MTBF, MTTR, taux de disponibilité des équipements) sont-ils disponibles dans Odoo ?",type:'oui_non'},
    {code:'M.05',cobit:'BAI02',intent:'Commentaire libre',text:"Lacunes ou besoins non couverts dans le module Maintenance/GMAO :",type:'texte'},
  ],
  N:[
    {code:'N.01',cobit:'APO11.04',pcf:'3.5.4',intent:'Efficacité digitale — Gestion des bons carburant et interface CYNOD',text:"L'importation des opérations CYNOD (notes de débit/crédit) dans Odoo se déroule-t-elle sans erreur SQL ?",type:'likert',hesk:"~28 tickets : erreur SQL paycard_transaction — syntax error near ')'"},
    {code:'N.02',cobit:'APO11.04',pcf:'9.2.2',intent:'Efficacité digitale — Fiabilité de la réconciliation CYNOD/Comptabilité',text:"La réconciliation entre les données CYNOD et la comptabilité Odoo est-elle fiable (pas d'écarts inexpliqués) ?",type:'likert',hesk:"Intégration ND/NC Cynod impossible — tickets récurrents toutes filiales"},
    {code:'N.03',cobit:'APO11.04',pcf:'3.5.4',intent:'Efficacité digitale — Gestion complète du cycle bons carburant',text:"La vente, l'impression, les transferts et les retours de bons carburant sont-ils correctement gérés dans Odoo ?",type:'likert',hesk:"Impression partielle, annulation carnet non détachée"},
    {code:'N.04',cobit:'APO11.04',intent:'Efficacité digitale — Contrôle des limites de consommation',text:"Les limites de consommation clients (quotas) sont-elles correctement contrôlées et alertées dans Odoo ?",type:'oui_non',hesk:"SMD : limite 30 Mds — système affiche 57 Mds consommés"},
    {code:'N.05',cobit:'BAI02',intent:'Commentaire libre',text:"Lacunes ou besoins non couverts dans le module Cartes & Bons / CYNOD :",type:'texte'},
  ],
  O:[
    {code:'O.01',cobit:'APO11.04',pcf:'3.5.2',intent:'Efficacité digitale — Gestion de la relation client centralisée dans Odoo',text:"La gestion de la relation client (contacts, historique, opportunités, réclamations) est-elle centralisée dans Odoo ?",type:'oui_non'},
    {code:'O.02',cobit:'APO11.04',pcf:'3.3.5',intent:'Efficacité digitale — Disponibilité des KPIs CRM et pipeline commercial',text:"Les indicateurs de performance commerciale (pipeline, taux de conversion, activité par commercial) sont-ils disponibles dans Odoo ?",type:'oui_non'},
    {code:'O.03',cobit:'APO11.04',pcf:'6.2.3',intent:'Efficacité digitale — Gestion des réclamations clients dans Odoo',text:"Les réclamations clients sont-elles enregistrées, suivies et résolues via Odoo ?",type:'oui_non'},
    {code:'O.04',cobit:'BAI02',intent:'Commentaire libre',text:"Lacunes ou besoins non couverts dans le module CRM :",type:'texte'},
  ],
  Q:[
    {code:'Q.01',cobit:'BAI02.04',intent:'Évaluation globale — Satisfaction ERP',text:"Quelle est votre satisfaction globale vis-à-vis de l'ERP Odoo pour votre travail quotidien ?",type:'likert'},
    {code:'Q.02',cobit:'BAI02.04',intent:'Évaluation globale — Maturité de la gouvernance IT perçue',text:"Estimez-vous que la gouvernance IT du Groupe (processus, SLA, pilotage ERP) est à un niveau satisfaisant ?",type:'oui_non'},
    {code:'Q.03',cobit:'BAI02.04',intent:'Évaluation globale — Couverture fonctionnelle des processus digitalisés',text:"Les processus métier du Programme de Digitalisation SOG sont-ils efficacement couverts par Odoo ?",type:'likert'},
    {code:'Q.04',cobit:'BAI02.04',intent:'Évaluation globale — Recommandation stratégique',text:"Quelle est votre recommandation pour l'avenir de l'ERP Odoo dans le Groupe ?",type:'custom_radio',opts:["Migration vers Odoo v17 — résoudrait les bugs de fond","Migration Odoo v17 sous réserve correction des bugs critiques","Maintien version actuelle avec correctifs massifs prestataire","Remplacement par un autre ERP (SAP, Dynamics, autre)","Sans opinion"]},
    {code:'Q.05',cobit:'BAI02.01',intent:'Évaluation globale — Priorités d\'amélioration',text:"Quels sont vos 3 points de douleur prioritaires à résoudre pour améliorer la gouvernance et l'efficacité digitale ?",type:'texte'},
    {code:'Q.06',cobit:'BAI02.01',intent:'Commentaire libre',text:"Remarques complémentaires pour la DSI Groupe :",type:'texte'},
  ],
};

// ─── Utils ────────────────────────────────────────────────────────────────────
const isNA = v => v === NA;

function genCode(nom, pays) {
  const i = (nom||'XX').slice(0,2).toUpperCase();
  const p = (pays||'XX').slice(0,2).toUpperCase();
  const r = Math.random().toString(36).slice(2,6).toUpperCase();
  return `SOG-${i}${p}-${r}`;
}
function lsSave(d) { try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch(e) {} }
function lsLoad() { try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : null; } catch(e) { return null; } }
function lsClear() { try { localStorage.removeItem(LS_KEY); } catch(e) {} }

function scoreLevel(s) {
  if (s === null || s === undefined) return {l:'—', b:'bna', c:'#888780', t:'Non évalué'};
  if (s < 1.5) return {l:'N0', b:'b0', c:'#E24B4A', t:'Critique'};
  if (s < 2.5) return {l:'N1', b:'b1', c:'#EF9F27', t:'Insuffisant'};
  if (s < 3.5) return {l:'N2', b:'b2', c:'#888780', t:'Partiel'};
  if (s < 4.5) return {l:'N3', b:'b3', c:'#639922', t:'Conforme'};
  return {l:'N4', b:'b4', c:'#1D9E75', t:'Excellent'};
}
function sectionScore(sid, data) {
  const qs = Q[sid]; if (!qs) return null;
  const nums = [];
  qs.forEach(q => {
    const v = data[q.code]; if (!v || isNA(v)) return;
    if (q.type === 'likert') { const s = parseInt(v); if (s) nums.push(s); }
    else if (q.type === 'oui_non') { const m = {Oui:5,Partiellement:3,Non:1,'Ne sais pas':2}; const s = m[v]; if (s) nums.push(s); }
    else if (q.type === 'freq') { const m = {Jamais:5,Rarement:4,Parfois:3,Souvent:2,'Très souvent':1}; const s = m[v]; if (s) nums.push(s); }
  });
  if (!nums.length) return null;
  return +(nums.reduce((a,b) => a+b,0) / nums.length).toFixed(2);
}
function secProgress(sid, data) {
  const qs = Q[sid]; if (!qs) return {a:0, na:0, t:0};
  let a = 0, na = 0;
  qs.forEach(q => { const v = data[q.code]; if (v !== undefined && v !== null && v !== '') { if (isNA(v)) na++; else a++; } });
  return {a, na, t: qs.length};
}
function totalProgress(data) {
  let total = 0, answered = 0, na = 0;
  Object.keys(Q).forEach(sid => { const p = secProgress(sid, data); total += p.t; answered += p.a; na += p.na; });
  return {answered, na, total};
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Toast({msg}) {
  return msg ? <div className="fixed bottom-4 right-4 bg-blue-800 text-white px-4 py-2 rounded-lg text-xs z-50 shadow-lg">{msg}</div> : null;
}

function LikertRow({value, onChange}) {
  const opts = [{v:1,l:'1 — Très insatisfaisant',c:'bg-red-100 border-red-400 text-red-800'},{v:2,l:'2 — Insatisfaisant',c:'bg-orange-100 border-orange-400 text-orange-800'},{v:3,l:'3 — Neutre',c:'bg-gray-100 border-gray-400 text-gray-700'},{v:4,l:'4 — Satisfaisant',c:'bg-green-100 border-green-500 text-green-800'},{v:5,l:'5 — Très satisfaisant',c:'bg-emerald-100 border-emerald-500 text-emerald-800'}];
  return (
    <div className="flex flex-col gap-1.5 mt-2">
      {opts.map(o => <button key={o.v} onClick={() => onChange(o.v)} className={`px-3 py-2 rounded-lg text-xs text-left border transition-all ${value===o.v ? o.c+' font-medium' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>{o.l}</button>)}
      <div className="flex justify-end mt-1">
        <button onClick={() => onChange(NA)} className={`px-3 py-1 rounded-full text-xs border transition-all ${isNA(value) ? 'bg-gray-200 border-gray-500 text-gray-700 font-medium' : 'border-dashed border-gray-400 text-gray-400 hover:border-gray-500'}`}>🚫 Non applicable</button>
      </div>
    </div>
  );
}
function FreqRow({value, onChange}) {
  const opts = ['Jamais','Rarement','Parfois','Souvent','Très souvent'];
  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2">
        {opts.map(o => <button key={o} onClick={() => onChange(o)} className={`px-3 py-1.5 rounded-full text-xs border transition-all ${!isNA(value)&&value===o ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>{o}</button>)}
        <button onClick={() => onChange(NA)} className={`px-3 py-1.5 rounded-full text-xs border transition-all ${isNA(value) ? 'bg-gray-200 text-gray-600 border-gray-400' : 'bg-white text-gray-400 border-dashed border-gray-300'}`}>🚫 N/A</button>
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
        {opts.map(o => <button key={o} onClick={() => onChange(o)} className={`px-3 py-1.5 rounded-full text-xs border transition-all ${!isNA(value)&&value===o ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>{o}</button>)}
        <button onClick={() => onChange(NA)} className={`px-3 py-1.5 rounded-full text-xs border transition-all ${isNA(value) ? 'bg-gray-200 text-gray-600 border-gray-400' : 'bg-white text-gray-400 border-dashed border-gray-300'}`}>🚫 N/A</button>
      </div>
      <p className="text-xs text-gray-400 italic mt-1">N/A = module non utilisé dans votre filiale</p>
    </div>
  );
}

function QuestionCard({q, value, onChange, isPcf}) {
  const answered = value !== undefined && value !== null && value !== '';
  const na = isNA(value);
  const borderL = q.hesk ? 'border-l-4 border-l-red-400' : isPcf ? 'border-l-2 border-l-green-400' : 'border-l-2 border-l-blue-400';
  return (
    <div className={`rounded-xl p-4 mb-3 border transition-all ${answered && !na ? 'border-green-400 bg-green-50/20' : na ? 'border-gray-300 bg-gray-50 opacity-80' : 'border-gray-200 bg-white'} ${borderL}`}>
      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">COBIT® {q.cobit}</span>
        {q.pcf && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium">PCF {q.pcf}</span>}
        {q.proc && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-medium">Proc. {q.proc}</span>}
        {q.hesk && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">⚠ HESK</span>}
      </div>
      <p className="text-sm font-medium text-gray-800 leading-snug mb-1">{q.text}</p>
      <p className="text-xs italic mb-2" style={{color: q.intent.startsWith('Gouvernance') ? '#1A6B9A' : q.intent.startsWith('Efficacité') ? '#27a141' : '#888780'}}>↳ {q.intent}</p>
      {q.hesk && <p className="text-xs text-red-500 italic mb-2">🎫 {q.hesk}</p>}
      {q.type === 'texte' && <textarea value={na ? '' : (value||'')} onChange={e => onChange(e.target.value)} placeholder="Votre réponse…" rows={3} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400 resize-none text-gray-600 bg-gray-50"/>}
      {q.type === 'likert' && <LikertRow value={value} onChange={onChange}/>}
      {q.type === 'freq' && <FreqRow value={value} onChange={onChange}/>}
      {q.type === 'oui_non' && <OuiNonRow value={value} onChange={onChange}/>}
      {q.type === 'custom_radio' && (
        <div className="mt-2 space-y-1">
          {q.opts.map(o => <label key={o} className="flex items-start gap-2 cursor-pointer p-1.5 rounded hover:bg-gray-50"><input type="radio" name={`r_${q.code}`} checked={value===o} onChange={() => onChange(o)} className="mt-0.5 accent-blue-600"/><span className="text-xs text-gray-700">{o}</span></label>)}
        </div>
      )}
      {q.type === 'custom_check' && (
        <div className="mt-2 space-y-1">
          {q.opts.map(o => {
            const vals = value ? JSON.parse(value) : [];
            return <label key={o} className="flex items-start gap-2 cursor-pointer p-1.5 rounded hover:bg-gray-50"><input type="checkbox" checked={vals.includes(o)} onChange={() => { const nv = vals.includes(o) ? vals.filter(x=>x!==o) : [...vals,o]; onChange(JSON.stringify(nv)); }} className="mt-0.5 accent-blue-600"/><span className="text-xs text-gray-700">{o}</span></label>;
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
          <h1 className="text-xl font-bold text-white">Star Oil Group</h1>
          <p className="text-blue-300 text-sm mt-1">Direction des Systèmes d'Information</p>
        </div>
        <div className="p-6">
          <h2 className="text-base font-bold text-gray-800 text-center">Évaluation Gouvernance IT & Efficacité Digitale</h2>
          <div className="flex gap-2 justify-center mt-2 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">COBIT® 2019</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium">PCF V7.4 APQC</span>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 mb-4 text-xs text-gray-600 space-y-1">
            <p>🔵 <strong>Partie 1</strong> — Gouvernance IT (COBIT® 2019) : maturité des processus IT</p>
            <p>🟢 <strong>Partie 2</strong> — Efficacité Digitale (PCF V7.4) : couverture des processus métier</p>
            <p>⏱ Durée estimée : 35–45 min · Interruptible à tout moment</p>
          </div>
          <button onClick={onNew} className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl text-sm mb-3">🆕 Commencer un nouveau questionnaire</button>
          <div className="border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-700 mb-2">🔄 Reprendre un questionnaire en cours</p>
            <div className="flex gap-2">
              <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Ex : SOG-ABSN-K7X2" onKeyDown={e => e.key==='Enter' && handleResume()} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400 font-mono tracking-widest uppercase"/>
              <button onClick={handleResume} disabled={loading} className="px-4 py-2 bg-blue-700 text-white text-xs font-medium rounded-lg disabled:opacity-50">{loading ? '...' : 'Reprendre'}</button>
            </div>
            {err && <p className="text-xs text-red-500 mt-2">{err}</p>}
          </div>
          {ls && ls._code && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-700 mb-1">💾 Sauvegarde locale détectée</p>
              <p className="text-xs text-amber-600 mb-2"><strong>{ls.id_nom||'Répondant'}</strong> · {ls.id_filiale||''} · Code : <span className="font-mono font-bold">{ls._code}</span></p>
              <button onClick={() => onResume(ls)} className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg">↩️ Reprendre ma session locale</button>
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
      <span className="text-lg flex-shrink-0">🔑</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-amber-800">Votre code de reprise</p>
        <p className="font-mono font-bold text-amber-900 tracking-widest text-base">{code}</p>
        <p className="text-xs text-amber-600 mt-0.5">Notez ce code pour reprendre depuis n'importe quel appareil.</p>
      </div>
      <button onClick={onCopy} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg flex-shrink-0">📋 Copier</button>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('welcome');
  const [si, setSi] = useState(0);
  const [part, setPart] = useState(1);
  const [data, setData] = useState({});
  const [toast, setToast] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const saveTimer = useRef(null);

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  // Auto-save
  useEffect(() => {
    if (screen !== 'form' || !data._code) return;
    lsSave(data);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await supabase.from('reponses').upsert({
          id: data._id, code_reprise: data._code,
          nom: data.id_nom||'', filiale: data.id_filiale||'',
          fonction: data.id_dir||'', anciennete: data.id_anc||'',
          frequence: data.id_freq||'', reponses: data, statut: 'en_cours',
        }, {onConflict: 'id'});
      } catch(e) {}
    }, 2000);
    return () => clearTimeout(saveTimer.current);
  }, [data, screen]);

  const setAnswer = (code, val) => setData(p => ({...p, [code]: val}));
  const setId = (k, v) => setData(p => ({...p, [k]: v}));

  const handleNew = () => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    setData({_id: id, _code: ''});
    setSi(0); setPart(1); setScreen('form');
  };
  const handleResume = savedData => {
    setData(savedData); setSi(1); setPart(1); setScreen('form');
    showToast('✅ Questionnaire rechargé !');
  };
  const handleGenerateCode = () => {
    if (!data.id_nom || !data.id_pays || data._code) return;
    const code = genCode(data.id_nom, data.id_pays);
    setData(p => ({...p, _code: code}));
    showToast('🔑 Code généré : ' + code);
  };
  const handleSubmit = async () => {
    if (!data.id_nom || !data.id_pays) { showToast('⚠️ Nom et pays obligatoires'); return; }
    setSubmitting(true);
    try {
      const {error} = await supabase.from('reponses').upsert({
        id: data._id, code_reprise: data._code,
        nom: data.id_nom||'', filiale: data.id_filiale||'',
        fonction: data.id_dir||'', anciennete: data.id_anc||'',
        frequence: data.id_freq||'', reponses: data, statut: 'soumis',
      }, {onConflict: 'id'});
      if (error) throw error;
      lsClear(); setSubmitted(true);
    } catch(e) { showToast('❌ Erreur : ' + e.message); }
    setSubmitting(false);
  };

  const prog = totalProgress(data);
  const pct = Math.round((prog.answered + prog.na) / prog.total * 100);
  const sec = ALL_SECTIONS[si];

  const switchPart = (p) => {
    setPart(p);
    const first = ALL_SECTIONS.findIndex(s => s.part === p);
    if (first >= 0) setSi(first);
  };

  // Sections visibles selon la partie active
  const visibleSecs = ALL_SECTIONS.filter(s => s.id === 'id' || s.id === 'dash' || s.part === part);

  if (screen === 'welcome') return <><WelcomeScreen onNew={handleNew} onResume={handleResume}/><Toast msg={toast}/></>;

  if (submitted) return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Questionnaire soumis !</h2>
        <p className="text-gray-500 text-sm mb-4">Merci <strong>{data.id_nom||''}</strong>, vos réponses ont bien été transmises à la DSI Groupe.</p>
        <p className="text-xs text-gray-400 mb-6">MEA01-QUEST-GOV-PCF-001 · Star Oil Group · CONFIDENTIEL</p>
        <button onClick={() => { setSubmitted(false); setData({}); setSi(0); setScreen('welcome'); }} className="w-full bg-blue-700 hover:bg-blue-800 text-white font-medium py-2.5 rounded-xl text-sm">Retour à l'accueil</button>
      </div>
      <Toast msg={toast}/>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center py-4 px-2">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Topbar */}
        <div className="bg-blue-800 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-white font-semibold text-sm">Gouvernance IT & Efficacité Digitale — SOG</p>
            <p className="text-blue-300 text-xs">COBIT® 2019 · PCF V7.4 APQC · MEA01-QUEST-GOV-PCF-001</p>
          </div>
          <div className="flex items-center gap-2">
            {data._code && (
              <span className="text-xs text-amber-300 font-mono bg-blue-900 px-2 py-1 rounded cursor-pointer" onClick={() => { navigator.clipboard.writeText(data._code); showToast('Code copié !'); }} title="Cliquer pour copier">
                🔑 {data._code}
              </span>
            )}
            <span className="text-xs text-blue-100 bg-blue-900 px-2 py-1 rounded-full">{pct}%</span>
          </div>
        </div>
        <div className="h-1 bg-blue-900"><div className="h-1 transition-all duration-300" style={{width:`${pct}%`, background: part===2 ? '#4FAE47' : '#F7C515'}}/></div>

        {/* Part tabs */}
        {sec.id !== 'id' && sec.id !== 'dash' && (
          <div className="flex border-b border-gray-200">
            <button onClick={() => switchPart(1)} className={`flex-1 py-2.5 text-xs font-medium transition-all border-b-2 ${part===1 ? 'text-blue-700 border-blue-700 bg-blue-50/50' : 'text-gray-500 border-transparent hover:text-blue-600'}`}>
              🛡️ Partie 1 — Gouvernance IT (COBIT®)
            </button>
            <button onClick={() => switchPart(2)} className={`flex-1 py-2.5 text-xs font-medium transition-all border-b-2 ${part===2 ? 'text-green-700 border-green-600 bg-green-50/50' : 'text-gray-500 border-transparent hover:text-green-600'}`}>
              🌿 Partie 2 — Processus Métier (PCF V7)
            </button>
          </div>
        )}

        {/* Section nav */}
        <div className="flex overflow-x-auto gap-1 px-3 py-2 bg-slate-50 border-b border-gray-100">
          {visibleSecs.map((s,i) => {
            const gi = ALL_SECTIONS.indexOf(s);
            const p = s.id !== 'id' && s.id !== 'dash' ? secProgress(s.id, data) : null;
            const done = p && p.a + p.na === p.t && p.t > 0;
            const isActive = gi === si;
            const activeColor = s.part === 2 ? 'bg-green-600 text-white border-green-600' : 'bg-blue-700 text-white border-blue-700';
            return (
              <button key={s.id} onClick={() => { setSi(gi); if (s.part) setPart(s.part); }}
                className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs border transition-all whitespace-nowrap ${isActive ? activeColor : done ? 'bg-green-100 text-green-800 border-green-400' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'}`}>
                {s.icon} {s.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-4">
          {sec.id === 'id' && <IdentSection data={data} setId={setId} onGenerateCode={handleGenerateCode} onCopy={() => { navigator.clipboard.writeText(data._code); showToast('Code copié !'); }} onStart={() => switchPart(1)}/>}
          {sec.id === 'dash' && <DashSection data={data} onBack={() => { const qi = ALL_SECTIONS.findIndex(s => s.id === 'Q'); setSi(qi); }} onSubmit={handleSubmit} submitting={submitting}/>}
          {sec.id !== 'id' && sec.id !== 'dash' && (
            <SectionView sec={sec} si={si} data={data} setAnswer={setAnswer} visibleSecs={visibleSecs} onGo={(gi) => { setSi(gi); const s = ALL_SECTIONS[gi]; if (s.part) setPart(s.part); }} onDash={() => setSi(ALL_SECTIONS.findIndex(s=>s.id==='dash'))}/>
          )}
        </div>
      </div>
      <Toast msg={toast}/>
    </div>
  );
}

// ─── Ident Section ────────────────────────────────────────────────────────────
function IdentSection({data, setId, onGenerateCode, onCopy, onStart}) {
  const dirs = ["DAF — Finances","DEX — Exploitation","DRH — Ressources Humaines","DC — Commercial","DSI — Systèmes d'Information","DG — Direction Générale","Audit & Contrôle Interne","Autre"];
  const canGenerate = data.id_nom && data.id_pays && !data._code;
  return (
    <div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-xs text-blue-800">
        <strong>Objectif</strong> — Ce questionnaire évalue deux dimensions :<br/>
        <span className="text-blue-700">■ Partie 1 (COBIT® 2019)</span> : Maturité de la gouvernance IT (disponibilité, incidents, problèmes, SLA, sécurité)<br/>
        <span className="text-green-700">■ Partie 2 (PCF V7.4)</span> : Efficacité des fonctions métier digitalisées dans Odoo (11 domaines, 428 procédures SOG)
      </div>
      <div className="border-l-4 border-blue-600 pl-3 mb-4 bg-slate-50 py-2 rounded-r-lg">
        <h2 className="font-semibold text-gray-800">👤 Identification du répondant</h2>
        <p className="text-xs text-blue-500 mt-0.5">Remplissez Nom et Pays pour générer votre code de reprise</p>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Nom et prénom *</label><input value={data.id_nom||''} onChange={e=>setId('id_nom',e.target.value)} placeholder="Votre nom complet" className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400"/></div>
        <div><label className="text-xs font-medium text-gray-600">Pays *</label>
          <select value={data.id_pays||''} onChange={e=>setId('id_pays',e.target.value)} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400 bg-white">
            <option value="">— Pays —</option>{PAYS.map(p=><option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div><label className="text-xs font-medium text-gray-600">Filiale / Entité</label><input value={data.id_filiale||''} onChange={e=>setId('id_filiale',e.target.value)} placeholder="Ex : Star Oil Mali" className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400"/></div>
        <div><label className="text-xs font-medium text-gray-600">Direction</label>
          <select value={data.id_dir||''} onChange={e=>setId('id_dir',e.target.value)} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400 bg-white">
            <option value="">— Direction —</option>{dirs.map(d=><option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div><label className="text-xs font-medium text-gray-600">Poste</label><input value={data.id_poste||''} onChange={e=>setId('id_poste',e.target.value)} placeholder="Ex : Resp. Comptabilité" className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400"/></div>
        <div><label className="text-xs font-medium text-gray-600">Ancienneté Odoo</label>
          <select value={data.id_anc||''} onChange={e=>setId('id_anc',e.target.value)} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400 bg-white">
            <option value="">— Ancienneté —</option>{['< 1 an','1 à 3 ans','> 3 ans'].map(f=><option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Modules Odoo utilisés</label><input value={data.id_modules||''} onChange={e=>setId('id_modules',e.target.value)} placeholder="Comptabilité, Stocks, Ventes, Paie…" className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400"/></div>
      </div>

      {/* Code generation */}
      {!data._code && (
        <div className="mb-4">
          <button onClick={onGenerateCode} disabled={!canGenerate} className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${canGenerate ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
            🔑 Générer mon code de reprise
          </button>
          {!canGenerate && <p className="text-xs text-gray-400 text-center mt-1">Remplissez Nom et Pays pour générer votre code</p>}
        </div>
      )}
      {data._code && <CodeBanner code={data._code} onCopy={onCopy}/>}

      <div className="flex gap-3 pt-3 border-t border-gray-100">
        <button onClick={onStart} disabled={!data._code} className={`flex-1 py-2.5 font-medium rounded-xl text-sm transition-all ${data._code ? 'bg-blue-700 hover:bg-blue-800 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
          🛡️ Partie 1 — Gouvernance IT →
        </button>
        <button onClick={() => { /* switch to part 2 */ }} disabled={!data._code} className={`flex-1 py-2.5 font-medium rounded-xl text-sm transition-all ${data._code ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
          onClick={() => { if(data._code) { const gi = ALL_SECTIONS.findIndex(s=>s.id==='E'); /* handled in parent */ } }}>
          🌿 Partie 2 — PCF Métier →
        </button>
      </div>
    </div>
  );
}

// ─── Section View ─────────────────────────────────────────────────────────────
function SectionView({sec, si, data, setAnswer, visibleSecs, onGo, onDash}) {
  const qs = Q[sec.id] || [];
  const p = secProgress(sec.id, data);
  const isPcf = sec.part === 2;
  const vIdx = visibleSecs.indexOf(sec);
  const prevSec = vIdx > 0 ? visibleSecs[vIdx-1] : null;
  const nextSec = vIdx < visibleSecs.length-1 ? visibleSecs[vIdx+1] : null;
  const isLast = sec.id === 'Q';

  return (
    <div>
      <div className={`border-l-4 pl-3 mb-4 py-2 rounded-r-lg ${isPcf ? 'border-green-500 bg-green-50' : 'border-blue-600 bg-blue-50'}`}>
        <h2 className="font-semibold text-gray-800">{sec.icon} {isPcf ? 'Partie 2 — PCF V7' : 'Partie 1 — Gouvernance COBIT®'} · Section {sec.id} — {SLB[sec.id]||sec.label}</h2>
        <div className="flex flex-wrap gap-1.5 mt-1">
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">COBIT® {sec.cobit}</span>
          {sec.pcf && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium">PCF {sec.pcf}</span>}
        </div>
        <p className="text-xs mt-1" style={{color: isPcf ? '#27a141' : '#1A6B9A'}}>{p.a} répondues · {p.na} N/A · {p.t} total · {isPcf ? 'Mesure : Efficacité des fonctions digitalisées' : 'Mesure : Maturité de la gouvernance IT'}</p>
      </div>
      {qs.map(q => <QuestionCard key={q.code} q={q} value={data[q.code]} onChange={v => setAnswer(q.code, v)} isPcf={isPcf}/>)}
      <div className="flex justify-between items-center pt-3 border-t border-gray-100 mt-2">
        {prevSec ? <button onClick={() => onGo(ALL_SECTIONS.indexOf(prevSec))} className="px-4 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">← Préc.</button> : <span/>}
        <span className="text-xs text-gray-400">{p.a}/{p.t}</span>
        {isLast ? (
          <button onClick={onDash} className="px-4 py-2 rounded-lg bg-blue-700 text-white text-xs font-medium hover:bg-blue-800">📊 Synthèse →</button>
        ) : nextSec ? (
          <button onClick={() => onGo(ALL_SECTIONS.indexOf(nextSec))} className={`px-4 py-2 rounded-lg text-white text-xs font-medium ${isPcf ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-700 hover:bg-blue-800'}`}>Suivant →</button>
        ) : <span/>}
      </div>
    </div>
  );
}

// ─── Dash Section ─────────────────────────────────────────────────────────────
function DashSection({data, onBack, onSubmit, submitting}) {
  const p1Keys = ['A','B','C','D','P'];
  const p2Keys = ['E','F','G','H','I','J','K','L','M','N','O'];
  const allKeys = [...p1Keys,...p2Keys,'Q'];

  const sc1 = p1Keys.map(s=>sectionScore(s,data)).filter(s=>s!==null);
  const sc2 = p2Keys.map(s=>sectionScore(s,data)).filter(s=>s!==null);
  const avg1 = sc1.length ? +(sc1.reduce((a,b)=>a+b,0)/sc1.length).toFixed(2) : null;
  const avg2 = sc2.length ? +(sc2.reduce((a,b)=>a+b,0)/sc2.length).toFixed(2) : null;
  const allSc = allKeys.map(s=>sectionScore(s,data)).filter(s=>s!==null);
  const avgG = allSc.length ? +(allSc.reduce((a,b)=>a+b,0)/allSc.length).toFixed(2) : null;
  const lG = scoreLevel(avgG), l1 = scoreLevel(avg1), l2 = scoreLevel(avg2);
  const prog = totalProgress(data);
  const pct = Math.round((prog.answered+prog.na)/prog.total*100);
  const critiques = allKeys.filter(sid=>{const sc=sectionScore(sid,data);return sc!==null&&sc<2.5;}).map(sid=>SLB[sid]);
  const bons = allKeys.filter(sid=>{const sc=sectionScore(sid,data);return sc!==null&&sc>=3.5;}).map(sid=>SLB[sid]);

  const ScoreCards = ({keys, isPcf}) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
      {keys.map(sid => {
        const sc = sectionScore(sid, data); const lv = scoreLevel(sc); const p = secProgress(sid, data);
        const pct2 = sc ? Math.round((sc/5)*100) : 0;
        return (
          <div key={sid} className={`rounded-xl p-3 border ${isPcf ? 'border-green-100 bg-green-50/30' : 'border-blue-100 bg-blue-50/30'}`}>
            <p className="text-xs text-gray-400">Section {sid}</p>
            <p className="text-xs font-medium text-gray-700 leading-tight mb-1">{SLB[sid]}</p>
            <p className="text-xl font-bold" style={{color:lv.c}}>{sc!==null?sc.toFixed(1):'—'}</p>
            <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full font-medium ${lv.b==='b0'?'bg-red-100 text-red-700':lv.b==='b1'?'bg-orange-100 text-orange-700':lv.b==='b2'?'bg-gray-100 text-gray-600':lv.b==='b3'?'bg-green-100 text-green-700':'bg-emerald-100 text-emerald-700'}`}>{lv.l} — {lv.t}</span>
            {p.na>0&&<span className="ml-1 text-xs px-1 py-0.5 rounded-full bg-gray-100 text-gray-500">{p.na} N/A</span>}
            <div className="h-1 bg-gray-200 rounded-full mt-2"><div className="h-1 rounded-full" style={{width:`${pct2}%`,backgroundColor:lv.c}}/></div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div>
      <p className="font-semibold text-gray-800 mb-1">📊 Tableau de Synthèse — Gouvernance IT & Efficacité Digitale</p>
      <p className="text-xs text-gray-400 mb-4">MEA01-QUEST-GOV-PCF-001 · {data.id_pays||''} {data.id_filiale||'Filiale non renseignée'}</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[[avgG, lG, 'Score global', pct+'% traité'],[avg1, l1, 'Gouvernance IT', 'COBIT® 2019'],[avg2, l2, 'Efficacité Digitale', 'PCF V7.4']].map(([v,lv,l,sub])=>(
          <div key={l} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
            <p className="text-xs text-gray-500 mb-1">{l}</p>
            <p className="text-xl font-bold" style={{color:lv.c}}>{v?v.toFixed(1):'—'}/5</p>
            <p className="text-xs text-gray-400">{sub}</p>
          </div>
        ))}
      </div>
      <div className={`mb-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200`}>
        <p className="text-xs font-semibold text-blue-700 mb-2">🛡️ Partie 1 — Gouvernance IT (COBIT® 2019)</p>
        <ScoreCards keys={p1Keys} isPcf={false}/>
      </div>
      <div className="mb-4 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
        <p className="text-xs font-semibold text-green-700 mb-2">🌿 Partie 2 — Efficacité Processus Métier (PCF V7.4)</p>
        <ScoreCards keys={p2Keys} isPcf={true}/>
      </div>
      {critiques.length > 0 && <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3"><p className="text-xs font-semibold text-red-700 mb-1">⚠️ Domaines critiques (score &lt; 2.5) :</p><p className="text-xs text-red-600">{critiques.join(' · ')}</p></div>}
      {bons.length > 0 && <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3"><p className="text-xs font-semibold text-green-700 mb-1">✅ Domaines conformes (score ≥ 3.5) :</p><p className="text-xs text-green-600">{bons.join(' · ')}</p></div>}
      <p className="text-xs text-gray-400 italic mb-4">ℹ️ Les réponses N/A sont exclues du calcul. Les scores COBIT reflètent la maturité de gouvernance ; les scores PCF reflètent l'efficacité des fonctions digitalisées.</p>
      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
        <button onClick={onBack} className="px-4 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">← Retour</button>
        <button onClick={onSubmit} disabled={submitting} className="px-5 py-2.5 rounded-xl bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50">
          {submitting ? 'Envoi...' : '💾 Soumettre le questionnaire'}
        </button>
      </div>
    </div>
  );
}
