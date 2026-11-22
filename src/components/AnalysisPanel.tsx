// AnalysisPanel.tsx : affiche les 3 meilleurs coups trouvés par Stockfish
// et la liste des pièces en danger. Le bouton « Voir » lance l'animation manga du coup.
// Pour les débutants : chaque coup est écrit en toutes lettres (« cavalier en f3 »)
// et le score est traduit en mots (« un peu mieux ») au lieu de « +0.6 ».
import type { DangerPiece } from "@/lib/danger";
import { uciToSan } from "@/lib/evaluation";
import { coupEnMots, scoreEnMots } from "@/lib/faits";
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
    <div className={`card ${styles.panel}`}>
      <h2 className="titre">Les 3 meilleurs coups</h2>
      <ol className={styles.moves}>
        {lines.map((line) => (
          <li key={line.multipv} className={line.multipv === 1 ? styles.best : ""}>
            <span className={styles.san}>{uciToSan(fen, line.pv[0])}</span>
            <span className={styles.desc}>
              {coupEnMots(fen, line.pv[0])}
              <span className={styles.score}>{scoreEnMots(line)}</span>
            </span>
            <button
              type="button"
              className={`btn btn-petit ${styles.play}`}
              onClick={() => onShowMove(line.pv[0])}
            >
              voir
            </button>
          </li>
        ))}
      </ol>
      <p className={styles.hint}>
        Conseils pour {turn === "w" ? "les Blancs" : "les Noirs"}. Sur le plateau : flèche verte = le
        meilleur coup, flèche orange = ce que l&apos;adversaire menace, rond rouge = pièce en danger.
      </p>
      {danger.length > 0 && (
        <>
          <h2 className={`titre ${styles.dangerTitle}`}>Pièces en danger</h2>
          <ul className={styles.danger}>
            {danger.map((d) => (
              <li key={d.square} className={styles.dangerItem}>
                <span className={styles.square}>{d.square}</span>{" "}
                {d.reason === "non défendue" ? "attaquée, personne ne la protège" : "attaquée par une pièce moins chère"}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
