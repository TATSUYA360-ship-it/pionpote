// route.ts : la "route API" /api/expliquer. Ce code tourne sur le serveur (Vercel).
// C'est ici que Pote « trouve ses mots » grâce à Claude, avec la clé ANTHROPIC_API_KEY
// qui reste secrète sur le serveur.
//
// Règle d'or : Claude ne choisit AUCUN coup. Le téléphone envoie la position et les coups
// trouvés par Stockfish ; le serveur recalcule lui-même les faits (src/lib/faits.ts) et
// Claude n'a le droit que de les raconter en 3 à 5 phrases simples.
import Anthropic from "@anthropic-ai/sdk";
import { Chess } from "chess.js";
import { calculerFaits, faitsEnTexte } from "@/lib/faits";
import type { Color } from "@/lib/position";
import type { EngineLine } from "@/lib/stockfish";
import { PERSONNALITE_IA } from "@/lib/personnalite";

export const maxDuration = 60;

// Limite simple : 60 explications par jour et par adresse internet (gardée en mémoire,
// donc pas parfaite). La vraie protection reste la limite de dépenses sur console.anthropic.com.
const LIMITE_PAR_JOUR = 60;
const compteurs = new Map<string, { jour: string; n: number }>();

function depasseLaLimite(ip: string): boolean {
  const jour = new Date().toISOString().slice(0, 10);
  const c = compteurs.get(ip);
  if (!c || c.jour !== jour) {
    compteurs.set(ip, { jour, n: 1 });
    return false;
  }
  c.n += 1;
  return c.n > LIMITE_PAR_JOUR;
}

// Les consignes données à Claude.
const CONSIGNES = `Tu es Pote, un petit pion qui explique les échecs à un vrai débutant (enfant ou adulte) pendant une partie.

Tu reçois des FAITS déjà calculés par un ordinateur. Ta seule mission : les raconter simplement.

Règles absolues :
- N'invente jamais de coup, de case, de pièce ou de menace. Utilise uniquement ce qui est dans les faits.
- Si les faits ne disent pas pourquoi un coup est bon, dis simplement que c'est le coup le plus solide.
- Ne propose jamais un autre coup que ceux des faits.

Style :
- 3 à 5 phrases courtes, en français simple. Tutoie le joueur.
- Zéro jargon : pas de notation (Cf3, e4, O-O), pas de chiffres de score, pas de mots comme « tempo », « initiative », « développement », « clouage ». Si un mot d'échecs est indispensable (échec, roque), explique-le en quelques mots.
- Nomme les pièces en entier et les cases comme dans les faits (« ton cavalier va en f3 »).
- Ordre : d'abord le danger s'il y en a un, puis le coup conseillé (« la flèche verte ») et pourquoi, puis ce que l'adversaire risque de faire ensuite si c'est utile.
- Ton chaleureux et encourageant, sans en faire trop. Pas d'émoji, pas de liste, pas de titre : juste un petit paragraphe.

${PERSONNALITE_IA}`;

const SCHEMA = {
  type: "object",
  properties: { explication: { type: "string" } },
  required: ["explication"],
  additionalProperties: false,
};

function erreur(message: string, status: number) {
  return Response.json({ erreur: message }, { status });
}

// Vérifie que les lignes envoyées par le téléphone ont la bonne forme.
function lireLignes(x: unknown): EngineLine[] | null {
  if (!Array.isArray(x) || x.length === 0 || x.length > 3) return null;
  const lignes: EngineLine[] = [];
  for (const l of x as Record<string, unknown>[]) {
    const score = l?.score as Record<string, unknown> | undefined;
    const pv = l?.pv;
    if (
      !score ||
      (score.type !== "cp" && score.type !== "mate") ||
      typeof score.value !== "number" ||
      !Array.isArray(pv) ||
      !pv.slice(0, 2).every((m) => typeof m === "string" && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m))
    ) {
      return null;
    }
    lignes.push({
      multipv: lignes.length + 1,
      depth: 0,
      score: { type: score.type, value: score.value },
      pv: (pv as string[]).slice(0, 2),
    });
  }
  return lignes;
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return erreur("Les explications ne sont pas encore activées sur le serveur.", 503);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "inconnu";
  if (depasseLaLimite(ip)) {
    return erreur(`Tu as déjà eu ${LIMITE_PAR_JOUR} explications aujourd'hui. Reviens demain !`, 429);
  }

  let fen: string;
  let turn: Color;
  let lignes: EngineLine[];
  try {
    const body = (await request.json()) as { fen?: unknown; lines?: unknown };
    if (typeof body.fen !== "string" || body.fen.length > 100) throw new Error("fen");
    fen = body.fen;
    new Chess(fen, { skipValidation: true }); // lève une erreur si la position est illisible
    turn = fen.split(" ")[1] === "b" ? "b" : "w";
    const l = lireLignes(body.lines);
    if (!l) throw new Error("lines");
    lignes = l;
  } catch {
    return erreur("La position n'a pas été reçue correctement. Réessaie.", 400);
  }

  const faits = calculerFaits(fen, turn, lignes);
  if (!faits.meilleurCoup) {
    return erreur("Je n'ai rien à expliquer pour cette position.", 422);
  }

  const client = new Anthropic();
  try {
    const message = await client.beta.messages
      .stream({
        model: "claude-opus-5-5",
        max_tokens: 4000,
        // Si Claude refuse par erreur, on réessaie automatiquement avec un autre modèle.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        // "low" : réponse rapide, il n'y a rien à chercher, juste à bien raconter.
        output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
        system: CONSIGNES,
        messages: [{ role: "user", content: `Voici les faits :\n${faitsEnTexte(faits)}` }],
      })
      .finalMessage();

    if (message.stop_reason === "refusal") {
      return erreur("Je n'ai pas trouvé mes mots cette fois.", 422);
    }
    const texte = message.content.find((b) => b.type === "text");
    const { explication } = JSON.parse(texte?.type === "text" ? texte.text : "") as {
      explication: string;
    };
    if (!explication?.trim()) throw new Error("vide");
    return Response.json({ explication: explication.trim() });
  } catch (err) {
    console.error(err);
    if (err instanceof Anthropic.RateLimitError) {
      return erreur("Trop de demandes en même temps. Réessaie dans une minute.", 429);
    }
    return erreur("L'explication a échoué. Réessaie dans un instant.", 500);
  }
}
