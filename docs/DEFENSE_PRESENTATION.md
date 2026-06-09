# PRESENTATION DE SOUTENANCE - BOON (PLAN OFPPT)

## 1. Page de garde

- Titre du projet : BOON - Gestion des Documents de Construction
- Nom, prénom : Amine Nbaou
- Promotion / Année : DevOWFS 204 / 2026
- Établissement de formation : OFPPT
- Logos : BOON + OFPPT

## 2. Sommaire

- Introduction & objectifs
- Problématique
- Fonctionnalités principales
- Conception (Diagrammes)
- Choix techniques
- Réalisation – Démonstration
- Difficultés rencontrées
- Bilan & améliorations possibles
- Conclusion & questions

## 3. Introduction & objectifs

- Présentation générale : Application web collaborative pour gérer les documents sur les chantiers de construction (bons de commande, factures, devis)
- Pourquoi ce projet ? : Besoin identifié dans le secteur de la construction : gestion papier peu pratique, manque de traçabilité, difficulté de communication entre les acteurs
- Objectifs visés :
  - Centraliser tous les documents des chantiers
  - Améliorer la collaboration entre propriétaires, ouvriers et fournisseurs
  - Générer des PDFs professionnels automatiquement
  - Simplifier le partage des documents (WhatsApp, liens)

## 4. Problématique

- Question claire : Comment simplifier et centraliser la gestion des documents de construction pour améliorer la collaboration entre les acteurs d'un chantier ?
- Réponse du projet : BOON propose une plateforme unique avec gestion des salles de chantier, 3 rôles d'utilisateurs, partage sécurisé et génération PDF automatique.

## 5. Fonctionnalités principales

1. Gestion des salles de chantier (création, accès, statut)
2. Création et partage de documents (bon de commande, facture, devis)
3. Lien entre ouvriers et fournisseurs dans une salle
4. Génération automatique de documents PDF
5. Tableaux de bord et analytics

## 6. Conception

- Diagramme de cas d'utilisation
- Diagramme de classe (modèle de données)

## 7. Choix techniques

- Frontend : React 19 + JavaScript + Tailwind CSS + Vite
- Backend : Laravel 12 (PHP) + API REST
- Base de données : MySQL
- Outils utilisés : VS Code, Git
- PDF : barryvdh/laravel-dompdf

## 8. Réalisation – Démonstration

Scénario principal :

1. Création d'un compte Propriétaire
2. Création d'une salle de chantier
3. Ouvrier rejoint la salle via le code
4. Ouvrier lie un fournisseur à la salle
5. Fournisseur crée un devis
6. Téléchargement du PDF et partage

## 9. Difficultés rencontrées

1. Difficulté : Authentification sécurisée avec refresh tokens
   -> Solution : Système personnalisé avec refresh tokens stockés dans la DB et middleware Laravel
2. Difficulté : Génération de PDF responsive avec les données des documents
   -> Solution : Utilisation de la bibliothèque barryvdh/laravel-dompdf avec un template Blade
3. Difficulté : Gestion des droits d'accès par rôle (owner/worker/supplier)
   -> Solution : Middleware personnalisé BoonRequireRole pour vérifier les rôles avant chaque requête

## 10. Bilan & améliorations possibles

- Ce qui a été réussi : MVP complet fonctionnel, tous les objectifs atteints, collaboration testée avec les 3 rôles
- Améliorations possibles :
  - Déploiement sur le cloud (Render, AWS)
  - Notifications push en temps réel
  - Mode hors ligne
  - Historique complet des modifications des documents
- Compétences développées :
  - Développement full-stack (React + Laravel)
  - Conception UML
  - Gestion de projet Git
  - Gestion d'authentification et droits d'accès

## 11. Conclusion & questions

- Rappel de l'intérêt : BOON améliore la productivité sur les chantiers en centralisant les documents et simplifiant la collaboration
- Remerciements : Remerciements à mon formateur, à l'OFPPT
- Slide « Merci / Questions »
