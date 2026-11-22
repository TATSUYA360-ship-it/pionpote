// PiecePalette.tsx : la boîte à outils de l'éditeur.
// On choisit une pièce puis on touche une case pour la poser,
// ou la gomme pour enlever une pièce. "Déplacer" permet de glisser les pièces.
import type { PieceCode } from "@/lib/position";
import styles from "./PiecePalette.module.css";

export type Tool = "move" | "erase" | PieceCode;

const SYMBOL: Record<PieceCode, string> = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟",
};
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
      className={`${styles.piece} ${tool === p ? styles.active : ""}`}
      onClick={() => onChange(tool === p ? "move" : p)}
      aria-pressed={tool === p}
      title={`Poser : ${NAME[p]}`}
    >
      {SYMBOL[p]}
    </button>
  );

  return (
    <div className={styles.palette}>
      <div className={styles.row}>{WHITE.map(pieceButton)}</div>
      <div className={styles.row}>{BLACK.map(pieceButton)}</div>
      <div className={styles.row}>
        <button
          type="button"
          className={`${styles.tool} ${tool === "move" ? styles.active : ""}`}
          onClick={() => onChange("move")}
          aria-pressed={tool === "move"}
        >
          ✋ Déplacer
        </button>
        <button
          type="button"
          className={`${styles.tool} ${tool === "erase" ? styles.active : ""}`}
          onClick={() => onChange(tool === "erase" ? "move" : "erase")}
          aria-pressed={tool === "erase"}
        >
          🧽 Gomme
        </button>
      </div>
    </div>
  );
}
