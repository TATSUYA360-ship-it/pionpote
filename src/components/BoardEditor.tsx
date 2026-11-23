"use client";
// BoardEditor.tsx : le cœur de l'étape 1.
// - le plateau (react-chessboard) en mode "éditeur" : on pose et déplace les pièces librement
// - le choix de qui joue
// - le bouton "Analyser" qui vérifie la position puis interroge Stockfish
// - l'affichage : flèche verte, cases rouges, liste des coups, Pote
// - l'explication de Pote (demandée au serveur, /api/expliquer)
// - la lecture d'une photo de l'échiquier (PhotoReader), puis la correction à la main
// - le suivi de la partie : en mode « partie », on joue les vrais coups sur le plateau
//   (touche une pièce puis sa case), le camp qui joue change tout seul, l'historique
//   des coups est gardé (avec « Annuler le coup ») et Pote analyse après chaque coup.
// - le chat avec Pote (ChatPote), sous les résultats, pour poser des questions sur la position.
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
import { poteReaction, toFrenchSan, type Mood } from "@/lib/evaluation";
import { calculerFaits, explicationSimple, menaceAdverse } from "@/lib/faits";
import PiecePalette, { type Tool } from "./PiecePalette";
import AnalysisPanel from "./AnalysisPanel";
import Pote, { type Reflexion } from "./Pote";
import MangaFx from "./MangaFx";
import PhotoReader from "./PhotoReader";
import ChatPote from "./ChatPote";
import { buildMoveFx, type MoveFx } from "@/lib/moveFx";
import { PHRASES, auHasard, avecCri } from "@/lib/personnalite";
import styles from "./BoardEditor.module.css";

// menace : le coup que l'adversaire voudrait jouer (flèche orange), s'il y en a un.
type Analysis = { fen: string; turn: Color; lines: EngineLine[]; danger: DangerPiece[]; menace: string | null };
type Status = "idle" | "loading" | "done" | "error";

// « partie » : on joue les coups de la vraie partie. « edition » : on corrige la position à la main.
type Mode = "partie" | "edition";
// La partie : toutes les positions (fens[0] = départ) et les coups joués entre elles.
type Partie = { fens: string[]; sans: string[]; coups: { from: Square; to: Square }[] };
const nouvellePartie = (fen: string): Partie => ({ fens: [fen], sans: [], coups: [] });
const NOM_CAMP: Record<Color, string> = { w: "Blancs", b: "Noirs" };
// Ce que dit Pote. « reflexion » : Pote est en train de réfléchir (animation), sinon rien.
// « appel » : Pote t'interpelle (« Toc toc, chef ! ») parce qu'il y a un danger.
type Bulle = { mood: Mood; text: string; reflexion?: Reflexion; appel?: boolean };

const ACCUEIL = PHRASES.accueil;

export default function BoardEditor() {
  const [board, setBoard] = useState<BoardMap>(() => fenToBoard(START_FEN));
  const [turn, setTurn] = useState<Color>("w");
  const [tool, setTool] = useState<Tool>("move");
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [status, setStatus] = useState<Status>("idle");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [pote, setPote] = useState<Bulle>({ mood: "neutre", text: ACCUEIL });

  const [mode, setMode] = useState<Mode>("partie");
  const [partie, setPartie] = useState<Partie>(() => nouvellePartie(START_FEN));
  // La pièce touchée en mode partie (on attend qu'on touche la case d'arrivée).
  const [choisie, setChoisie] = useState<Square | null>(null);
  // Mis à true quand on joue ou annule un coup : l'analyse se lance toute seule.
  const analyserApresRef = useRef(false);
  const fenPartie = partie.fens[partie.fens.length - 1];
  const tourPartie = fenPartie.split(" ")[1] as Color;

  // L'explication de la position analysée (pour la réafficher après une animation).
  const explicationRef = useRef<Bulle | null>(null);
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

  // Petit effet manga montré juste après un vrai coup joué pendant la partie
  // (il ne bloque rien : il s'efface tout seul au bout d'1,5 s).
  const [fxJeu, setFxJeu] = useState<MoveFx | null>(null);
  const fxJeuTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (fxJeuTimer.current) clearTimeout(fxJeuTimer.current);
  }, []);
  const montrerCoupJoue = (next: MoveFx | null) => {
    if (fxJeuTimer.current) clearTimeout(fxJeuTimer.current);
    setFxJeu(next);
    if (!next) return;
    fxJeuTimer.current = setTimeout(() => setFxJeu(null), next.kind === "mate" ? 2200 : 1500);
    secouer(next, 120);
  };

  // Le moteur est créé une seule fois, au premier clic sur "Analyser".
  const engineRef = useRef<StockfishEngine | null>(null);
  useEffect(() => () => engineRef.current?.terminate(), []);

  // Toute modification de la position efface l'ancienne analyse.
  const fenEdition = useMemo(() => boardToFen(board, turn), [board, turn]);
  const fen = mode === "partie" ? fenPartie : fenEdition;
  useEffect(() => {
    analyseIdRef.current += 1;
    explicationRef.current = null;
    setAnalysis(null);
    setFx(null);
    setChoisie(null);
    setStatus("idle");
    // Si Pote réfléchissait sur l'ancienne position, il arrête.
    setPote((p) => (p.reflexion ? { mood: "neutre", text: "La position a changé. Appuie sur «\u00a0Analyser\u00a0» quand tu es prêt." } : p));
  }, [fen]);

  // Après un coup joué (ou annulé), Pote analyse la nouvelle position tout seul.
  useEffect(() => {
    if (!analyserApresRef.current) return;
    analyserApresRef.current = false;
    analyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen]);

  const updateBoard = (fn: (b: BoardMap) => BoardMap) => setBoard((b) => fn({ ...b }));

  // --- Mode partie : jouer les coups ---
  // Les cases où la pièce touchée peut aller (petits ronds sur le plateau).
  const cibles = useMemo(() => {
    if (mode !== "partie" || !choisie) return [] as Square[];
    const chess = new Chess(fenPartie, { skipValidation: true });
    return chess.moves({ square: choisie, verbose: true }).map((m) => m.to as Square);
  }, [mode, choisie, fenPartie]);

  // Joue un coup s'il est permis par les règles. Renvoie false sinon.
  // Un pion qui arrive au bout devient une dame.
  const jouerCoup = (from: Square, to: Square): boolean => {
    const chess = new Chess(fenPartie, { skipValidation: true });
    let san: string;
    let uci: string;
    try {
      const coup = chess.move({ from, to, promotion: "q" });
      san = coup.san;
      uci = coup.from + coup.to + (coup.promotion ?? "");
    } catch {
      return false;
    }
    // L'effet manga du coup (traînée, BAM !, ÉCHEC !…), en version rapide.
    montrerCoupJoue(buildMoveFx(fenPartie, uci));
    analyserApresRef.current = true;
    setPartie((p) => ({
      fens: [...p.fens, chess.fen()],
      sans: [...p.sans, toFrenchSan(san)],
      coups: [...p.coups, { from, to }],
    }));
    setChoisie(null);
    return true;
  };

  const annulerCoup = () => {
    if (partie.sans.length === 0) return;
    montrerCoupJoue(null);
    analyserApresRef.current = true;
    setPartie((p) => ({ fens: p.fens.slice(0, -1), sans: p.sans.slice(0, -1), coups: p.coups.slice(0, -1) }));
  };

  const recommencer = () => {
    setPartie(nouvellePartie(START_FEN));
    setMode("partie");
    setFromPhoto(false);
    setOrientation("white");
    setPote({ mood: "neutre", text: PHRASES.nouvellePartie });
  };

  // Passe en mode correction, en partant de la position actuelle de la partie.
  const corriger = () => {
    setBoard(fenToBoard(fenPartie));
    setTurn(tourPartie);
    setTool("move");
    setMode("edition");
    setPote({
      mood: "neutre",
      text: "Arrange les pièces comme sur ton vrai échiquier, choisis qui joue, puis appuie sur « Analyser » pour reprendre la partie.",
    });
  };

  // --- Interactions avec le plateau ---
  const onSquareClick = (square: Square) => {
    if (fx) return;
    if (mode === "partie") {
      if (choisie && cibles.includes(square)) {
        jouerCoup(choisie, square);
        return;
      }
      const piece = new Chess(fenPartie, { skipValidation: true }).get(square);
      setChoisie(piece && piece.color === tourPartie && square !== choisie ? square : null);
      return;
    }
    if (tool === "move") return;
    updateBoard((b) => {
      if (tool === "erase") delete b[square];
      else b[square] = tool;
      return b;
    });
  };

  const onPieceDrop = (from: Square, to: Square, piece: string) => {
    if (from === to) return false;
    if (mode === "partie") return jouerCoup(from, to);
    updateBoard((b) => {
      delete b[from];
      b[to] = piece as PieceCode;
      return b;
    });
    return true;
  };

  const onPieceDropOffBoard = (from: Square) => {
    if (mode === "partie") return;
    updateBoard((b) => {
      delete b[from];
      return b;
    });
  };

  // --- Photo de l'échiquier ---
  const onPhotoStart = () => {
    setFx(null);
    setPote({ mood: "pensif", text: PHRASES.photo, reflexion: "calcul" });
  };

  const onPhotoRead = (rows: string[], doutes: string) => {
    setBoard(rowsToBoard(rows));
    setTool("move");
    setMode("edition");
    setOrientation("white");
    setFromPhoto(true);
    setPote({
      mood: "neutre",
      text:
        "Voilà ce que j'ai vu ! Compare avec ton vrai échiquier et corrige si besoin " +
        "(touche une pièce en bas pour la poser, ou fais-la glisser). " +
        (doutes ? `Vérifie surtout ceci : ${doutes.replace(/[.!\s]*$/, "")}. ` : "") +
        "Ensuite, choisis qui joue et appuie sur «\u00a0Analyser\u00a0». Après, tu pourras jouer la suite de la partie ici.",
    });
  };

  const onPhotoError = (message: string) => {
    setPote({ mood: "panique", text: message });
  };

  // --- Analyse ---
  const analyze = async () => {
    let fenAnalyse: string;
    let camp: Color;
    if (mode === "partie") {
      fenAnalyse = fenPartie;
      camp = tourPartie;
    } else {
      const check = validatePosition(board, turn);
      if (!check.ok) {
        setStatus("error");
        setPote({ mood: "pensif", text: check.message });
        return;
      }
      fenAnalyse = check.fen;
      camp = turn;
      // La position est bonne : la partie reprend à partir d'elle.
      // Si rien n'a changé (mêmes pièces, même camp), on garde la liste des coups.
      const pareil = (f: string) => f.split(" ").slice(0, 2).join(" ");
      setMode("partie");
      if (pareil(check.fen) === pareil(fenPartie)) {
        // L'analyse se lancera toute seule une fois revenu à la partie.
        if (fenPartie !== fenEdition) {
          analyserApresRef.current = true;
          return;
        }
      } else {
        setPartie(nouvellePartie(check.fen));
      }
    }

    const chess = new Chess(fenAnalyse, { skipValidation: true });
    if (chess.isCheckmate()) {
      setStatus("error");
      const gagnant = NOM_CAMP[camp === "w" ? "b" : "w"];
      setPote({ mood: "content", text: `Échec et mat ! Les ${gagnant} gagnent la partie.` });
      return;
    }
    if (chess.isStalemate()) {
      setStatus("error");
      setPote({ mood: "pensif", text: "C'est pat : aucun coup possible et pas d'échec. Partie nulle !" });
      return;
    }

    // Numéro de cette analyse : si la position change pendant le calcul, on jette le résultat.
    const id = analyseIdRef.current;
    setStatus("loading");
    setPote({ mood: "pensif", text: auHasard([...PHRASES.calcul]), reflexion: "calcul" });
    try {
      engineRef.current ??= new StockfishEngine();
      const result = await engineRef.current.analyze(fenAnalyse, 15);
      if (id !== analyseIdRef.current) return;
      const danger = findPiecesInDanger(fenAnalyse, camp);
      const menace = menaceAdverse(fenAnalyse, camp)?.uci ?? null;
      setAnalysis({ fen: fenAnalyse, turn: camp, lines: result.lines, danger, menace });
      setStatus("done");
      expliquer(fenAnalyse, camp, result.lines);
    } catch (err) {
      console.error(err);
      if (id !== analyseIdRef.current) return;
      setStatus("error");
      setPote({ mood: "panique", text: PHRASES.moteurEnPanne });
    }
  };

  // --- Explication de Pote ---
  // On demande au serveur une explication en mots simples. Si ça échoue (pas d'internet,
  // limite atteinte…), Pote lit l'explication calculée directement dans le téléphone.
  const expliquer = async (fenAnalyse: string, camp: Color, lines: EngineLine[]) => {
    const id = analyseIdRef.current;
    const { mood } = poteReaction(lines[0]);
    const faits = calculerFaits(fenAnalyse, camp, lines);
    // Danger ou menace : Pote t'interpelle (« Toc toc, chef ! ») en tapant du pied.
    const appel = Boolean(faits.menace || faits.dangers.length);
    const secours: Bulle = { mood, appel, text: explicationSimple(faits) };
    explicationRef.current = secours;
    if (!lines[0]?.pv[0]) {
      setPote(poteReaction(lines[0]));
      return;
    }
    setPote({
      mood: "pensif",
      text: auHasard([...PHRASES.cherche]),
      reflexion: "explication",
    });
    let resultat = secours;
    try {
      const res = await fetch("/api/expliquer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fen: fenAnalyse, lines: lines.map(({ score, pv }) => ({ score, pv: pv.slice(0, 2) })) }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.explication === "string") {
        resultat = { mood, appel, text: appel ? avecCri(data.explication) : data.explication };
      }
    } catch {
      // pas d'internet : on garde l'explication de secours
    }
    if (id !== analyseIdRef.current) return; // la position a changé entre-temps
    explicationRef.current = resultat;
    // Si un coup est en cours d'animation, on attend « Revenir à ma position ».
    if (!fxRef.current) setPote(resultat);
    // Sinon, Pote arrête quand même de réfléchir (l'explication est prête).
    else setPote((p) => (p.reflexion ? { ...p, reflexion: null } : p));
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
      secouer(next, 380);
    });
  };

  // Secousse du plateau sur une prise, un échec ou un mat. delay : quand la pièce arrive.
  // Le plateau tremble de moins en moins, avec une toute petite rotation (plus naturel).
  const secouer = (coup: MoveFx, delay: number) => {
    if (coup.kind === "move" || coup.kind === "castle" || prefersReducedMotion()) return;
    const f = coup.kind === "mate" ? 9 : coup.kind === "check" ? 6 : 4;
    boardBoxRef.current?.animate(
      [
        { transform: "translate(0, 0) rotate(0)" },
        { transform: `translate(${-f}px, ${f / 2}px) rotate(-0.6deg)` },
        { transform: `translate(${f * 0.8}px, ${-f / 3}px) rotate(0.5deg)` },
        { transform: `translate(${-f / 2}px, ${-f / 4}px) rotate(-0.3deg)` },
        { transform: `translate(${f / 4}px, ${f / 6}px) rotate(0.1deg)` },
        { transform: "translate(0, 0) rotate(0)" },
      ],
      { duration: coup.kind === "mate" ? 520 : 380, delay, easing: "ease-out" },
    );
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
    if (mode === "partie") {
      // Le dernier coup joué : ses deux cases en jaune pâle.
      const dernier = partie.coups[partie.coups.length - 1];
      if (dernier) {
        squareStyles[dernier.from] = { background: "rgba(255, 215, 0, 0.3)" };
        squareStyles[dernier.to] = { background: "rgba(255, 215, 0, 0.4)" };
      }
      // La pièce touchée, et des petits ronds sur les cases où elle peut aller.
      if (choisie) squareStyles[choisie] = { background: "rgba(255, 215, 0, 0.6)" };
      cibles.forEach((sq) => {
        squareStyles[sq] = {
          ...squareStyles[sq],
          backgroundImage: "radial-gradient(circle, rgba(27,23,18,0.35) 18%, transparent 21%)",
        };
      });
    }
    analysis?.danger.forEach((d) => {
      squareStyles[d.square] = {
        ...squareStyles[d.square],
        background: "radial-gradient(circle, rgba(230,40,40,0.85) 45%, rgba(230,40,40,0.35) 75%)",
      };
    });
  }

  // Les coups de la partie, rangés par paires : « 1. e4 e5 », « 2. Cf3 Cc6 »…
  // Si la partie a commencé avec les Noirs (photo), le premier coup blanc est « … ».
  const coupsAffiches = partie.fens[0].split(" ")[1] === "b" ? ["…", ...partie.sans] : partie.sans;
  const paires: string[][] = [];
  for (let i = 0; i < coupsAffiches.length; i += 2) paires.push(coupsAffiches.slice(i, i + 2));

  return (
    <div className={styles.layout}>
      {/* Sur téléphone, les deux colonnes disparaissent et les blocs s'empilent
          dans l'ordre choisi par "order" dans BoardEditor.module.css. */}
      <div className={styles.boardCol}>
        <div className={`${styles.photo} ${mode === "partie" && partie.sans.length > 0 ? styles.photoBas : ""}`}>
          <PhotoReader onStart={onPhotoStart} onRead={onPhotoRead} onError={onPhotoError} />
        </div>

        <div className={styles.boardBlock}>
          <div className={styles.board} ref={boardBoxRef}>
            <Chessboard
              id="editeur"
              position={fx ? fx.fenAfter : mode === "partie" ? fenPartie : board}
              boardOrientation={orientation}
              onSquareClick={onSquareClick}
              onPieceDrop={onPieceDrop}
              onPieceDropOffBoard={onPieceDropOffBoard}
              dropOffBoardAction={mode === "partie" ? "snapback" : "trash"}
              onPromotionCheck={() => false}
              arePiecesDraggable={!fx && (mode === "partie" || tool === "move")}
              isDraggablePiece={({ piece }) => mode === "edition" || piece[0] === tourPartie}
              customArrows={arrows}
              customSquareStyles={squareStyles}
              customLightSquareStyle={{ backgroundColor: "#f3e4c6" }}
              customDarkSquareStyle={{ backgroundColor: "#b98a5e" }}
              areArrowsAllowed={false}
              animationDuration={fx ? 400 : 220}
            />
            {fx && <MangaFx key={fx.id} fx={fx} orientation={orientation} />}
            {!fx && fxJeu && <MangaFx key={fxJeu.id} fx={fxJeu} orientation={orientation} rapide />}
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
          {mode === "partie" && !fx && (
            <div className={styles.row}>
              <button type="button" className="btn" onClick={annulerCoup} disabled={partie.sans.length === 0}>
                Annuler le coup
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setOrientation((o) => (o === "white" ? "black" : "white"))}
              >
                Retourner
              </button>
            </div>
          )}
          {mode === "edition" && fromPhoto && !fx && (
            <div className={styles.row}>
              <button type="button" className="btn" onClick={() => setBoard((b) => rotateBoard(b))}>
                Pièces à l&apos;envers ? Tourner le plateau
              </button>
            </div>
          )}
        </div>

        {mode === "partie" ? (
          <section className={`card ${styles.partie}`}>
            <h2 className="titre">La partie</h2>
            {paires.length === 0 ? (
              <p className={styles.hint}>Aucun coup pour l&apos;instant.</p>
            ) : (
              <ol className={styles.coups}>
                {paires.map((paire, i) => (
                  <li key={i}>
                    <span className={styles.numero}>{i + 1}.</span>
                    {paire.map((san, j) => (
                      <span
                        key={j}
                        className={i * 2 + j === coupsAffiches.length - 1 ? styles.dernierCoup : styles.coup}
                      >
                        {san}
                      </span>
                    ))}
                  </li>
                ))}
              </ol>
            )}
            <p className={styles.hint}>
              La position ne correspond plus à ton échiquier ? Reprends-le en photo (boutons juste en dessous), ou corrige-la à la main.
            </p>
            <div className={styles.row}>
              <button type="button" className="btn" onClick={corriger}>
                Corriger la position
              </button>
              <button type="button" className="btn" onClick={recommencer}>
                Nouvelle partie
              </button>
            </div>
          </section>
        ) : (
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
            <button type="button" className="btn" onClick={() => setMode("partie")}>
              Laisser comme avant et revenir à la partie
            </button>
          </section>
        )}
      </div>

      <div className={styles.sideCol}>
        <div className={styles.pote}>
          <Pote mood={pote.mood} text={pote.text} reflexion={pote.reflexion ?? null} appel={pote.appel} />
        </div>

        <div className={styles.play}>
          {mode === "partie" ? (
            // En partie, le camp qui joue change tout seul après chaque coup.
            <p className={styles.aQui}>
              Aux {NOM_CAMP[tourPartie]} de jouer
            </p>
          ) : (
          /* « Qui joue ? » : deux gros boutons, celui choisi est rempli. */
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
          )}

          {/* En partie, l'analyse se lance toute seule après chaque coup : le bouton
              ne sert qu'avant le premier coup, ou pour relancer. */}
          {!(mode === "partie" && status === "done") && (
            <button
              type="button"
              className="btn btn-main"
              onClick={analyze}
              disabled={status === "loading"}
            >
              {status === "loading" ? "Analyse en cours…" : "Analyser"}
            </button>
          )}
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

        {/* Le chat : il repart à zéro à chaque nouvelle position (key = la position). */}
        {analysis && analysis.lines[0]?.pv[0] && (
          <div className={styles.chat}>
            <ChatPote key={analysis.fen} fen={analysis.fen} lines={analysis.lines} />
          </div>
        )}
      </div>
    </div>
  );
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}
