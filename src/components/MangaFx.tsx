// MangaFx.tsx : les effets "manga" dessinés par-dessus le plateau pendant un coup.
// - des traits de vitesse le long du trajet de la pièce
// - un éclair d'impact sur les prises, échecs et mats
// - une onomatopée géante (« BAM ! », « ÉCHEC ! »…)
// Tout est en CSS : le composant est recréé à chaque coup (grâce à "key"),
// ce qui relance les animations.
import type { Square } from "chess.js";
import type { MoveFx } from "@/lib/moveFx";
import styles from "./MangaFx.module.css";

type Props = { fx: MoveFx; orientation: "white" | "black" };

/** Centre d'une case, en % de la taille du plateau. */
function center(sq: Square, orientation: "white" | "black") {
  const file = sq.charCodeAt(0) - 97; // a=0 … h=7
  const rank = Number(sq[1]); // 1 … 8
  const col = orientation === "white" ? file : 7 - file;
  const row = orientation === "white" ? 8 - rank : rank - 1;
  return { x: col * 12.5 + 6.25, y: row * 12.5 + 6.25 };
}

export default function MangaFx({ fx, orientation }: Props) {
  const a = center(fx.from, orientation);
  const b = center(fx.to, orientation);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const strong = fx.kind !== "move";

  // L'onomatopée se place au-dessus de la case d'arrivée, sans sortir du plateau.
  const wordX = Math.min(Math.max(b.x, 22), 78);
  const wordY = Math.min(Math.max(b.y - 14, 10), 88);

  return (
    <div className={`${styles.layer} ${styles[fx.kind]}`} aria-hidden="true">
      {/* Traits de vitesse : une bande rayée orientée de la case de départ vers l'arrivée */}
      <div
        className={styles.speed}
        style={{
          left: `${a.x}%`,
          top: `${a.y}%`,
          width: `${length}%`,
          transform: `translateY(-50%) rotate(${angle}deg)`,
        }}
      />

      {strong && (
        <>
          {/* Fond "concentration" : rayons qui pointent vers la case d'arrivée */}
          <div
            className={styles.focus}
            style={{ background: focusGradient(b.x, b.y) }}
          />
          {/* Éclair d'impact en étoile */}
          <svg
            className={styles.burst}
            style={{ left: `${b.x}%`, top: `${b.y}%` }}
            viewBox="-50 -50 100 100"
          >
            <polygon points={starPoints(12, 48, 22)} className={styles.burstOuter} />
            <polygon points={starPoints(12, 30, 14)} className={styles.burstInner} />
          </svg>
        </>
      )}

      <div
        className={styles.word}
        style={{ left: `${wordX}%`, top: `${wordY}%` }}
      >
        {fx.word}
      </div>
    </div>
  );
}

function starPoints(spikes: number, outer: number, inner: number) {
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner * (0.8 + ((i * 37) % 10) / 25);
    const t = (Math.PI * i) / spikes;
    pts.push(`${(Math.cos(t) * r).toFixed(1)},${(Math.sin(t) * r).toFixed(1)}`);
  }
  return pts.join(" ");
}

function focusGradient(x: number, y: number) {
  return `repeating-conic-gradient(from 0deg at ${x}% ${y}%, rgba(0,0,0,0.5) 0deg 2deg, transparent 2deg 9deg)`;
}
