# Style PionPote — les règles de design

Ce fichier fixe le look de l'appli pour que chaque nouvelle étape (explications, chat, quiz…)
ressemble au reste. Les valeurs sont dans `src/app/globals.css` : **toujours utiliser les variables,
jamais écrire une couleur ou une taille à la main.**

## L'esprit
Un carnet de croquis : papier beige à petits points, écriture au feutre pour le logo et les titres,
traits fins, couleurs franches mais peu nombreuses. Simple et « fait main ».
**À éviter** (l'utilisateur trouve que ça « fait IA ») : émojis dans l'interface, ombres dures décalées,
étiquettes/badges, contours épais partout, effets empilés.
Pensé d'abord pour l'iPhone (une colonne, gros boutons), puis l'ordinateur (2 colonnes dès 900 px).

## Couleurs (chacune a UN sens)
| Variable | Sens |
|---|---|
| `--green` / `--green-soft` | bon coup, action principale (comme la flèche verte) |
| `--red` / `--red-soft` | pièce en danger, gaffe (comme les cases rouges) |
| `--orange` | menace de l'adversaire (flèche orange) |
| `--yellow` | surlignage des cases pendant l'animation d'un coup, focus clavier |
| `--blue-soft` | Pote qui réfléchit |
| `--bg`, `--card`, `--text`, `--muted`, `--ink` | papier, cartes, texte, texte discret, encre |

Le mode sombre est géré automatiquement par les mêmes variables : ne pas le coder composant par composant.

## Logo
Version « feutre » : « PionPote » écrit au marqueur (police **Yusei Magic**, `var(--font-feutre)`),
légèrement penché, souligné d'un coup de feutre vert, avec Pote content au-dessus du « e ».
Le filtre SVG `#trait-main` fait trembler un peu le trait, comme à la main.
Pas d'étiquette, pas de contour, pas d'ombre sur le logo : l'utilisateur trouvait que ça « faisait IA ».

## Typo
- Logo et titres de section : police feutre **Yusei Magic** (`var(--font-feutre)`), classe `.titre`.
- Texte : police du système, 15–16 px, interligne 1.4. Astuces et aides : 13–14 px, couleur `--muted`.
- Coups d'échecs (e4, Cf3) : gras, 20 px.
- La police manga **Bangers** sert uniquement aux onomatopées des animations (BAM !, ÉCHEC !).

## Espacements et formes
- Espacements : seulement `--s1` (4) `--s2` (8) `--s3` (12) `--s4` (16) `--s5` (24).
- Bordure : `var(--line)` (1,5 px). **Pas d'ombre.**
- Arrondis : `--radius` (12 px) pour les cartes, `--radius-sm` (10 px) pour les boutons.

## Composants à réutiliser
- `.btn` bouton normal (trait fin, fond transparent), `.btn btn-main` action principale verte
  (une seule par écran), `.btn btn-petit` petit bouton rond (« voir »). Hauteur mini 44 px.
- Pas d'émoji dans les boutons ni les titres : des mots simples.
- `.card` : cadre au trait fin pour regrouper un bloc (résultats, corriger la position…).
- Choix sélectionné (« Qui joue ? ») : rempli à l'encre (fond `--text`, texte `--bg`).
- Bulle de Pote : couleur selon l'humeur (vert content, rouge paniqué, bleu pensif, blanc neutre).
  Pote parle **toujours** juste au-dessus du plateau sur téléphone.

## Ordre de l'écran sur téléphone
Photo → Pote → plateau (+ « Annuler le coup ») → « Qui joue ? » ou « Aux Blancs de jouer » + Analyser → la partie (liste des coups) → résultats → corriger la position.
(Réglé avec `order` dans `BoardEditor.module.css`.)

## Animations
Style manga (traits de vitesse, BAM !, secousse) seulement pour montrer un coup. Toujours respecter
`prefers-reduced-motion`. Pas d'animation décorative ailleurs.

## Pièges iPhone
- Dans les textes, mettre une espace insécable (`\u00a0`) avant ! ? : » et après « pour éviter un signe seul en début de ligne.
- Ajouter `︎` après un symbole d'échecs (♟) sinon l'iPhone l'affiche en émoji.
- Prévoir l'encoche : `env(safe-area-inset-…)` (déjà dans `.container`).
- Après un changement de style, augmenter `CACHE` dans `public/sw.js`.
