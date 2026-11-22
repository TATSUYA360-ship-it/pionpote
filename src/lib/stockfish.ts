// stockfish.ts : discute avec le moteur Stockfish.
// Stockfish tourne dans un "Web Worker" (un petit programme à part dans le
// navigateur) pour ne pas bloquer l'écran pendant qu'il réfléchit.
// On lui parle avec le protocole texte "UCI" : on envoie des commandes,
// il répond par des lignes de texte qu'on lit une par une.

export type EngineLine = {
  multipv: number; // 1 = meilleur coup, 2 = deuxième, 3 = troisième
  depth: number;
  // Score du point de vue du camp qui joue :
  // cp = centipions (100 = un pion d'avance), mate = mat en N coups.
  score: { type: "cp" | "mate"; value: number };
  pv: string[]; // la suite de coups prévue, en notation UCI (ex : "e2e4")
};

export type AnalysisResult = { lines: EngineLine[]; bestMove: string | null };

// Adresse du moteur. NEXT_PUBLIC_BASE_PATH sert seulement si l'appli
// est publiée dans un sous-dossier (sinon c'est vide).
const ENGINE_URL = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/stockfish/stockfish-18-lite-single.js`;

export class StockfishEngine {
  private worker: Worker;
  private ready: Promise<void>;
  private listeners = new Set<(line: string) => void>();

  constructor() {
    this.worker = new Worker(ENGINE_URL);
    this.worker.onmessage = (e: MessageEvent) => {
      const text = typeof e.data === "string" ? e.data : String(e.data);
      for (const l of text.split("\n")) this.listeners.forEach((fn) => fn(l));
    };
    this.ready = this.waitFor("uciok", () => this.send("uci")).then(() =>
      this.waitFor("readyok", () => {
        this.send("setoption name MultiPV value 3");
        this.send("isready");
      }),
    );
  }

  private send(cmd: string) {
    this.worker.postMessage(cmd);
  }

  private waitFor(token: string, start: () => void): Promise<void> {
    return new Promise((resolve) => {
      const fn = (line: string) => {
        if (line.startsWith(token)) {
          this.listeners.delete(fn);
          resolve();
        }
      };
      this.listeners.add(fn);
      start();
    });
  }

  /** Analyse une position (FEN) jusqu'à une profondeur donnée. */
  async analyze(fen: string, depth = 15): Promise<AnalysisResult> {
    await this.ready;
    await this.waitFor("readyok", () => {
      this.send("stop");
      this.send("ucinewgame");
      this.send("isready");
    });

    return new Promise((resolve) => {
      const lines = new Map<number, EngineLine>();
      const fn = (line: string) => {
        if (line.startsWith("info") && line.includes(" pv ")) {
          const parsed = parseInfo(line);
          if (parsed) lines.set(parsed.multipv, parsed);
        } else if (line.startsWith("bestmove")) {
          this.listeners.delete(fn);
          const best = line.split(" ")[1];
          resolve({
            lines: [...lines.values()].sort((a, b) => a.multipv - b.multipv),
            bestMove: best && best !== "(none)" ? best : null,
          });
        }
      };
      this.listeners.add(fn);
      this.send(`position fen ${fen}`);
      this.send(`go depth ${depth}`);
    });
  }

  terminate() {
    this.worker.terminate();
  }
}

function parseInfo(line: string): EngineLine | null {
  const t = line.split(" ");
  const get = (key: string) => t[t.indexOf(key) + 1];
  const scoreIdx = t.indexOf("score");
  if (scoreIdx < 0) return null;
  // On ignore les lignes "lowerbound/upperbound" (scores provisoires).
  if (t[scoreIdx + 3] === "lowerbound" || t[scoreIdx + 3] === "upperbound") return null;
  return {
    multipv: t.includes("multipv") ? Number(get("multipv")) : 1,
    depth: Number(get("depth")),
    score: { type: t[scoreIdx + 1] as "cp" | "mate", value: Number(t[scoreIdx + 2]) },
    pv: t.slice(t.indexOf("pv") + 1),
  };
}
