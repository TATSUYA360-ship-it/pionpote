// Pote.tsx : la mascotte ! Un petit pion dessiné en SVG avec 4 expressions,
// et une bulle de texte à côté.
import type { Mood } from "@/lib/evaluation";
import styles from "./Pote.module.css";

const MOOD_LABEL: Record<Mood, string> = {
  content: "Pote est content",
  panique: "Pote est paniqué",
  pensif: "Pote réfléchit",
  neutre: "Pote est calme",
};

function Face({ mood }: { mood: Mood }) {
  // Les yeux et la bouche changent selon l'humeur.
  switch (mood) {
    case "content":
      return (
        <g>
          <path d="M40 52 q5 -6 10 0" className={styles.line} />
          <path d="M70 52 q5 -6 10 0" className={styles.line} />
          <path d="M44 66 q16 16 32 0" className={styles.line} />
          <circle cx="38" cy="64" r="4" className={styles.cheek} />
          <circle cx="82" cy="64" r="4" className={styles.cheek} />
        </g>
      );
    case "panique":
      return (
        <g>
          <circle cx="45" cy="52" r="6" className={styles.eyeWhite} />
          <circle cx="75" cy="52" r="6" className={styles.eyeWhite} />
          <circle cx="45" cy="52" r="2.5" className={styles.ink} />
          <circle cx="75" cy="52" r="2.5" className={styles.ink} />
          <ellipse cx="60" cy="72" rx="7" ry="8" className={styles.ink} />
          <path d="M88 38 q4 8 0 12 q-4 -4 0 -12" className={styles.sweat} />
        </g>
      );
    case "pensif":
      return (
        <g>
          <circle cx="47" cy="50" r="3.5" className={styles.ink} />
          <circle cx="77" cy="50" r="3.5" className={styles.ink} />
          <path d="M38 42 l14 -3" className={styles.line} />
          <path d="M70 40 l14 2" className={styles.line} />
          <path d="M50 70 q8 -4 18 2" className={styles.line} />
        </g>
      );
    default:
      return (
        <g>
          <circle cx="45" cy="52" r="3.5" className={styles.ink} />
          <circle cx="75" cy="52" r="3.5" className={styles.ink} />
          <path d="M50 68 h20" className={styles.line} />
        </g>
      );
  }
}

export default function Pote({ mood, text }: { mood: Mood; text: string }) {
  return (
    <div className={styles.wrap}>
      <svg
        viewBox="0 0 120 150"
        className={`${styles.pote} ${styles[mood]}`}
        role="img"
        aria-label={MOOD_LABEL[mood]}
      >
        {/* Corps du pion : tête ronde, col, base */}
        <path
          d="M30 140 q0 -18 18 -24 q-8 -10 -6 -22 h36 q2 12 -6 22 q18 6 18 24 z"
          className={styles.body}
        />
        <rect x="34" y="86" width="52" height="10" rx="5" className={styles.body} />
        <circle cx="60" cy="56" r="34" className={styles.body} />
        <Face mood={mood} />
      </svg>
      <div className={`${styles.bubble} ${styles["bulle_" + mood]}`} aria-live="polite">
        {text}
      </div>
    </div>
  );
}
