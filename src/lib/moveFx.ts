// moveFx.ts : décide quel "effet manga" montrer pour un coup.
// On joue le coup avec chess.js pour savoir si c'est une prise, un échec, un mat…
import { Chess, type Square } from "chess.js";
import type { Mood } from "./evaluation";

export type FxKind = "move" | "capture" | "check" | "mate" | "castle" | "promotion";

export type MoveFx = {
  uci: string;
  id: number; // change à chaque coup pour relancer l'animation
  from: Square;
  to: Square;
  kind: FxKind;
  word: string; // l'onomatopée affichée (« BAM ! »)
  fenAfter: string;
  pote: { mood: Mood; text: string };
};

const CAPTURE_WORDS = ["BAM !", "CRAC !", "PAF !", "BOUM !"];

export function buildMoveFx(fen: string, uci: string): MoveFx | null {
  const chess = new Chess(fen, { skipValidation: true });
  let move;
  try {
    move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  } catch {
    return null;
  }

  let kind: FxKind = "move";
  let word = "SWOOSH !";
  let pote: MoveFx["pote"] = { mood: "neutre", text: "Voilà le coup ! Regarde bien où va la pièce." };

  if (move.isKingsideCastle() || move.isQueensideCastle()) {
    kind = "castle";
    word = "ROQUE !";
    pote = { mood: "content", text: "Le roi se met à l'abri derrière ses pions, et la tour entre en jeu !" };
  }
  if (move.isPromotion()) {
    kind = "promotion";
    word = "PROMOTION !";
    pote = { mood: "content", text: "Le pion arrive au bout et se transforme. Trop fort !" };
  }
  if (move.isCapture()) {
    kind = "capture";
    word = CAPTURE_WORDS[Math.floor(Math.random() * CAPTURE_WORDS.length)];
    pote = { mood: "content", text: "Bim ! Une pièce adverse est prise." };
  }
  if (chess.isCheck()) {
    kind = "check";
    word = "ÉCHEC !";
    pote = { mood: "content", text: "Échec ! Le roi adverse est attaqué, il doit réagir tout de suite." };
  }
  if (chess.isCheckmate()) {
    kind = "mate";
    word = "ÉCHEC ET MAT !!";
    pote = { mood: "content", text: "ÉCHEC ET MAT ! Le roi ne peut plus s'échapper. Victoire !" };
  }

  return { uci, id: Date.now(), from: move.from, to: move.to, kind, word, fenAfter: chess.fen(), pote };
}
