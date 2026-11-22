// evaluation.ts : transforme les chiffres de Stockfish en choses lisibles.
import { Chess } from "chess.js";
import type { Color } from "./position";
import type { EngineLine } from "./stockfish";

/** Score du point de vue des Blancs (Stockfish le donne pour le camp qui joue). */
export function whiteScore(line: EngineLine, turn: Color) {
  const sign = turn === "w" ? 1 : -1;
  return { type: line.score.type, value: line.score.value * sign };
}

/** Affichage court : "+1.3", "-0.4", "Mat en 3"… (toujours vu des Blancs). */
export function formatScore(line: EngineLine, turn: Color): string {
  const s = whiteScore(line, turn);
  if (s.type === "mate") {
    if (s.value === 0) return "Mat";
    return `Mat en ${Math.abs(s.value)} pour les ${s.value > 0 ? "Blancs" : "Noirs"}`;
  }
  const pawns = s.value / 100;
  return `${pawns > 0 ? "+" : ""}${pawns.toFixed(1)}`;
}

/** Traduit un coup UCI ("g1f3") en notation lisible ("Cf3"). */
export function uciToSan(fen: string, uci: string): string {
  try {
    const chess = new Chess(fen, { skipValidation: true });
    const move = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci[4],
    });
    return toFrenchSan(move.san);
  } catch {
    return uci;
  }
}

// En français : R = roi, D = dame, T = tour, F = fou, C = cavalier.
function toFrenchSan(san: string): string {
  const map: Record<string, string> = { K: "R", Q: "D", R: "T", B: "F", N: "C" };
  return san.replace(/[KQRBN]/g, (c) => map[c]);
}

export type Mood = "content" | "panique" | "pensif" | "neutre";

/**
 * Choisit l'humeur de Pote et un message fixe selon l'évaluation,
 * du point de vue du camp qui joue (c'est lui qu'on conseille).
 * À l'étape 2, ce message sera remplacé par l'explication de l'IA.
 */
export function poteReaction(best: EngineLine | undefined): { mood: Mood; text: string } {
  if (!best) return { mood: "neutre", text: "Aucun coup possible ici." };
  const { type, value } = best.score;
  if (type === "mate") {
    return value > 0
      ? { mood: "content", text: `Il y a un mat en ${value} ! Regarde la flèche verte.` }
      : { mood: "panique", text: "Aïe, l'adversaire a un mat en vue… Défends-toi au mieux !" };
  }
  if (value >= 300) return { mood: "content", text: "Tu as un gros avantage. Joue le coup de la flèche verte !" };
  if (value >= 80) return { mood: "content", text: "Tu es un peu mieux. La flèche verte montre le meilleur coup." };
  if (value <= -300) return { mood: "panique", text: "Ça sent mauvais… Il faut faire très attention." };
  if (value <= -80) return { mood: "panique", text: "L'adversaire est un peu mieux. Cherche à te défendre." };
  return { mood: "neutre", text: "La position est à peu près égale. Prends ton temps !" };
}
