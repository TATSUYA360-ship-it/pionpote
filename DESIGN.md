# Style PionPote — les règles de design

Ce fichier fixe le look de l'appli pour que chaque nouvelle étape (explications, chat, quiz…)
ressemble au reste. Les valeurs sont dans `src/app/globals.css` : **toujours utiliser les variables,
jamais écrire une couleur ou une taille à la main.**

## L'esprit
Une planche de manga pour débutants : papier beige à petits points, traits d'encre noirs épais,
ombres dures (décalées, jamais floues), couleurs franches. Joyeux, lisible, sans jargon.
Pensé d'abord pour l'iPhone (une colonne, gros boutons), puis l'ordinateur (2 colonnes dès 900 px).

## Couleurs (chacune a UN sens)
| Variable | Sens |
|---|---|
| `--green` / `--green-soft` | bon coup, action principale (comme la flèche verte) |
| `--red` / `--red-soft` | pièce en danger, gaffe (comme les cases rouges) |
| `--orange` | menace de l'adversaire (flèche orange) |
| `--yellow` | bouton manga (« Voir », « Revoir »), choix sélectionné, focus clavier |
| `--blue-soft` | Pote qui réfléchit |
| `--bg`, `--card`, `--text`, `--muted`, `--ink` | papier, cartes, texte, texte discret, encre |

Le mode sombre est géré automatiquement par les mêmes variables : ne pas le coder composant par composant.

## Typo
- Titres : police manga **Bangers** (`var(--font-manga)`), classe `.title-manga`. Jamais pour un texte long.
- Texte : police du système, 15–16 px, interligne 1.4. Astuces et aides : 13–14 px, couleur `--muted`.
- Coups d'échecs (e4, Cf3) : gras, 20 px.

## Espacements et formes
- Espacements : seulement `--s1` (4) `--s2` (8) `--s3` (12) `--s4` (16) `--s5` (24).
- Bordure : `var(--line)` (2,5 px d'encre). Ombre : `var(--shadow)`, ou `var(--shadow-lg)` pour le plateau.
- Arrondis : `--radius` (14 px) pour les cartes et le gros bouton, `--radius-sm` (10 px) pour le reste.

## Composants à réutiliser
- `.btn` bouton normal, `.btn btn-main` action principale verte (une seule par écran),
  `.btn btn-manga` petit bouton jaune. Hauteur mini 44 px (taille d'un doigt). Quand on appuie, il « s'enfonce ».
- `.card` : encadré blanc à trait d'encre pour regrouper un bloc (résultats, corriger la position…).
- Bulle de Pote : couleur selon l'humeur (vert content, rouge paniqué, bleu pensif, blanc neutre).
  Pote parle **toujours** juste au-dessus du plateau sur téléphone.

## Ordre de l'écran sur téléphone
Photo → Pote → plateau → « Qui joue ? » + Analyser → résultats → corriger la position.
(Réglé avec `order` dans `BoardEditor.module.css`.)

## Animations
Style manga (traits de vitesse, BAM !, secousse) seulement pour montrer un coup. Toujours respecter
`prefers-reduced-motion`. Pas d'animation décorative ailleurs.

## Pièges iPhone
- Ajouter `︎` après un symbole d'échecs (♟) sinon l'iPhone l'affiche en émoji.
- Prévoir l'encoche : `env(safe-area-inset-…)` (déjà dans `.container`).
- Après un changement de style, augmenter `CACHE` dans `public/sw.js`.
