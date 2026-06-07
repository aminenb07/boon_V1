# PRESENTATION DE SOUTENANCE - BOON

## SLIDE 1: PAGE DE COUVERTURE
**Titre**: BOON - Gestion des Documents de Construction
**Sous-titre**: Système collaboratif pour les chantiers de construction
**Mots clés**:
- OFPPT - Soutenance de projet
- Auteur: [Votre Nom]
- Filière: [Votre Filière]
- Année: 2026

**Suggested Screenshot**: Logo BOON en grand
**Suggested Diagram**: Aucun


## SLIDE 2: PRÉSENTATION DU PROJET
**Titre**: Présentation du Projet
**Points clés**:
- Application web collaborative
- Pour les chantiers de construction
- Gère les bons de commande, factures et devis
- 3 rôles: Propriétaire, Ouvrier, Fournisseur

**Suggested Screenshot**: Tableau de bord principal
**Suggested Diagram**: Vue d'ensemble des rôles


## SLIDE 3: PROBLÈME ET OBJECTIFS
**Titre**: Problème & Objectifs
**Points clés**:
- Gestion des documents papier peu pratique
- Manque de traçabilité sur les chantiers
- Difficulte de communication entre acteurs

**Suggested Screenshot**: Exemples de documents papier
**Suggested Diagram**: Aucun


## SLIDE 4: SOLUTION PROPOSÉE
**Titre**: Solution Proposée
**Points clés**:
- Application web responsive
- Stockage centralisé des documents
- Collaboration temps réel via salles de chantier
- Génération PDF automatique
- Partage via WhatsApp

**Suggested Screenshot**: Création d'un document
**Suggested Diagram**: Aucun


## SLIDE 5: FONCTIONNALITÉS PRINCIPALES
**Titre**: Fonctionnalités Principales
**Points clés**:
1. Gestion des salles de chantier
2. Création et partage de documents
3. Génération PDF
4. Lien Ouvrier-Fournisseur
5. Tableaux de bord et analytics

**Suggested Screenshot**: Liste des documents
**Suggested Diagram**: Aucun


## SLIDE 6: FLUX UTILISATEUR
**Titre**: Flux Utilisateur
**Points clés**:
- Propriétaire: Crée salle → Invite → Voir docs
- Ouvrier: Rejoindre salle → Lier fournisseur
- Fournisseur: Créer docs → Partager dans salle

**Suggested Screenshot**: Salle de chantier active
**Suggested Diagram**: Flux du travail


## SLIDE 7: ARCHITECTURE TECHNIQUE
**Titre**: Architecture Technique
**Points clés**:
- Frontend: React 19 + Vite
- Backend: Laravel 12 API REST
- Base de données: SQLite
- Déploiement: Locale (future: cloud)

**Suggested Screenshot**: Aucun
**Suggested Diagram**: Architecture 3 tiers (React → Laravel → DB)


## SLIDE 8: CONCEPTION BASE DE DONNÉES
**Titre**: Conception Base de Données
**Points clés**:
- Tables principales: users, rooms, documents, items
- 3 rôles: owner, worker, supplier
- Lien many-to-many: worker_supplier_links

**Suggested Screenshot**: Aucun
**Suggested Diagram**: Diagramme ER simplifié


## SLIDE 9: STACK TECHNIQUE
**Titre**: Stack Technique
**Points clés**:
- Frontend: React 19, TypeScript, Tailwind CSS
- Backend: Laravel 12, PHP
- PDF: laravel-dompdf
- Build: Vite, Composer

**Suggested Screenshot**: Aucun
**Suggested Diagram**: Aucun


## SLIDE 10: SCÉNARIO DE DÉMONSTRATION
**Titre**: Scénario de Démonstration
**Points clés**:
1. Créer un compte (Propriétaire)
2. Créer une salle de chantier
3. Ouvrier rejoint et lie fournisseur
4. Fournisseur crée un devis
5. Télécharger le PDF et partager

**Suggested Screenshot**: Processus de démonstration en action
**Suggested Diagram**: Aucun


## SLIDE 11: DÉFIS ET SOLUTIONS
**Titre**: Défis & Solutions
**Points clés**:
- Authentification sécurisée: JWT-like tokens
- PDF responsive: dompdf
- Gestion des rôles: Middlewares Laravel

**Suggested Screenshot**: Aucun
**Suggested Diagram**: Aucun


## SLIDE 12: RÉSULTATS ET AMÉLIORATIONS
**Titre**: Résultats & Perspectives
**Points clés**:
- MVP fonctionnel complet
- Testé avec des rôles réels
- Futures améliorations: Cloud, Notifications push

**Suggested Screenshot**: Exemple de PDF généré
**Suggested Diagram**: Aucun


## SLIDE 13: REMERCIEMENTS ET QUESTIONS
**Titre**: Merci pour votre attention !
**Points clés**:
- Questions ?
- Liens du projet: GitHub
- Contact: [Votre Email]

**Suggested Screenshot**: Logo BOON
**Suggested Diagram**: Aucun
