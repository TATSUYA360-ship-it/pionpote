// AnalysisPanel.tsx : affiche les 3 meilleurs coups trouvés par Stockfish
// et la liste des pièces en danger. Le bouton « Voir » lance l'animation manga du coup.
import type { DangerPiece } from "@/lib/danger";
import { formatScore, uciToSan } from "@/lib/evaluation";
import type { Color } from "@/lib/position";
import type { EngineLine } from "@/lib/stockfish";
import styles from "./AnalysisPanel.module.css";

type Props = {
  fen: string;
  turn: Color;
  lines: EngineLine[];
  danger: DangerPiece[];
  onShowMove: (uci: string) => void;
};

export default function AnalysisPanel({ fen, turn, lines, danger, onShowMove }: Props) {
  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>Les 3 meilleurs coups</h2>
      <ol className={styles.moves}>
        {lines.map((line) => (
          <li key={line.multipv} className={line.multipv === 1 ? styles.best : ""}>
            <span className={styles.san}>{uciToSan(fen, line.pv[0])}</span>
            <span className={styles.score}>{formatScore(line, turn)}</span>
            <button
              type="button"
              className={styles.play}
              onClick={() => onShowMove(line.pv[0])}
            >
              ▶ Voir
            </button>
          </li>
        ))}
      </ol>
      <p className={styles.hint}>
        Le score est vu des Blancs : + = avantage Blancs, − = avantage Noirs.
        1.0 ≈ un pion d&apos;avance.
      </p>
      {danger.length > 0 && (
        <>
          <h2 className={styles.title}>Pièces en danger</h2>
          <ul className={styles.danger}>
            {danger.map((d) => (
              <li key={d.square}>
                Case <strong>{d.square}</strong> : {d.reason}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
