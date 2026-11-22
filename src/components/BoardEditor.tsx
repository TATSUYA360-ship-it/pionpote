"use client";
// BoardEditor.tsx : le cœur de l'étape 1.
// - le plateau (react-chessboard) en mode "éditeur" : on pose et déplace les pièces librement
// - le choix de qui joue
// - le bouton "Analyser" qui vérifie la position puis interroge Stockfish
// - l'affichage : flèche verte, cases rouges, liste des coups, Pote
import { useEffect, useMemo, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess, type Square } from "chess.js";
import {
  START_FEN,
  boardToFen,
  fenToBoard,
  validatePosition,
  type BoardMap,
  type Color,
  type PieceCode,
} from "@/lib/position";
import { findPiecesInDanger, type DangerPiece } from "@/lib/danger";
import { StockfishEngine, type EngineLine } from "@/lib/stockfish";
import { poteReaction, type Mood } from "@/lib/evaluation";
import PiecePalette, { type Tool } from "./PiecePalette";
import AnalysisPanel from "./AnalysisPanel";
import Pote from "./Pote";
import styles from "./BoardEditor.module.css";

type Analysis = { fen: string; turn: Color; lines: EngineLine[]; danger: DangerPiece[] };
type Status = "idle" | "loading" | "done" | "error";

export default function BoardEditor() {
  const [board, setBoard] = useState<BoardMap>(() => fenToBoard(START_FEN));
  const [turn, setTurn] = useState<Color>("w");
  const [tool, setTool] = useState<Tool>("move");
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [status, setStatus] = useState<Status>("idle");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [pote, setPote] = useState<{ mood: Mood; text: string }>({
    mood: "neutre",
    text: "Salut, moi c'est Pote ! Place les pièces comme sur ton échiquier, choisis qui joue, puis appuie sur « Analyser ».",
  });

  // Le moteur est créé une seule fois, au premier clic sur "Analyser".
  const engineRef = useRef<StockfishEngine | null>(null);
  useEffect(() => () => engineRef.current?.terminate(), []);

  // Toute modification de la position efface l'ancienne analyse.
  const fen = useMemo(() => boardToFen(board, turn), [board, turn]);
  useEffect(() => {
    setAnalysis(null);
    setStatus((s) => (s === "loading" ? s : "idle"));
  }, [fen]);

  const updateBoard = (fn: (b: BoardMap) => BoardMap) => setBoard((b) => fn({ ...b }));

  // --- Interactions avec le plateau ---
  const onSquareClick = (square: Square) => {
    if (tool === "move") return;
    updateBoard((b) => {
      if (tool === "erase") delete b[square];
      else b[square] = tool;
      return b;
    });
  };

  const onPieceDrop = (from: Square, to: Square, piece: string) => {
    if (from === to) return false;
    updateBoard((b) => {
      delete b[from];
      b[to] = piece as PieceCode;
      return b;
    });
    return true;
  };

  const onPieceDropOffBoard = (from: Square) => {
    updateBoard((b) => {
      delete b[from];
      return b;
    });
  };

  // --- Analyse ---
  const analyze = async () => {
    const check = validatePosition(board, turn);
    if (!check.ok) {
      setStatus("error");
      setPote({ mood: "pensif", text: check.message });
      return;
    }

    const chess = new Chess(check.fen, { skipValidation: true });
    if (chess.isCheckmate()) {
      setStatus("error");
      setPote({ mood: "panique", text: "C'est échec et mat ! La partie est finie." });
      return;
    }
    if (chess.isStalemate()) {
      setStatus("error");
      setPote({ mood: "pensif", text: "C'est pat : aucun coup possible et pas d'échec. Partie nulle !" });
      return;
    }

    setStatus("loading");
    setPote({ mood: "pensif", text: "Hmm, je réfléchis…" });
    try {
      engineRef.current ??= new StockfishEngine();
      const result = await engineRef.current.analyze(check.fen, 15);
      const danger = findPiecesInDanger(check.fen, turn);
      setAnalysis({ fen: check.fen, turn, lines: result.lines, danger });
      setPote(poteReaction(result.lines[0]));
      setStatus("done");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setPote({ mood: "panique", text: "Oups, le moteur n'a pas répondu. Recharge la page et réessaie." });
    }
  };

  // --- Dessins sur le plateau ---
  const best = analysis?.lines[0]?.pv[0];
  const arrows: [Square, Square, string][] = best
    ? [[best.slice(0, 2) as Square, best.slice(2, 4) as Square, "rgb(34, 170, 80)"]]
    : [];

  const squareStyles: Record<string, React.CSSProperties> = {};
  analysis?.danger.forEach((d) => {
    squareStyles[d.square] = {
      background: "radial-gradient(circle, rgba(230,40,40,0.85) 45%, rgba(230,40,40,0.35) 75%)",
    };
  });

  return (
    <div className={styles.layout}>
      <div className={styles.boardCol}>
        <div className={styles.board}>
          <Chessboard
            id="editeur"
            position={board}
            boardOrientation={orientation}
            onSquareClick={onSquareClick}
            onPieceDrop={onPieceDrop}
            onPieceDropOffBoard={onPieceDropOffBoard}
            dropOffBoardAction="trash"
            onPromotionCheck={() => false}
            arePiecesDraggable={tool === "move"}
            customArrows={arrows}
            customSquareStyles={squareStyles}
            areArrowsAllowed={false}
            animationDuration={150}
          />
        </div>
        <PiecePalette tool={tool} onChange={setTool} />
        <div className={styles.row}>
          <button type="button" onClick={() => setBoard(fenToBoard(START_FEN))}>
            Position de départ
          </button>
          <button type="button" onClick={() => setBoard({})}>
            Vider
          </button>
          <button
            type="button"
            onClick={() => setOrientation((o) => (o === "white" ? "black" : "white"))}
          >
            Retourner
          </button>
        </div>
      </div>

      <div className={styles.sideCol}>
        <Pote mood={pote.mood} text={pote.text} />

        <fieldset className={styles.turn}>
          <legend>Qui joue ?</legend>
          <label>
            <input type="radio" name="turn" checked={turn === "w"} onChange={() => setTurn("w")} />
            Les Blancs
          </label>
          <label>
            <input type="radio" name="turn" checked={turn === "b"} onChange={() => setTurn("b")} />
            Les Noirs
          </label>
        </fieldset>

        <button
          type="button"
          className={styles.analyze}
          onClick={analyze}
          disabled={status === "loading"}
        >
          {status === "loading" ? "Analyse en cours…" : "Analyser"}
        </button>

        {analysis && (
          <AnalysisPanel
            fen={analysis.fen}
            turn={analysis.turn}
            lines={analysis.lines}
            danger={analysis.danger}
          />
        )}
      </div>
    </div>
  );
}
