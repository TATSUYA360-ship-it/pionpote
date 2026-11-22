"use client";
// Pote.tsx : la mascotte ! Un petit pion dessiné en SVG avec 4 expressions,
// et une bulle de texte à côté.
// Nouveau : Pote peut « réfléchir » (prop reflexion) :
//   - "calcul"      : pendant que Stockfish cherche, Pote regarde le plateau de gauche à droite ;
//   - "explication" : pendant qu'on attend l'explication, Pote lève les yeux et
//                     des petites bulles de pensée montent au-dessus de sa tête.
// Nouveau : Pote a une personnalité (src/lib/personnalite.ts). Quand il y a un danger, il
// t'interpelle (prop appel) : il tape deux fois du pied sur sa case (« Toc toc, chef ! »),
// avec des petits traits d'impact sous lui, et un bruit de bois si le son est allumé.
// Un petit bouton sous la bulle allume ou coupe ce son (coupé par défaut).
// Toutes les animations sont en CSS (Pote.module.css) et s'arrêtent si le téléphone
// demande « moins d'animations ».
import { useEffect, useState } from "react";
import type { Mood } from "@/lib/evaluation";
import { choisirSon, jouerTocToc, reveiller, sonActive } from "@/lib/sons";
import styles from "./Pote.module.css";

export type Reflexion = "calcul" | "explication" | null;

const MOOD_LABEL: Record<Mood, string> = {
  content: "Pote est content",
  panique: "Pote est paniqué",
  pensif: "Pote réfléchit",
  neutre: "Pote est calme",
};

function Face({ mood }: { mood: Mood }) {
  // Les yeux et la bouche changent selon l'humeur.
  // Les yeux sont rangés dans un groupe « yeux » : c'est lui qui bouge quand Pote réfléchit
  // ou cligne des yeux.
  switch (mood) {
    case "content":
      return (
        <g>
          <g className={styles.yeux}>
            <path d="M40 52 q5 -6 10 0" className={styles.line} />
            <path d="M70 52 q5 -6 10 0" className={styles.line} />
          </g>
          <path d="M44 66 q16 16 32 0" className={styles.line} />
          <circle cx="38" cy="64" r="4" className={styles.cheek} />
          <circle cx="82" cy="64" r="4" className={styles.cheek} />
        </g>
      );
    case "panique":
      return (
        <g>
          <g className={styles.yeux}>
            <circle cx="45" cy="52" r="6" className={styles.eyeWhite} />
            <circle cx="75" cy="52" r="6" className={styles.eyeWhite} />
            <circle cx="45" cy="52" r="2.5" className={styles.ink} />
            <circle cx="75" cy="52" r="2.5" className={styles.ink} />
          </g>
          <ellipse cx="60" cy="72" rx="7" ry="8" className={styles.ink} />
          <path d="M88 38 q4 8 0 12 q-4 -4 0 -12" className={styles.sweat} />
        </g>
      );
    case "pensif":
      return (
        <g>
          <g className={styles.yeux}>
            <circle cx="47" cy="50" r="3.5" className={styles.ink} />
            <circle cx="77" cy="50" r="3.5" className={styles.ink} />
          </g>
          <path d="M38 42 l14 -3" className={`${styles.line} ${styles.sourcil}`} />
          <path d="M70 40 l14 2" className={`${styles.line} ${styles.sourcil}`} />
          <path d="M50 70 q8 -4 18 2" className={styles.line} />
        </g>
      );
    default:
      return (
        <g>
          <g className={styles.yeux}>
            <circle cx="45" cy="52" r="3.5" className={styles.ink} />
            <circle cx="75" cy="52" r="3.5" className={styles.ink} />
          </g>
          <path d="M50 68 h20" className={styles.line} />
        </g>
      );
  }
}

/** Le dessin de Pote (corps + visage). Le visage est recréé à chaque changement
 *  d'humeur (key), ce qui relance une petite animation de « changement d'expression ». */
function Corps({ mood }: { mood: Mood }) {
  return (
    <>
      {/* Corps du pion : tête ronde, col, base */}
      <path
        d="M30 140 q0 -18 18 -24 q-8 -10 -6 -22 h36 q2 12 -6 22 q18 6 18 24 z"
        className={styles.body}
      />
      <rect x="34" y="86" width="52" height="10" rx="5" className={styles.body} />
      <circle cx="60" cy="56" r="34" className={styles.body} />
      <g key={mood} className={styles.visage}>
        <Face mood={mood} />
      </g>
    </>
  );
}

export default function Pote({
  mood,
  text,
  reflexion = null,
  appel,
}: {
  mood: Mood;
  text: string;
  reflexion?: Reflexion;
  appel?: boolean;
}) {
  // Pote t'interpelle s'il y a un danger, ou si sa phrase commence par son cri d'alerte.
  const interpelle = !reflexion && (appel ?? text.startsWith("Toc toc"));
  const classeReflexion = reflexion ? styles[reflexion] : "";
  const classeAppel = interpelle ? styles.appel : "";

  // Le son : coupé par défaut. On lit le choix du joueur une fois la page chargée.
  const [son, setSon] = useState(false);
  useEffect(() => {
    setSon(sonActive());
    // Safari n'accepte un son qu'après un toucher : on le prépare au premier toucher.
    window.addEventListener("pointerdown", reveiller);
    return () => window.removeEventListener("pointerdown", reveiller);
  }, []);
  // Chaque nouvel appel « Toc toc » fait le bruit (si le son est allumé).
  useEffect(() => {
    if (interpelle) jouerTocToc();
  }, [interpelle, text]);

  const basculerSon = () => {
    const actif = !son;
    setSon(actif);
    choisirSon(actif);
    if (actif) setTimeout(jouerTocToc, 50); // petit essai pour entendre le son
  };

  return (
    <div className={styles.wrap}>
      {/* La « scène » laisse de la place au-dessus de Pote pour ses bulles de pensée. */}
      <div className={styles.scene}>
        {reflexion === "explication" && (
          <svg viewBox="0 0 40 40" className={styles.pensees} aria-hidden>
            <circle cx="8" cy="32" r="3" className={styles.pensee} />
            <circle cx="18" cy="21" r="4.5" className={styles.pensee} />
            <circle cx="31" cy="9" r="6.5" className={styles.pensee} />
          </svg>
        )}
        {/* Les petits traits d'impact sous Pote quand il tape du pied (« toc toc ») */}
        {interpelle && (
          <svg key={text} viewBox="0 0 80 16" className={styles.tocs} aria-hidden>
            <path d="M6 12 l-5 -5 M14 9 l-1 -7 M24 12 l4 -5" className={`${styles.impact} ${styles.toc1}`} />
            <path d="M56 12 l-4 -5 M66 9 l1 -7 M74 12 l5 -5" className={`${styles.impact} ${styles.toc2}`} />
          </svg>
        )}
        {/* key : Pote « saute » (ou tremble) à chaque changement d'humeur ou nouvel appel */}
        <svg
          key={interpelle ? `${mood}-${text}` : mood}
          viewBox="0 0 120 150"
          className={`${styles.pote} ${styles[mood]} ${classeReflexion} ${classeAppel}`}
          role="img"
          aria-label={reflexion ? "Pote réfléchit" : MOOD_LABEL[mood]}
        >
          <Corps mood={mood} />
        </svg>
      </div>
      <div className={styles.colonne}>
      <div
        className={`${styles.bubble} ${styles["bulle_" + mood]}`}
        aria-live="polite"
        aria-busy={reflexion ? true : undefined}
      >
        {/* key={text} : le texte apparaît en douceur à chaque nouvelle phrase */}
        <span key={text} className={styles.texte}>
          {text}
        </span>
        {reflexion && (
          <span className={styles.points} aria-hidden>
            <i />
            <i />
            <i />
          </span>
        )}
      </div>
      <button type="button" className={styles.son} onClick={basculerSon} aria-pressed={son}>
        {son ? "Son de Pote : allumé" : "Son de Pote : coupé"}
      </button>
      </div>
    </div>
  );
}

// PoteIcon : Pote tout seul (sans bulle), pour le logo en haut de l'écran.
export function PoteIcon({ mood = "content", className = "" }: { mood?: Mood; className?: string }) {
  return (
    <svg viewBox="0 0 120 150" className={`${styles.pote} ${styles.icone} ${className}`} aria-hidden>
      <Corps mood={mood} />
    </svg>
  );
}
