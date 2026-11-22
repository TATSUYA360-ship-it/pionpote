# PionPote ♟️

Ton pote pour comprendre une position d'échecs. Étape 1 : un plateau où tu places les pièces,
et Stockfish qui te montre le meilleur coup.

## Lancer l'appli sur ton ordinateur

Il te faut [Node.js](https://nodejs.org) (version 20 ou plus). Puis, dans un terminal, dans ce dossier :

```bash
npm install      # télécharge les bibliothèques (une seule fois)
npm run dev      # lance l'appli
```

Ouvre ensuite http://localhost:3000 dans ton navigateur. Pour arrêter : `Ctrl + C` dans le terminal.

Pour tester sur ton téléphone (sur le même Wi-Fi) : `npm run dev -- -H 0.0.0.0`, puis ouvre
`http://<adresse-IP-de-ton-ordi>:3000` sur le téléphone.

## Installer PionPote comme une appli sur iPhone

Une fois l'appli en ligne (avec une adresse en https, par exemple sur Vercel) :

1. Ouvre l'adresse dans **Safari**.
2. Touche le bouton **Partager** (le carré avec une flèche vers le haut).
3. Choisis **Sur l'écran d'accueil**, puis **Ajouter**.

L'icône de Pote apparaît sur ton écran d'accueil. PionPote s'ouvre en plein écran, et le moteur
reste enregistré dans le téléphone, donc l'analyse marche même sans connexion.

## Comment tester

1. Appuie sur **Analyser** avec la position de départ : Pote répond, une flèche verte apparaît, les 3 meilleurs coups s'affichent.
2. **Vider**, puis choisis une pièce dans la palette et touche une case pour la poser. La **Gomme** enlève une pièce.
   En mode **Déplacer**, tu glisses les pièces (glisser une pièce hors du plateau la supprime).
3. Essaie une position fausse (sans roi, ou un pion sur la 8e rangée) : Pote te dit ce qui ne va pas.
4. Mets une pièce attaquée et pas défendue : sa case devient rouge.

## Les fichiers, expliqués

| Fichier | À quoi il sert |
|---|---|
| `src/app/page.tsx` | La page d'accueil : le titre et l'éditeur. |
| `src/app/layout.tsx` | Le cadre commun à toutes les pages (langue française, titre de l'onglet). |
| `src/app/globals.css` | Les couleurs et styles de base (avec un mode sombre automatique). |
| `src/components/BoardEditor.tsx` | Le cœur de l'étape 1 : plateau, choix de qui joue, bouton Analyser, flèche verte, cases rouges. |
| `src/components/PiecePalette.tsx` | La boîte à outils : les 12 pièces, la gomme et le mode Déplacer. |
| `src/components/AnalysisPanel.tsx` | La liste des 3 meilleurs coups et des pièces en danger. |
| `src/components/Pote.tsx` | La mascotte Pote en dessin (SVG), ses 4 expressions et sa bulle. |
| `src/lib/position.ts` | Transforme le plateau en FEN (le texte qui décrit une position) et vérifie que la position est jouable. |
| `src/lib/stockfish.ts` | Parle au moteur Stockfish (dans un Web Worker, pour ne pas figer l'écran). |
| `src/lib/danger.ts` | Repère les pièces en danger avec chess.js. |
| `src/lib/evaluation.ts` | Traduit les chiffres de Stockfish : score lisible, coups en notation française, humeur de Pote. |
| `public/stockfish/` | Le moteur Stockfish 18 « lite » mono-thread (fichier JS + WebAssembly, ~7 Mo). |
| `src/app/manifest.ts` | La carte d'identité de l'appli (nom, icône, plein écran) pour l'installer sur le téléphone. |
| `src/app/apple-icon.png`, `public/icon-*.png` | Les icônes de l'appli (Pote sur fond vert). |
| `public/sw.js` | Le service worker : garde l'appli et le moteur dans le téléphone pour qu'ils marchent sans connexion. |
| `src/components/ServiceWorker.tsx` | Installe le service worker au chargement de la page. |
| `src/components/MangaFx.tsx`, `src/lib/moveFx.ts` | Les animations manga des coups (traits de vitesse, BAM !, ÉCHEC !). |
| `CLAUDE.md` | La vision du projet, pour que Claude Code s'en souvienne aux prochaines étapes. |
| `*.module.css` | Le style de chaque composant (chaque fichier CSS va avec le composant du même nom). |

## Licence

Stockfish est sous licence GPLv3 (voir https://github.com/nmrugg/stockfish.js).
