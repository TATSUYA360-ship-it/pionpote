// MangaFx.tsx : les effets "manga" dessinés par-dessus le plateau pendant un coup.
// - des traits de vitesse tracés au feutre derrière la pièce qui glisse
// - des petits traits d'« atterrissage » autour de la case d'arrivée
// - un éclair d'impact sur les prises, échecs et mats
// - une onomatopée géante (« BAM ! », « ÉCHEC ! »…)
// Tout est en CSS : le composant est recréé à chaque coup (grâce à "key"),
// ce qui relance les animations.
// Deux versions :
// - normale (bouton « Voir » d'un coup proposé) : la pièce glisse lentement, effet complet ;
// - rapide (prop rapide) : pendant la partie, juste après un vrai coup joué. Plus court,
//   et pour un coup tout simple on ne montre que le trait, sans onomatopée.
import type { CSSProperties } from "react";
import type { Square } from "chess.js";
import type { MoveFx } from "@/lib/moveFx";
import styles from "./MangaFx.module.css";

type Props = { fx: MoveFx; orientation: "white" | "black"; rapide?: boolean };

/** Centre d'une case, en % de la taille du plateau. */
function center(sq: Square, orientation: "white" | "black") {
  const file = sq.charCodeAt(0) - 97; // a=0 … h=7
  const rank = Number(sq[1]); // 1 … 8
  const col = orientation === "white" ? file : 7 - file;
  const row = orientation === "white" ? 8 - rank : rank - 1;
  return { x: col * 12.5 + 6.25, y: row * 12.5 + 6.25 };
}

export default function MangaFx({ fx, orientation, rapide = false }: Props) {
  const a = center(fx.from, orientation);
  const b = center(fx.to, orientation);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  // Direction du coup (ux, uy) et direction perpendiculaire (px, py), longueur 1.
  const ux = dx / length;
  const uy = dy / length;
  const px = -uy;
  const py = ux;
  const strong = fx.kind !== "move";
  // Un coup simple n'a pas de mot (pas de « SWOOSH »), seulement les traits.
  const showWord = strong && fx.word !== "";

  // Trois traits de vitesse parallèles, un peu décalés, qui s'arrêtent avant la case d'arrivée.
  // Le trait du milieu est plus long, ceux des côtés plus courts : comme dessiné à la main.
  const traits = [
    { off: -3.2, start: 0.15, end: 0.72 },
    { off: 0, start: 0, end: 0.8 },
    { off: 3.2, start: 0.25, end: 0.68 },
  ].map(({ off, start, end }) => {
    const x1 = a.x + dx * start + px * off;
    const y1 = a.y + dy * start + py * off;
    const x2 = a.x + dx * end + px * off;
    const y2 = a.y + dy * end + py * off;
    // Une légère courbe au milieu du trait : jamais parfaitement droit.
    const cx = (x1 + x2) / 2 + px * 0.6;
    const cy = (y1 + y2) / 2 + py * 0.6;
    return `M${x1.toFixed(2)} ${y1.toFixed(2)} Q${cx.toFixed(2)} ${cy.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  });

  // Petits traits d'atterrissage : 4 tirets qui partent des coins de la case d'arrivée.
  const atterrissage = [45, 135, 225, 315].map((deg) => {
    const t = (deg * Math.PI) / 180;
    const r1 = 7.5;
    const r2 = 10.5;
    return `M${(b.x + Math.cos(t) * r1).toFixed(2)} ${(b.y + Math.sin(t) * r1).toFixed(2)} L${(
      b.x + Math.cos(t) * r2
    ).toFixed(2)} ${(b.y + Math.sin(t) * r2).toFixed(2)}`;
  });

  // L'onomatopée se place au-dessus de la case d'arrivée, sans sortir du plateau.
  const wordX = Math.min(Math.max(b.x, 22), 78);
  const wordY = Math.min(Math.max(b.y - 14, 10), 88);

  // --impact : le moment où la pièce arrive sur sa case (l'éclair et le mot partent à ce moment-là).
  const vars = { "--impact": rapide ? "0.12s" : "0.38s" } as CSSProperties;

  return (
    <div
      className={`${styles.layer} ${styles[fx.kind]} ${rapide ? styles.rapide : ""}`}
      style={vars}
      aria-hidden="true"
    >
      {strong && (fx.kind === "check" || fx.kind === "mate") && (
        /* Fond "concentration" : des rayons fins qui pointent vers le roi attaqué */
        <div className={styles.focus} style={{ background: focusGradient(b.x, b.y) }} />
      )}

      {/* Le dessin au feutre : traits de vitesse + traits d'atterrissage.
          Un filtre fait trembler un peu le trait, comme à la main. */}
      <svg className={styles.dessin} viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Même idée que #trait-main, mais réglé pour ce dessin (100 unités = tout le plateau) */}
        <filter id="pp-feutre-plateau">
          <feTurbulence type="fractalNoise" baseFrequency="0.15" numOctaves={1} seed={3} />
          <feDisplacementMap in="SourceGraphic" scale={0.5} />
        </filter>
        <g filter="url(#pp-feutre-plateau)">
          {traits.map((d, i) => (
            <path key={i} d={d} pathLength={1} className={styles.trait} />
          ))}
          {!strong &&
            atterrissage.map((d, i) => (
              <path key={i} d={d} pathLength={1} className={styles.pouf} />
            ))}
        </g>
      </svg>

      {strong && (
        /* Éclair d'impact en étoile, au trait de feutre (filtre #trait-main de page.tsx) */
        <svg
          className={styles.burst}
          style={{ left: `${b.x}%`, top: `${b.y}%` }}
          viewBox="-50 -50 100 100"
        >
          <g className={styles.feutre}>
            <polygon points={starPoints(12, 48, 22)} className={styles.burstOuter} />
            <polygon points={starPoints(12, 28, 14)} className={styles.burstInner} />
          </g>
        </svg>
      )}

      {showWord && (
        <div className={styles.word} style={{ left: `${wordX}%`, top: `${wordY}%` }}>
          {fx.word}
        </div>
      )}
    </div>
  );
}

function starPoints(spikes: number, outer: number, inner: number) {
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer * (0.85 + ((i * 53) % 10) / 50) : inner * (0.8 + ((i * 37) % 10) / 25);
    const t = (Math.PI * i) / spikes;
    pts.push(`${(Math.cos(t) * r).toFixed(1)},${(Math.sin(t) * r).toFixed(1)}`);
  }
  return pts.join(" ");
}

function focusGradient(x: number, y: number) {
  return `repeating-conic-gradient(from 0deg at ${x}% ${y}%, rgba(27,23,18,0.35) 0deg 1.2deg, transparent 1.2deg 7deg)`;
}
