# PionPote

Appli web pour expliquer les échecs à des débutants pendant une vraie partie.
L'utilisateur est débutant en code : explique chaque fichier que tu crées ou modifies, en français simple.

## Vision du projet
- On prend une photo ou un screen de l'échiquier.
- L'appli reconstitue la position (via l'API Claude vision), l'utilisateur corrige les erreurs et indique qui joue.
- Stockfish analyse, chess.js repère les pièces attaquées et non défendues.
- Le plateau affiche des flèches : vert = bon coup, rouge = pièce en danger, orange = menace adverse.
- L'API Claude explique en 3 à 5 phrases en français simple, sans jargon, et répond aux questions dans un chat.
- RÈGLE D'OR : l'IA n'invente jamais de coups. Elle reçoit la position, les coups de Stockfish et les pièces en danger, et ne fait qu'expliquer.
- Mascotte : Pote, un petit pion dessiné qui « dit » les explications, avec 4 expressions : content (bon coup), paniqué (gaffe), pensif (question), neutre.
- Plus tard (V2) : mode quiz, suivi de partie photo par photo, niveaux débutant / intermédiaire, lecture vocale.

## Stack
Next.js 15 (TypeScript, App Router, dossier `src/`), react-chessboard v4, chess.js, Stockfish 18 lite mono-thread
(fichiers dans `public/stockfish/`, lancé dans un Web Worker), API Claude plus tard. Interface en français, pensée d'abord pour mobile.

## Appli téléphone
L'utilisateur a un iPhone et veut une appli, pas un site. Choix actuel : PWA (manifest + service worker
`public/sw.js`, ajout à l'écran d'accueil via Safari). Si on change des fichiers mis en cache,
augmenter `CACHE` dans `public/sw.js`. App Store : projet Capacitor prêt (`capacitor.config.ts`, dossier `ios/`). L'appli iPhone ouvre
https://pionpote.vercel.app en plein écran : une mise en ligne sur main met donc aussi l'appli à jour.
Repasser par Xcode seulement si on change `capacitor.config.ts`, `ios/` ou `capacitor-www/`
(puis `npm run ios` sur un Mac). Icône et écran de démarrage : sources dans `resources/`.
Pages exigées par Apple : `/confidentialite` et `/aide`. Le guide de publication est un doc Claude
(« PionPote sur l'App Store : le guide »).

## Où en est-on
- Étape 1 (plateau + moteur) : faite, avec animations manga des coups et version installable (PWA).
- Étape 2 (explications par l'IA) : faite (route `/api/expliquer`). La clé API Claude doit rester côté serveur (route API Next.js +
  variable d'environnement), jamais dans le code du navigateur.
- Étape 3 (photo) : faite (route `/api/lire-photo`).
- Étape 4 (chat) : faite. Route `/api/discuter` + composant `ChatPote`. Garde-fou : une réponse qui cite une case
  absente des faits est remplacée par une phrase prudente.

## Design
Avant de toucher à l'interface, lire `DESIGN.md` (le « style PionPote ») et le respecter :
variables de `src/app/globals.css`, boutons `.btn` / `.btn-main` / `.btn-petit`, cartes `.card`,
titres `.titre`, pas d'émojis ni d'ombres. Montrer des captures téléphone avant/après.

## Règles de travail
- Faire un commit git à chaque fois qu'une partie marche.
- Vérifier avec `npm run lint` et `npm run build` avant de dire que c'est fini.
- Stockfish donne le score du point de vue du camp qui joue : convertir avant d'afficher (voir `src/lib/evaluation.ts`).
