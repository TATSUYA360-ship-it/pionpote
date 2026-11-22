// position.ts : tout ce qui concerne la position sur le plateau.
// - le format "BoardMap" (case -> pièce) utilisé par l'éditeur
// - la conversion en FEN (le texte standard qui décrit une position)
// - la vérification qu'une position est jouable avant de l'analyser
import { Chess } from "chess.js";

export type Color = "w" | "b";
// Une pièce s'écrit comme dans react-chessboard : "wK" = roi blanc, "bP" = pion noir…
export type PieceCode =
  | "wK" | "wQ" | "wR" | "wB" | "wN" | "wP"
  | "bK" | "bQ" | "bR" | "bB" | "bN" | "bP";
export type BoardMap = Record<string, PieceCode>;

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

export const START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/** Lit la partie "pièces" d'un FEN et renvoie un BoardMap. */
export function fenToBoard(fen: string): BoardMap {
  const board: BoardMap = {};
  const rows = fen.split(" ")[0].split("/");
  rows.forEach((row, i) => {
    const rank = 8 - i;
    let file = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) {
        file += Number(ch);
      } else {
        const color = ch === ch.toUpperCase() ? "w" : "b";
        board[`${FILES[file]}${rank}`] = `${color}${ch.toUpperCase()}` as PieceCode;
        file += 1;
      }
    }
  });
  return board;
}

/** Écrit la partie "pièces" d'un FEN à partir d'un BoardMap. */
function boardToPlacement(board: BoardMap): string {
  const rows: string[] = [];
  for (let rank = 8; rank >= 1; rank--) {
    let row = "";
    let empty = 0;
    for (const f of FILES) {
      const piece = board[`${f}${rank}`];
      if (!piece) {
        empty++;
        continue;
      }
      if (empty) row += empty;
      empty = 0;
      const letter = piece[1];
      row += piece[0] === "w" ? letter : letter.toLowerCase();
    }
    if (empty) row += empty;
    rows.push(row);
  }
  return rows.join("/");
}

/**
 * Droits de roque : on les déduit simplement de la position.
 * Si le roi et la tour sont encore sur leurs cases de départ, on suppose
 * que le roque est encore possible (on ne peut pas savoir s'ils ont bougé).
 */
function castlingRights(board: BoardMap): string {
  let rights = "";
  if (board.e1 === "wK") {
    if (board.h1 === "wR") rights += "K";
    if (board.a1 === "wR") rights += "Q";
  }
  if (board.e8 === "bK") {
    if (board.h8 === "bR") rights += "k";
    if (board.a8 === "bR") rights += "q";
  }
  return rights || "-";
}

/** Construit le FEN complet : pièces + qui joue + roques. */
export function boardToFen(board: BoardMap, turn: Color): string {
  return `${boardToPlacement(board)} ${turn} ${castlingRights(board)} - 0 1`;
}

export type Validation =
  | { ok: true; fen: string }
  | { ok: false; message: string };

const COLOR_NAME: Record<Color, string> = { w: "Blancs", b: "Noirs" };

/**
 * Vérifie qu'une position a du sens avant de l'envoyer à Stockfish.
 * Les messages sont écrits pour un débutant.
 */
export function validatePosition(board: BoardMap, turn: Color): Validation {
  const pieces = Object.entries(board);
  const count = (code: PieceCode) => pieces.filter(([, p]) => p === code).length;

  for (const color of ["w", "b"] as Color[]) {
    const kings = count(`${color}K` as PieceCode);
    if (kings === 0) {
      return { ok: false, message: `Il manque le roi des ${COLOR_NAME[color]}.` };
    }
    if (kings > 1) {
      return { ok: false, message: `Les ${COLOR_NAME[color]} ont plus d'un roi.` };
    }
    if (count(`${color}P` as PieceCode) > 8) {
      return { ok: false, message: `Les ${COLOR_NAME[color]} ont plus de 8 pions.` };
    }
    const total = pieces.filter(([, p]) => p[0] === color).length;
    if (total > 16) {
      return { ok: false, message: `Les ${COLOR_NAME[color]} ont plus de 16 pièces.` };
    }
  }

  const badPawn = pieces.find(
    ([sq, p]) => p[1] === "P" && (sq[1] === "1" || sq[1] === "8"),
  );
  if (badPawn) {
    return {
      ok: false,
      message: `Un pion ne peut pas être sur la 1re ou la 8e rangée (case ${badPawn[0]}).`,
    };
  }

  // Le camp qui NE joue PAS ne doit pas être en échec :
  // sinon ça voudrait dire qu'on pourrait prendre son roi.
  const other: Color = turn === "w" ? "b" : "w";
  try {
    const flipped = new Chess(boardToFen(board, other), { skipValidation: true });
    if (flipped.inCheck()) {
      return {
        ok: false,
        message: `Le roi des ${COLOR_NAME[other]} est en échec alors que c'est aux ${COLOR_NAME[turn]} de jouer. Vérifie la position ou qui joue.`,
      };
    }
  } catch {
    return { ok: false, message: "Cette position n'est pas lisible." };
  }

  return { ok: true, fen: boardToFen(board, turn) };
}

/**
 * Transforme les 8 rangées lues sur la photo (de la 8e à la 1re, "." = case vide)
 * en BoardMap pour l'éditeur.
 */
export function rowsToBoard(rows: string[]): BoardMap {
  const placement = rows
    .map((row) => row.replace(/\.+/g, (vide) => String(vide.length)))
    .join("/");
  return fenToBoard(placement);
}

/**
 * Tourne les pièces d'un demi-tour (a1 <-> h8, b2 <-> g7…).
 * Utile si la photo a été prise du côté des Noirs et que Pote s'est trompé de sens.
 */
export function rotateBoard(board: BoardMap): BoardMap {
  const rotated: BoardMap = {};
  for (const [square, piece] of Object.entries(board)) {
    const file = FILES[7 - FILES.indexOf(square[0])];
    const rank = 9 - Number(square[1]);
    rotated[`${file}${rank}`] = piece;
  }
  return rotated;
}
