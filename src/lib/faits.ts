// faits.ts : traduit l'analyse de Stockfish en « faits » en français simple.
//
// C'est le cœur de la règle d'or : ce n'est PAS l'IA qui décide quoi jouer.
// Ce fichier calcule, avec chess.js, des phrases sûres et vérifiées :
//  - qui joue, et qui est mieux (le score traduit en mots)
//  - le meilleur coup en toutes lettres (« ton cavalier va de g1 à f3 »)
//  - ce que ce coup fait : il prend une pièce ? il met en échec ? il attaque quoi ?
//  - les pièces en danger, et ce que l'adversaire risque de répondre
// Ces faits servent deux fois :
//  1. le serveur les donne à Claude, qui n'a plus qu'à les raconter joliment ;
//  2. si internet ou l'IA ne répond pas, Pote lit directement `explicationSimple`.
import { Chess, type Move, type Square } from "chess.js";
import { findPiecesInDanger } from "./danger";
import type { Color } from "./position";
import type { EngineLine } from "./stockfish";
import { CRI } from "./personnalite";

type Genre = "m" | "f";
const NOM: Record<string, { nom: string; genre: Genre }> = {
  p: { nom: "pion", genre: "m" },
  n: { nom: "cavalier", genre: "m" },
  b: { nom: "fou", genre: "m" },
  r: { nom: "tour", genre: "f" },
  q: { nom: "dame", genre: "f" },
  k: { nom: "roi", genre: "m" },
};
const VALEUR: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

/** « ton cavalier », « ta tour », « le fou adverse », « la dame adverse ». */
function piece(type: string, aMoi: boolean): string {
  const { nom, genre } = NOM[type];
  if (aMoi) return `${genre === "f" ? "ta" : "ton"} ${nom}`;
  return `${genre === "f" ? "la" : "le"} ${nom} adverse`;
}

const CAMP: Record<Color, string> = { w: "les Blancs", b: "les Noirs" };

/** Le score d'une ligne en mots, du point de vue du camp qui joue (« tu »). */
export function scoreEnMots(line: EngineLine): string {
  const { type, value } = line.score;
  if (type === "mate") {
    if (value > 0) return value === 1 ? "mat tout de suite" : `mat en ${value} coups`;
    return "mat contre toi";
  }
  if (value >= 300) return "gros avantage";
  if (value >= 120) return "avantage";
  if (value >= 40) return "un peu mieux";
  if (value > -40) return "égalité";
  if (value > -120) return "un peu moins bien";
  if (value > -300) return "désavantage";
  return "gros désavantage";
}

/** Une phrase complète sur qui est mieux. */
function situation(line: EngineLine): string {
  const { type, value } = line.score;
  if (type === "mate") {
    if (value > 0) {
      return value === 1
        ? "Tu peux faire échec et mat en un seul coup."
        : `Tu peux forcer l'échec et mat en ${value} coups.`;
    }
    return `Attention : l'adversaire peut te mettre échec et mat en ${Math.abs(value)} coups si tu ne fais rien.`;
  }
  if (value >= 300) return "Tu as une grosse avance, comme si tu avais une pièce de plus.";
  if (value >= 120) return "Tu as une bonne avance, à peu près un pion de plus.";
  if (value >= 40) return "Tu es un tout petit peu mieux.";
  if (value > -40) return "La partie est à peu près égale.";
  if (value > -120) return "L'adversaire est un tout petit peu mieux.";
  if (value > -300) return "L'adversaire a une bonne avance, à peu près un pion de plus.";
  return "L'adversaire a une grosse avance, comme s'il avait une pièce de plus.";
}

function jouer(fen: string, uci: string): { chess: Chess; move: Move } | null {
  const chess = new Chess(fen, { skipValidation: true });
  try {
    const move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    return { chess, move };
  } catch {
    return null;
  }
}

/** Décrit un coup en toutes lettres, sans notation : « ton cavalier va de g1 à f3 ». */
function decrireCoup(move: Move, aMoi: boolean): string {
  if (move.isKingsideCastle()) return aMoi ? "tu fais le petit roque (ton roi se met à l'abri sur le côté)" : "l'adversaire fait le petit roque";
  if (move.isQueensideCastle()) return aMoi ? "tu fais le grand roque (ton roi se met à l'abri sur le côté)" : "l'adversaire fait le grand roque";
  let texte = `${piece(move.piece, aMoi)} va de ${move.from} à ${move.to}`;
  if (move.captured) texte += ` et prend ${piece(move.captured, !aMoi)}`;
  if (move.promotion) texte += ` et se transforme en ${NOM[move.promotion].nom}`;
  return texte;
}

/** Les pièces adverses qu'une pièce attaque après le coup (sans le roi). */
function cibles(chess: Chess, case_: Square, couleur: Color): { type: string; square: Square }[] {
  const adversaire: Color = couleur === "w" ? "b" : "w";
  const res: { type: string; square: Square }[] = [];
  for (const rang of chess.board()) {
    for (const c of rang) {
      if (!c || c.color !== adversaire || c.type === "k") continue;
      if (chess.attackers(c.square, couleur).includes(case_)) res.push({ type: c.type, square: c.square });
    }
  }
  return res;
}

/** Le coup en mots, pour la liste des coups : « Cavalier en f3 », « Petit roque ». */
export function coupEnMots(fen: string, uci: string): string {
  const joue = jouer(fen, uci);
  if (!joue) return "";
  const m = joue.move;
  if (m.isKingsideCastle()) return "Petit roque";
  if (m.isQueensideCastle()) return "Grand roque";
  const nom = NOM[m.piece].nom;
  const prise = m.captured ? `prend ${NOM[m.captured].genre === "f" ? "la" : "le"} ${NOM[m.captured].nom}` : "";
  return `${nom.charAt(0).toUpperCase() + nom.slice(1)} en ${m.to}${prise ? `, ${prise}` : ""}`;
}

/**
 * La menace de l'adversaire : ce qu'il ferait si c'était à lui de jouer maintenant.
 * On regarde seulement deux choses sûres : un échec et mat en un coup,
 * ou la prise d'une de tes pièces en danger (la plus précieuse).
 */
export function menaceAdverse(fen: string, turn: Color): { uci: string; texte: string; mat: boolean } | null {
  const parts = fen.split(" ");
  const adversaire: Color = turn === "w" ? "b" : "w";
  parts[1] = adversaire;
  parts[3] = "-"; // pas de prise en passant dans ce « tour imaginaire »
  const chess = new Chess(parts.join(" "), { skipValidation: true });
  if (new Chess(fen, { skipValidation: true }).inCheck()) return null;
  let moves: Move[];
  try {
    moves = chess.moves({ verbose: true });
  } catch {
    return null;
  }
  const enDanger = new Set(findPiecesInDanger(fen, turn).map((d) => d.square));
  let prise: Move | null = null;
  for (const m of moves) {
    chess.move(m);
    const mat = chess.isCheckmate();
    chess.undo();
    if (mat) {
      return {
        uci: m.from + m.to,
        mat: true,
        texte: `l'adversaire menace de faire échec et mat : ${decrireCoup(m, false)}`,
      };
    }
    if (m.captured && enDanger.has(m.to) && (!prise || VALEUR[m.captured] > VALEUR[prise.captured!])) {
      prise = m;
    }
  }
  if (!prise) return null;
  return {
    uci: prise.from + prise.to,
    mat: false,
    texte: `l'adversaire menace de prendre ${piece(prise.captured!, true)} en ${prise.to} avec ${piece(prise.piece, false)}`,
  };
}

export type Faits = {
  camp: string; // « les Blancs »
  situation: string;
  meilleurCoup: string | null; // en toutes lettres
  pourquoi: string[]; // ce que fait ce coup, en phrases courtes
  dangers: string[]; // tes pièces attaquées
  menace: string | null; // ce que l'adversaire veut faire
  reponseAdverse: string | null; // ce que l'adversaire jouera sans doute ensuite
  autresCoups: string[]; // 2e et 3e choix
  seulBonCoup: boolean; // les autres coups sont nettement moins bons
};

/** Calcule tous les faits à partir de la position et des lignes de Stockfish. */
export function calculerFaits(fen: string, turn: Color, lines: EngineLine[]): Faits {
  const best = lines[0];
  const dangerList = findPiecesInDanger(fen, turn);
  const avant = new Chess(fen, { skipValidation: true });
  const enEchec = avant.inCheck();

  const dangers = dangerList.map((d) => {
    const p = avant.get(d.square)!;
    const f = NOM[p.type].genre === "f";
    const raison = d.reason === "non défendue"
      ? `et personne ne ${f ? "la" : "le"} protège`
      : "par une pièce qui vaut moins cher";
    return `${piece(p.type, true)} en ${d.square} est attaqué${f ? "e" : ""} ${raison}`;
  });
  if (enEchec) dangers.unshift("ton roi est en échec : tu es obligé de le protéger tout de suite");

  const faits: Faits = {
    camp: CAMP[turn],
    situation: best ? situation(best) : "Aucun coup n'est possible.",
    meilleurCoup: null,
    pourquoi: [],
    dangers,
    menace: null,
    reponseAdverse: null,
    autresCoups: [],
    seulBonCoup: false,
  };
  const menace = menaceAdverse(fen, turn);
  faits.menace = menace?.texte ?? null;
  if (!best?.pv[0]) return faits;

  const joue = jouer(fen, best.pv[0]);
  if (!joue) return faits;
  const { chess, move } = joue;
  faits.meilleurCoup = decrireCoup(move, true);

  // Pourquoi ce coup ? Uniquement des faits vérifiés par chess.js.
  const adversaire: Color = turn === "w" ? "b" : "w";
  if (chess.isCheckmate()) {
    faits.pourquoi.push("c'est échec et mat : le roi adverse ne peut plus s'échapper, la partie est gagnée");
  } else {
    if (chess.inCheck()) faits.pourquoi.push("il met le roi adverse en échec : l'adversaire doit s'occuper de son roi");
    if (move.captured) {
      const protegee = chess.attackers(move.to, adversaire).length > 0;
      const gain = !protegee
        ? "gratuitement, personne ne peut reprendre"
        : VALEUR[move.captured] > VALEUR[move.piece]
          ? "une bonne affaire, elle vaut plus que ta pièce"
          : "un échange";
      faits.pourquoi.push(`il prend ${piece(move.captured, false)} (${gain})`);
    }
    if (dangerList.some((d) => d.square === move.from)) {
      faits.pourquoi.push(`il met à l'abri ${piece(move.piece, true)}, qui était en danger`);
    }
    if (enEchec) faits.pourquoi.push("il sort ton roi de l'échec");
    if (menace) {
      // La menace marche-t-elle encore après le coup conseillé ?
      const test = jouer(chess.fen(), menace.uci);
      const encore = test && (menace.mat ? test.chess.isCheckmate() : !!test.move.captured);
      if (!encore) faits.pourquoi.push(menace.mat ? "il empêche le mat de l'adversaire" : "il empêche l'adversaire de prendre ta pièce");
    }
    if (move.isKingsideCastle() || move.isQueensideCastle()) {
      faits.pourquoi.push("ton roi est plus en sécurité et ta tour entre dans le jeu");
    }
    if (move.promotion) faits.pourquoi.push("un pion arrivé au bout devient une pièce bien plus forte");
    const attaquees = cibles(chess, move.to, turn).filter((c) => VALEUR[c.type] >= 3);
    if (attaquees.length >= 2) {
      faits.pourquoi.push(
        `il attaque deux pièces en même temps (${attaquees
          .slice(0, 2)
          .map((c) => `${piece(c.type, false)} en ${c.square}`)
          .join(" et ")}) : l'adversaire ne pourra pas tout sauver`,
      );
    } else if (attaquees.length === 1) {
      const c = attaquees[0];
      faits.pourquoi.push(`il attaque ${piece(c.type, false)} en ${c.square}`);
    }
  }
  if (faits.pourquoi.length === 0) {
    faits.pourquoi.push("c'est le coup que l'ordinateur trouve le plus solide : il améliore ta position sans prendre de risque");
  }

  // Ce que l'adversaire répondra sans doute (2e coup de la suite prévue par Stockfish).
  if (best.pv[1] && !chess.isGameOver()) {
    const rep = jouer(chess.fen(), best.pv[1]);
    if (rep) faits.reponseAdverse = decrireCoup(rep.move, false);
  }

  // Les autres choix, et l'écart avec le meilleur.
  for (const l of lines.slice(1)) {
    const autre = l.pv[0] && jouer(fen, l.pv[0]);
    if (autre) faits.autresCoups.push(`${decrireCoup(autre.move, true)} (${scoreEnMots(l)})`);
  }
  const second = lines[1];
  if (second) {
    const ecart =
      best.score.type === "mate" && second.score.type !== "mate"
        ? 1000
        : best.score.type === "cp" && second.score.type === "cp"
          ? best.score.value - second.score.value
          : 0;
    faits.seulBonCoup = ecart >= 150;
  }
  return faits;
}

/** Les faits sous forme de liste, pour les donner à Claude. */
export function faitsEnTexte(f: Faits): string {
  const l: string[] = [`Qui joue : ${f.camp} (on s'adresse à ce camp en disant « tu »).`, `Situation : ${f.situation}`];
  if (f.dangers.length) l.push(`Danger : ${f.dangers.join(" ; ")}.`);
  if (f.menace) l.push(`Menace de l'adversaire : ${f.menace}.`);
  if (f.meilleurCoup) {
    l.push(`Meilleur coup (flèche verte sur le plateau) : ${f.meilleurCoup}.`);
    l.push(`Pourquoi : ${f.pourquoi.join(" ; ")}.`);
    if (f.seulBonCoup) l.push("Les autres coups sont nettement moins bons : c'est LE coup à trouver.");
  }
  if (f.reponseAdverse) l.push(`Réponse probable de l'adversaire ensuite : ${f.reponseAdverse}.`);
  if (f.autresCoups.length) l.push(`Autres coups regardés (moins bons) : ${f.autresCoups.join(" ; ")}.`);
  return l.join("\n");
}

const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Explication de secours, sans IA, si le serveur ne répond pas. */
export function explicationSimple(f: Faits): string {
  const phrases = [f.situation];
  // Danger : Pote pousse son cri d'alerte (voir src/lib/personnalite.ts).
  if (f.menace) phrases.unshift(`${CRI} Attention, ${f.menace}.`);
  else if (f.dangers.length) phrases.unshift(`${CRI} Attention, ${f.dangers[0]}.`);
  if (f.meilleurCoup) {
    phrases.push(`Le meilleur coup (la flèche verte) : ${f.meilleurCoup}.`);
    // On évite de répéter « il prend… » si le coup le dit déjà.
    const raisons = f.pourquoi.filter((r) => !r.startsWith("il prend"));
    if (raisons.length) phrases.push(`${majuscule(raisons.slice(0, 2).join(", et "))}.`);
  }
  return phrases.join(" ");
}

/**
 * Où sont toutes les pièces, en mots (« Blancs : roi en g1, dame en d1… »).
 * Sert au chat : si le joueur demande « où est ma dame ? », Pote peut répondre
 * sans rien inventer.
 */
export function piecesEnTexte(fen: string): string {
  const chess = new Chess(fen, { skipValidation: true });
  const ordre = ["k", "q", "r", "b", "n", "p"];
  const parCamp: Record<Color, string[]> = { w: [], b: [] };
  for (const type of ordre) {
    for (const rang of chess.board()) {
      for (const c of rang) {
        if (c && c.type === type) parCamp[c.color].push(`${NOM[type].nom} en ${c.square}`);
      }
    }
  }
  return `Pièces des Blancs : ${parCamp.w.join(", ") || "aucune"}.\nPièces des Noirs : ${parCamp.b.join(", ") || "aucune"}.`;
}

