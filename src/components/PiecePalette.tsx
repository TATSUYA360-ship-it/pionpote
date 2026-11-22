// PiecePalette.tsx : la boîte à outils de l'éditeur.
// On choisit une pièce puis on touche une case pour la poser,
// ou la gomme pour enlever une pièce. "Déplacer" permet de glisser les pièces.
import type { PieceCode } from "@/lib/position";
import styles from "./PiecePalette.module.css";

export type Tool = "move" | "erase" | PieceCode;

// On utilise le dessin "plein" pour les deux couleurs : le CSS colorie en blanc ou en noir.
// Le petit caractère invisible \uFE0E empêche l'iPhone de transformer ♟ en émoji.
const GLYPH: Record<string, string> = {
  K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟",
};
const symbol = (p: PieceCode) => GLYPH[p[1]] + "\uFE0E";
// Nom de chaque pièce, accordé au féminin quand il faut (« dame blanche »).
const NAME: Record<PieceCode, string> = {
  wK: "roi blanc", wQ: "dame blanche", wR: "tour blanche",
  wB: "fou blanc", wN: "cavalier blanc", wP: "pion blanc",
  bK: "roi noir", bQ: "dame noire", bR: "tour noire",
  bB: "fou noir", bN: "cavalier noir", bP: "pion noir",
};

const WHITE: PieceCode[] = ["wK", "wQ", "wR", "wB", "wN", "wP"];
const BLACK: PieceCode[] = ["bK", "bQ", "bR", "bB", "bN", "bP"];

type Props = { tool: Tool; onChange: (t: Tool) => void };

export default function PiecePalette({ tool, onChange }: Props) {
  const pieceButton = (p: PieceCode) => (
    <button
      key={p}
      type="button"
      className={`${styles.piece} ${p[0] === "w" ? styles.white : styles.black} ${tool === p ? styles.active : ""}`}
      onClick={() => onChange(tool === p ? "move" : p)}
      aria-pressed={tool === p}
      title={`Poser : ${NAME[p]}`}
    >
      {symbol(p)}
    </button>
  );

  return (
    <div className={styles.palette}>
      <div className={styles.row}>{WHITE.map(pieceButton)}</div>
      <div className={styles.row}>{BLACK.map(pieceButton)}</div>
      <div className={styles.row}>
        <button
          type="button"
          className={`btn ${styles.tool} ${tool === "move" ? styles.active : ""}`}
          onClick={() => onChange("move")}
          aria-pressed={tool === "move"}
        >
          Déplacer
        </button>
        <button
          type="button"
          className={`btn ${styles.tool} ${tool === "erase" ? styles.active : ""}`}
          onClick={() => onChange(tool === "erase" ? "move" : "erase")}
          aria-pressed={tool === "erase"}
        >
          Gomme
        </button>
      </div>
    </div>
  );
}
