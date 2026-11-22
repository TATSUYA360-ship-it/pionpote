"use client";
// BoardEditor.tsx : le cœur de l'étape 1.
// - le plateau (react-chessboard) en mode "éditeur" : on pose et déplace les pièces librement
// - le choix de qui joue
// - le bouton "Analyser" qui vérifie la position puis interroge Stockfish
// - l'affichage : flèche verte, cases rouges, liste des coups, Pote
// - l'explication de Pote (demandée au serveur, /api/expliquer)
// - la lecture d'une photo de l'échiquier (PhotoReader), puis la correction à la main
import { useEffect, useMemo, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess, type Square } from "chess.js";
import {
  START_FEN,
  boardToFen,
  fenToBoard,
  rotateBoard,
  rowsToBoard,
  validatePosition,
  type BoardMap,
  type Color,
  type PieceCode,
} from "@/lib/position";
import { findPiecesInDanger, type DangerPiece } from "@/lib/danger";
import { StockfishEngine, type EngineLine } from "@/lib/stockfish";
import { poteReaction, type Mood } from "@/lib/evaluation";
import { calculerFaits, explicationSimple, menaceAdverse } from "@/lib/faits";
import PiecePalette, { type Tool } from "./PiecePalette";
import AnalysisPanel from "./AnalysisPanel";
import Pote from "./Pote";
import MangaFx from "./MangaFx";
import PhotoReader from "./PhotoReader";
import { buildMoveFx, type MoveFx } from "@/lib/moveFx";
import styles from "./BoardEditor.module.css";

// menace : le coup que l'adversaire voudrait jouer (flèche orange), s'il y en a un.
type Analysis = { fen: string; turn: Color; lines: EngineLine[]; danger: DangerPiece[]; menace: string | null };
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
    text: "Salut, moi c'est Pote ! Prends ton échiquier en photo (ou place les pièces à la main), choisis qui joue, puis appuie sur «\u00a0Analyser\u00a0».",
  });

  // L'explication de la position analysée (pour la réafficher après une animation).
  const explicationRef = useRef<{ mood: Mood; text: string } | null>(null);
  // Numéro de la dernière analyse : une réponse en retard d'une ancienne analyse est ignorée.
  const analyseIdRef = useRef(0);

  // true quand la position vient d'une photo : on affiche le bouton « Tourner les pièces ».
  const [fromPhoto, setFromPhoto] = useState(false);

  // Coup montré en animation manga (null = on affiche la position éditée).
  const [fx, setFx] = useState<MoveFx | null>(null);
  const boardBoxRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<MoveFx | null>(null);
  useEffect(() => {
    fxRef.current = fx;
  }, [fx]);

  // Le moteur est créé une seule fois, au premier clic sur "Analyser".
  const engineRef = useRef<StockfishEngine | null>(null);
  useEffect(() => () => engineRef.current?.terminate(), []);

  // Toute modification de la position efface l'ancienne analyse.
  const fen = useMemo(() => boardToFen(board, turn), [board, turn]);
  useEffect(() => {
    analyseIdRef.current += 1;
    explicationRef.current = null;
    setAnalysis(null);
    setFx(null);
    setStatus((s) => (s === "loading" ? s : "idle"));
  }, [fen]);

  const updateBoard = (fn: (b: BoardMap) => BoardMap) => setBoard((b) => fn({ ...b }));

  // --- Interactions avec le plateau ---
  const onSquareClick = (square: Square) => {
    if (tool === "move" || fx) return;
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

  // --- Photo de l'échiquier ---
  const onPhotoStart = () => {
    setFx(null);
    setPote({ mood: "pensif", text: "Je regarde ta photo… ça peut prendre jusqu'à une minute." });
  };

  const onPhotoRead = (rows: string[], doutes: string) => {
    setBoard(rowsToBoard(rows));
    setOrientation("white");
    setFromPhoto(true);
    setPote({
      mood: "neutre",
      text:
        "Voilà ce que j'ai vu ! Compare avec ton vrai échiquier et corrige si besoin " +
        "(touche une pièce en bas pour la poser, ou fais-la glisser). " +
        (doutes ? `Vérifie surtout ceci : ${doutes.replace(/[.!\s]*$/, "")}. ` : "") +
        "Ensuite, choisis qui joue et appuie sur «\u00a0Analyser\u00a0».",
    });
  };

  const onPhotoError = (message: string) => {
    setPote({ mood: "panique", text: message });
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
      const menace = menaceAdverse(check.fen, turn)?.uci ?? null;
      setAnalysis({ fen: check.fen, turn, lines: result.lines, danger, menace });
      setStatus("done");
      expliquer(check.fen, turn, result.lines);
    } catch (err) {
      console.error(err);
      setStatus("error");
      setPote({ mood: "panique", text: "Oups, le moteur n'a pas répondu. Recharge la page et réessaie." });
    }
  };

  // --- Explication de Pote ---
  // On demande au serveur une explication en mots simples. Si ça échoue (pas d'internet,
  // limite atteinte…), Pote lit l'explication calculée directement dans le téléphone.
  const expliquer = async (fenAnalyse: string, camp: Color, lines: EngineLine[]) => {
    const id = analyseIdRef.current;
    const { mood } = poteReaction(lines[0]);
    const secours = { mood, text: explicationSimple(calculerFaits(fenAnalyse, camp, lines)) };
    explicationRef.current = secours;
    if (!lines[0]?.pv[0]) {
      setPote(poteReaction(lines[0]));
      return;
    }
    setPote({ mood: "pensif", text: "J'ai trouvé le bon coup (la flèche verte). Je cherche comment te l'expliquer…" });
    let resultat = secours;
    try {
      const res = await fetch("/api/expliquer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fen: fenAnalyse, lines: lines.map(({ score, pv }) => ({ score, pv: pv.slice(0, 2) })) }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.explication === "string") resultat = { mood, text: data.explication };
    } catch {
      // pas d'internet : on garde l'explication de secours
    }
    if (id !== analyseIdRef.current) return; // la position a changé entre-temps
    explicationRef.current = resultat;
    // Si un coup est en cours d'animation, on attend « Revenir à ma position ».
    if (!fxRef.current) setPote(resultat);
  };

  // --- Animation manga d'un coup proposé par Stockfish ---
  const showMove = (uci: string) => {
    if (!analysis) return;
    const next = buildMoveFx(analysis.fen, uci);
    if (!next) return;
    // Si un coup est déjà affiché, on revient d'abord à la position de départ,
    // puis on rejoue le coup juste après, pour que la pièce glisse à nouveau.
    setFx(null);
    requestAnimationFrame(() => {
      setFx(next);
      setPote(next.pote);
      // Secousse du plateau au moment de l'impact (après le glissement de la pièce).
      if (next.kind !== "move" && !prefersReducedMotion()) {
        const strength = next.kind === "mate" ? 10 : 6;
        boardBoxRef.current?.animate(
          [
            { transform: "translate(0, 0)" },
            { transform: `translate(${-strength}px, ${strength / 2}px)` },
            { transform: `translate(${strength}px, ${-strength / 2}px)` },
            { transform: `translate(${-strength / 2}px, ${-strength / 2}px)` },
            { transform: `translate(${strength / 2}px, ${strength / 2}px)` },
            { transform: "translate(0, 0)" },
          ],
          { duration: next.kind === "mate" ? 500 : 350, delay: 380, easing: "ease-out" },
        );
      }
    });
  };

  const backToPosition = () => {
    setFx(null);
    if (explicationRef.current) setPote(explicationRef.current);
    else if (analysis) setPote(poteReaction(analysis.lines[0]));
  };

  // --- Dessins sur le plateau ---
  const best = analysis?.lines[0]?.pv[0];
  const arrows: [Square, Square, string][] = [];
  if (analysis && !fx) {
    // Flèche orange : la menace de l'adversaire. Flèche verte : le coup conseillé.
    const m = analysis.menace;
    if (m) arrows.push([m.slice(0, 2) as Square, m.slice(2, 4) as Square, "rgb(240, 140, 30)"]);
    if (best) arrows.push([best.slice(0, 2) as Square, best.slice(2, 4) as Square, "rgb(34, 170, 80)"]);
  }

  const squareStyles: Record<string, React.CSSProperties> = {};
  if (fx) {
    // Pendant l'animation : on surligne la case de départ et d'arrivée.
    squareStyles[fx.from] = { background: "rgba(255, 215, 0, 0.45)" };
    squareStyles[fx.to] = { background: "rgba(255, 215, 0, 0.6)" };
  } else {
    analysis?.danger.forEach((d) => {
      squareStyles[d.square] = {
        background: "radial-gradient(circle, rgba(230,40,40,0.85) 45%, rgba(230,40,40,0.35) 75%)",
      };
    });
  }

  return (
    <div className={styles.layout}>
      {/* Sur téléphone, les deux colonnes disparaissent et les blocs s'empilent
          dans l'ordre choisi par "order" dans BoardEditor.module.css. */}
      <div className={styles.boardCol}>
        <div className={styles.photo}>
          <PhotoReader onStart={onPhotoStart} onRead={onPhotoRead} onError={onPhotoError} />
        </div>

        <div className={styles.boardBlock}>
          <div className={styles.board} ref={boardBoxRef}>
            <Chessboard
              id="editeur"
              position={fx ? fx.fenAfter : board}
              boardOrientation={orientation}
              onSquareClick={onSquareClick}
              onPieceDrop={onPieceDrop}
              onPieceDropOffBoard={onPieceDropOffBoard}
              dropOffBoardAction="trash"
              onPromotionCheck={() => false}
              arePiecesDraggable={tool === "move" && !fx}
              customArrows={arrows}
              customSquareStyles={squareStyles}
              customLightSquareStyle={{ backgroundColor: "#f3e4c6" }}
              customDarkSquareStyle={{ backgroundColor: "#b98a5e" }}
              areArrowsAllowed={false}
              animationDuration={fx ? 400 : 150}
            />
            {fx && <MangaFx key={fx.id} fx={fx} orientation={orientation} />}
          </div>
          {fx && (
            <div className={styles.row}>
              <button type="button" className="btn" onClick={() => showMove(fx.uci)}>
                Revoir
              </button>
              <button type="button" className="btn" onClick={backToPosition}>
                Revenir à ma position
              </button>
            </div>
          )}
          {fromPhoto && !fx && (
            <div className={styles.row}>
              <button type="button" className="btn" onClick={() => setBoard((b) => rotateBoard(b))}>
                Pièces à l&apos;envers ? Tourner le plateau
              </button>
            </div>
          )}
        </div>

        <section className={`card ${styles.edit}`}>
          <h2 className="titre">Corriger la position</h2>
          <p className={styles.hint}>Touche une pièce puis une case pour la poser.</p>
          <PiecePalette tool={tool} onChange={setTool} />
          <div className={styles.row}>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setBoard(fenToBoard(START_FEN));
                setFromPhoto(false);
              }}
            >
              Départ
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setBoard({});
                setFromPhoto(false);
              }}
            >
              Vider
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setOrientation((o) => (o === "white" ? "black" : "white"))}
            >
              Retourner
            </button>
          </div>
        </section>
      </div>

      <div className={styles.sideCol}>
        <div className={styles.pote}>
          <Pote mood={pote.mood} text={pote.text} />
        </div>

        <div className={styles.play}>
          {/* « Qui joue ? » : deux gros boutons, celui choisi est rempli. */}
          <fieldset className={styles.turn}>
            <legend className={styles.turnLegend}>Qui joue ?</legend>
            <div className={styles.turnRow}>
            <label className={turn === "w" ? styles.turnOn : ""}>
              <input type="radio" name="turn" checked={turn === "w"} onChange={() => setTurn("w")} />
              <span aria-hidden>♔&#xFE0E;</span> Les Blancs
            </label>
            <label className={turn === "b" ? styles.turnOn : ""}>
              <input type="radio" name="turn" checked={turn === "b"} onChange={() => setTurn("b")} />
              <span aria-hidden>♚&#xFE0E;</span> Les Noirs
            </label>
            </div>
          </fieldset>

          <button
            type="button"
            className="btn btn-main"
            onClick={analyze}
            disabled={status === "loading"}
          >
            {status === "loading" ? "Analyse en cours…" : "Analyser"}
          </button>
        </div>

        {analysis && (
          <div className={styles.results}>
            <AnalysisPanel
              fen={analysis.fen}
              turn={analysis.turn}
              lines={analysis.lines}
              danger={analysis.danger}
              onShowMove={showMove}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}
