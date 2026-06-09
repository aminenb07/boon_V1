# NOTES DE PRESENTATION - BOON (PLAN OFPPT)

---

## SLIDE 1 - PAGE DE GARDE

Ce qui apparaît à l'écran :

- Titre du projet : BOON - Gestion des Documents de Construction
- Logos : BOON + placeholders OFPPT
- Infos : Amine Nbaou / DevOWFS 204 / 2026 / OFPPT

Ce que je dois dire :
Bonjour à tous, merci de votre présence aujourd’hui. Je suis Amine Nbaou, étudiant en DevOWFS 204 à l’OFPPT. Je vais vous présenter mon projet de fin d’études : BOON, une application web collaborative pour la gestion des documents de construction.

Transition vers la diapositive suivante :
Tout d’abord, voici le sommaire de ma présentation.

Questions possibles du jury :

- Pourquoi avoir choisi ce thème ?
- Combien de temps a duré le projet ?

---

## SLIDE 2 - SOMMAIRE

Ce qui apparaît à l'écran :
Liste des 9 parties de la présentation.

Ce que je dois dire :
Voici le plan de ma présentation : nous allons commencer par l’introduction et les objectifs, puis la problématique, les fonctionnalités, la conception, les choix techniques, la démonstration, les difficultés rencontrées, le bilan, et enfin la conclusion avec vos questions.

Transition vers la diapositive suivante :
Commençons par l’introduction.

---

## SLIDE 3 - INTRODUCTION & OBJECTIFS

Ce qui apparaît à l'écran :

- Présentation générale
- Pourquoi ce projet ?
- Objectifs visés

Ce que je dois dire :
BOON est une application web collaborative qui permet de gérer tous les documents des chantiers de construction : bons de commande, factures, devis. J’ai choisi ce projet car dans le secteur de la construction, la gestion papier est peu pratique, il manque de traçabilité et la communication entre les acteurs (propriétaires, ouvriers, fournisseurs) est souvent compliquée.
Mes objectifs étaient donc : centraliser tous ces documents, améliorer la collaboration, générer des PDF professionnels automatiquement et simplifier le partage.

Transition vers la diapositive suivante :
Pour répondre à ce besoin, j’ai défini une problématique claire.

---

## SLIDE 4 - PROBLEMATIQUE

Ce qui apparaît à l'écran :

- Question claire
- Réponse du projet

Ce que je dois dire :
Ma problématique est la suivante : comment simplifier et centraliser la gestion des documents de construction pour améliorer la collaboration entre les acteurs d’un chantier ?
La réponse de BOON est une plateforme unique avec des salles de chantier virtuelles, 3 rôles d’utilisateurs, un partage sécurisé et une génération PDF automatique.

Transition vers la diapositive suivante :
Voyons maintenant les fonctionnalités principales de l’application.

---

## SLIDE 5 - FONCTIONNALITES PRINCIPALES

Ce qui apparaît à l'écran :
5 fonctionnalités clés numérotées.

Ce que je dois dire :
Les 5 fonctionnalités clés de BOON sont :

1. La gestion des salles de chantier : le propriétaire crée une salle et partage un code d’accès
2. La création et le partage des documents (bons de commande, factures, devis)
3. Le lien entre ouvriers et fournisseurs dans chaque salle
4. La génération automatique de PDF professionnels
5. Les tableaux de bord et analytics pour suivre l’activité

Transition vers la diapositive suivante :
Pour concevoir tout ça, j’ai réalisé des diagrammes UML.

---

## SLIDE 6 - CONCEPTION

Ce qui apparaît à l'écran :

- Titre
- 2 diagrammes (ou placeholders)

Ce que je dois dire :
Pour la conception, j’ai d’abord réalisé un diagramme de cas d’utilisation qui montre toutes les interactions possibles entre les utilisateurs et l’application, puis un diagramme de classe qui représente les tables de la base de données et leurs relations.

Transition vers la diapositive suivante :
Maintenant, les choix techniques que j’ai faits.

---

## SLIDE 7 - CHOIX TECHNIQUES

Ce qui apparaît à l'écran :

- Frontend : React 19 + JavaScript + Tailwind CSS + Vite
- Backend : Laravel 12 + API REST
- Base de données : MySQL
- Outils : VS Code, Git

Ce que je dois dire :
Pour le frontend, j'ai utilisé React 19 avec JavaScript, Tailwind CSS pour le style, et Vite comme outil de build. Pour le backend, c'est Laravel 12 avec une API REST. La base de données est MySQL. Les outils utilisés sont VS Code pour le développement et Git pour la gestion de versions. Pour la génération PDF, j'ai utilisé la bibliothèque barryvdh/laravel-dompdf.

Transition vers la diapositive suivante :
Passons à la démonstration du scénario principal.

---

## SLIDE 8 - REALISATION - DEMONSTRATION

Ce qui apparaît à l'écran :
6 étapes du scénario.

Ce que je dois dire :
Voici le scénario que je vais vous montrer :

1. Création d’un compte Propriétaire
2. Création d’une salle de chantier
3. Ouvrier rejoint la salle via le code
4. Ouvrier lie un fournisseur à la salle
5. Fournisseur crée un devis
6. Téléchargement du PDF et partage

(Faire la démonstration en direct si possible)

Transition vers la diapositive suivante :
Bien sûr, pendant le développement, j’ai rencontré des difficultés.

---

## SLIDE 9 - DIFFICULTES RENCONTREES

Ce qui apparaît à l'écran :
3 difficultés et leurs solutions.

Ce que je dois dire :
Les 3 difficultés principales que j’ai rencontrées :

1. L’authentification sécurisée avec refresh tokens : j’ai résolu ça avec un système personnalisé et les middlewares Laravel
2. La génération de PDF responsive : j’ai utilisé la bibliothèque barryvdh/laravel-dompdf avec un template Blade
3. La gestion des droits d’accès par rôle : j’ai créé un middleware personnalisé, BoonRequireRole, pour vérifier les rôles avant chaque requête

Transition vers la diapositive suivante :
Maintenant, le bilan et les améliorations possibles.

---

## SLIDE 10 - BILAN & AMELIORATIONS POSSIBLES

Ce qui apparaît à l'écran :

- Réussi
- Améliorations
- Compétences

Ce que je dois dire :
Pour ce qui est du bilan, j’ai développé un MVP complet et fonctionnel, tous les objectifs initialement fixés ont été atteints.
Pour les améliorations possibles : le déploiement sur le cloud, des notifications push en temps réel, un mode hors ligne, et un historique complet des modifications des documents.
En termes de compétences, j’ai développé : du développement full-stack (React + Laravel), de la conception UML, la gestion de projet avec Git, et la gestion de l’authentification et des droits d’accès.

Transition vers la diapositive suivante :
Pour finir, la conclusion.

---

## SLIDE 11 - CONCLUSION & QUESTIONS

Ce qui apparaît à l'écran :

- Phrase de conclusion
- Merci
- Liens GitHub & email

Ce que je dois dire :
Pour conclure, BOON améliore la productivité sur les chantiers en centralisant les documents et simplifiant la collaboration. Merci à mon formateur et à l’OFPPT pour cet enseignement. Merci à vous pour votre attention. Je suis prêt à répondre à toutes vos questions.

Questions possibles du jury :

- (Toutes les questions du jury !)
