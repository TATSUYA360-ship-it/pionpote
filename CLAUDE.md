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

## Où en est-on
- Étape 1 (plateau + moteur) : faite.
- Étape 2 (explications par l'IA) : à faire. La clé API Claude doit rester côté serveur (route API Next.js +
  variable d'environnement), jamais dans le code du navigateur.
- Étape 3 (photo) et étape 4 (chat) : à faire.

## Règles de travail
- Faire un commit git à chaque fois qu'une partie marche.
- Vérifier avec `npm run lint` et `npm run build` avant de dire que c'est fini.
- Stockfish donne le score du point de vue du camp qui joue : convertir avant d'afficher (voir `src/lib/evaluation.ts`).
