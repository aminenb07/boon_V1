# NOTES DE PRÉSENTATION - FRANÇAIS

---

## SLIDE 1: PAGE DE COUVERTURE

Ce qui apparaît à l'écran:
- BOON - Gestion des Documents de Construction
- Système collaboratif pour les chantiers de construction
- OFPPT - Soutenance de projet
- Auteur: [Votre Nom]
- Filière: [Votre Filière]
- Année: 2026

Ce que je dois dire:
Bonjour à tous, merci de votre présence aujourd'hui. Je suis [Votre Nom], étudiant en [Votre Filière]. Je vais vous présenter mon projet de fin d'études intitulé BOON : un système collaboratif pour la gestion des documents sur les chantiers de construction.

Transition vers la diapositive suivante:
Maintenant, je vais vous donner un aperçu général du projet.

Questions possibles du jury:
- Pourquoi avoir choisi ce thème ?
- Qui sont les utilisateurs cibles ?

---

## SLIDE 2: PRÉSENTATION DU PROJET

Ce qui apparaît à l'écran:
- Application web collaborative
- Pour les chantiers de construction
- Gère les bons de commande, factures et devis
- 3 rôles: Propriétaire, Ouvrier, Fournisseur

Ce que je dois dire:
BOON est une application web qui simplifie la gestion des documents sur les chantiers. Elle permet à trois types d'utilisateurs de collaborer : le propriétaire du chantier, l'ouvrier sur place et le fournisseur. Ils peuvent tous créer, partager et consulter des documents comme des devis, des factures ou des bons de livraison.

Transition vers la diapositive suivante:
Avant de vous détailler la solution, je vais vous expliquer le problème que j'ai essayé de résoudre.

Questions possibles du jury:
- Quels types de documents peut-on gérer ?
- Comment sont répartis les rôles ?

---

## SLIDE 3: PROBLÈME ET OBJECTIFS

Ce qui apparaît à l'écran:
- Gestion des documents papier peu pratique
- Manque de traçabilité sur les chantiers
- Difficulte de communication entre acteurs

Ce que je dois dire:
Dans le secteur de la construction, la gestion des documents est souvent faite sur papier, ce qui pose plusieurs problèmes : perte de documents, manque de traçabilité, difficulté à communiquer entre les différents acteurs (propriétaires, ouvriers, fournisseurs). Les objectifs de BOON étaient donc de centraliser ces documents, d'améliorer la traçabilité et de simplifier la collaboration.

Transition vers la diapositive suivante:
Pour répondre à ces problèmes, voici la solution que j'ai développée.

Questions possibles du jury:
- Pourquoi pas une application mobile d'abord ?
- Avez-vous interviewé des utilisateurs ?

---

## SLIDE 4: SOLUTION PROPOSÉE

Ce qui apparaît à l'écran:
- Application web responsive
- Stockage centralisé des documents
- Collaboration temps réel via salles de chantier
- Génération PDF automatique
- Partage via WhatsApp

Ce que je dois dire:
La solution est une application web responsive, accessible depuis n'importe quel appareil connecté. Tous les documents sont stockés dans une base de données centralisée. Les utilisateurs collaborent via des "salles de chantier" virtuelles. On peut générer automatiquement des PDFs et partager les documents via WhatsApp ou un lien direct.

Transition vers la diapositive suivante:
Maintenant, passons en revue les fonctionnalités principales du système.

Questions possibles du jury:
- Est-ce que l'application fonctionne hors ligne ?
- Comment est sécurisée la connexion ?

---

## SLIDE 5: FONCTIONNALITÉS PRINCIPALES

Ce qui apparaît à l'écran:
1. Gestion des salles de chantier
2. Création et partage de documents
3. Génération PDF
4. Lien Ouvrier-Fournisseur
5. Tableaux de bord et analytics

Ce que je dois dire:
Les fonctionnalités principales sont : premièrement, la gestion des salles de chantier : le propriétaire crée une salle, puis les ouvriers et fournisseurs la rejoignent. Deuxièmement, la création et le partage de documents (bons de commande, factures, devis). Troisièmement, la génération automatique de PDFs. Quatrièmement, un système de lien entre ouvriers et fournisseurs. Et enfin, des tableaux de bord pour suivre l'activité.

Transition vers la diapositive suivante:
Pour mieux comprendre comment ça fonctionne, voici le flux utilisateur typique.

Questions possibles du jury:
- Peut-on modifier un document déjà envoyé ?
- Qui a accès à quels documents ?

---

## SLIDE 6: FLUX UTILISATEUR

Ce qui apparaît à l'écran:
- Propriétaire: Crée salle → Invite → Voir docs
- Ouvrier: Rejoindre salle → Lier fournisseur
- Fournisseur: Créer docs → Partager dans salle

Ce que je dois dire:
Voici comment ça fonctionne dans la pratique : le propriétaire crée une salle de chantier et partage le code. Un ouvrier rejoint la salle et y ajoute un fournisseur. Ce fournisseur peut alors créer des documents qui sont visibles par le propriétaire et l'ouvrier lié.

Transition vers la diapositive suivante:
Maintenant que vous savez comment ça fonctionne d'un point de vue utilisateur, je vais vous parler de l'architecture technique.

Questions possibles du jury:
- Comment est géré le droit d'accès ?
- Que se passe-t-il si un utilisateur quitte la salle ?

---

## SLIDE 7: ARCHITECTURE TECHNIQUE

Ce qui apparaît à l'écran:
- Frontend: React 19 + Vite
- Backend: Laravel 12 API REST
- Base de données: SQLite
- Déploiement: Locale (future: cloud)

Ce que je dois dire:
Techniquement, l'application est structurée en 2 parties : un frontend en React 19 avec Vite pour l'interface utilisateur, et un backend en Laravel 12 qui fournit une API REST. La base de données est SQLite pour le développement, mais on peut facilement passer à MySQL ou PostgreSQL pour la production.

Transition vers la diapositive suivante:
Voici maintenant la conception de la base de données.

Questions possibles du jury:
- Pourquoi avoir choisi Laravel ?
- Pourquoi SQLite et pas MySQL ?
- Pourquoi React et pas Vue ou Angular ?

---

## SLIDE 8: CONCEPTION BASE DE DONNÉES

Ce qui apparaît à l'écran:
- Tables principales: users, rooms, documents, items
- 3 rôles: owner, worker, supplier
- Lien many-to-many: worker_supplier_links

Ce que je dois dire:
La base de données est structurée autour de quelques tables principales : users pour les comptes, rooms pour les salles de chantier, documents pour les documents et items pour les lignes de chaque document. Il y a trois rôles : propriétaire, ouvrier et fournisseur. La table worker_supplier_links permet de lier un ouvrier à plusieurs fournisseurs dans une salle.

Transition vers la diapositive suivante:
Maintenant, voici le détail des technologies utilisées.

Questions possibles du jury:
- Avez-vous utilisé un ORM ?
- Comment est gérée la migration de la base de données ?

---

## SLIDE 9: STACK TECHNIQUE

Ce qui apparaît à l'écran:
- Frontend: React 19, TypeScript, Tailwind CSS
- Backend: Laravel 12, PHP
- PDF: laravel-dompdf
- Build: Vite, Composer

Ce que je dois dire:
Pour le frontend, j'utilise React 19, TypeScript pour le typage et Tailwind CSS pour le style. Pour le backend, c'est Laravel 12, un framework PHP robuste. Pour la génération des PDFs, j'utilise la bibliothèque laravel-dompdf.

Transition vers la diapositive suivante:
Maintenant, je vais vous montrer un petit scénario de démonstration pour rendre ça concret.

Questions possibles du jury:
- Pourquoi Tailwind plutôt qu'un autre framework CSS ?
- Avez-vous écrit des tests ?

---

## SLIDE 10: SCÉNARIO DE DÉMONSTRATION

Ce qui apparaît à l'écran:
1. Créer un compte (Propriétaire)
2. Créer une salle de chantier
3. Ouvrier rejoint et lie fournisseur
4. Fournisseur crée un devis
5. Télécharger le PDF et partager

Ce que je dois dire:
Voici le scénario que je vais vous montrer : premièrement, créer un compte en tant que propriétaire. Deuxièmement, créer une salle de chantier. Troisièmement, simuler un ouvrier qui rejoint la salle et lie un fournisseur. Quatrièmement, ce fournisseur crée un devis. Et cinquièmement, télécharger le PDF généré et partager le lien.

Transition vers la diapositive suivante:
Bien sûr, pendant le développement, j'ai rencontré plusieurs défis, que je vais vous décrire.

Questions possibles du jury:
- Pouvez-vous nous faire la démonstration en live ?
- Quelles sont les limitations actuelles ?

---

## SLIDE 11: DÉFIS ET SOLUTIONS

Ce qui apparaît à l'écran:
- Authentification sécurisée: JWT-like tokens
- PDF responsive: dompdf
- Gestion des rôles: Middlewares Laravel

Ce que je dois dire:
Les principaux défis rencontrés : premièrement, l'authentification : j'ai mis en place un système de tokens sécurisé avec refresh token. Deuxièmement, la génération de PDFs responsive : j'ai utilisé dompdf, une bibliothèque Laravel. Troisièmement, la gestion des rôles et droits d'accès : avec les middlewares de Laravel, j'ai pu vérifier le rôle de l'utilisateur avant chaque requête.

Transition vers la diapositive suivante:
Malgré ces défis, j'ai obtenu des résultats concrets, et j'ai déjà des idées pour améliorer le projet.

Questions possibles du jury:
- Quel a été le plus grand défi ?
- Comment avez-vous résolu les bugs ?
- Pourquoi pas du vrai JWT ?

---

## SLIDE 12: RÉSULTATS ET AMÉLIORATIONS

Ce qui apparaît à l'écran:
- MVP fonctionnel complet
- Testé avec des rôles réels
- Futures améliorations: Cloud, Notifications push

Ce que je dois dire:
Au final, j'ai un MVP (Minimum Viable Product) complet et fonctionnel, testé avec des utilisateurs jouant les différents rôles. Pour l'avenir, les améliorations prévues sont : déploiement sur le cloud, notifications push, historique des modifications et peut-être une application mobile.

Transition vers la diapositive suivante:
Voilà qui conclut ma présentation. Je suis prêt à répondre à toutes vos questions.

Questions possibles du jury:
- Que feriez-vous différemment si vous deviez recommencer ?
- Avez-vous l'intention de commercialiser ce projet ?
- Qu'avez-vous appris le plus pendant ce projet ?

---

## SLIDE 13: REMERCIEMENTS ET QUESTIONS

Ce qui apparaît à l'écran:
- Merci pour votre attention !
- Questions ?
- Liens du projet: GitHub
- Contact: [Votre Email]

Ce que je dois dire:
Merci beaucoup pour votre attention et votre temps. Je serais ravi de répondre à toutes vos questions. Le projet est disponible sur GitHub, et vous pouvez me contacter à cette adresse email si vous avez d'autres questions par la suite.

Questions possibles du jury:
- (Toutes les questions restantes !)
