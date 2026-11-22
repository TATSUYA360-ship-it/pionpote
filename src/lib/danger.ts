// danger.ts : repère les pièces "en danger" avec chess.js.
// Une pièce est en danger si elle est attaquée et :
//  - personne ne la défend, OU
//  - un attaquant vaut moins qu'elle (ex : une dame attaquée par un pion).
import { Chess, type Square } from "chess.js";
import type { Color } from "./position";

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

export type DangerPiece = { square: Square; reason: "non défendue" | "attaquée par moins fort" };

export function findPiecesInDanger(fen: string, color: Color): DangerPiece[] {
  const chess = new Chess(fen, { skipValidation: true });
  const enemy: Color = color === "w" ? "b" : "w";
  const result: DangerPiece[] = [];

  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== color || cell.type === "k") continue;
      const attackers = chess.attackers(cell.square, enemy);
      if (attackers.length === 0) continue;

      const defenders = chess.attackers(cell.square, color);
      if (defenders.length === 0) {
        result.push({ square: cell.square, reason: "non défendue" });
        continue;
      }
      const cheapest = Math.min(
        ...attackers.map((sq) => VALUE[chess.get(sq)!.type]),
      );
      if (cheapest < VALUE[cell.type]) {
        result.push({ square: cell.square, reason: "attaquée par moins fort" });
      }
    }
  }
  return result;
}
