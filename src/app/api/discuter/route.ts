// route.ts : la route API /api/discuter, le « chat » avec Pote. Ce code tourne sur le serveur (Vercel).
// Le joueur pose une question sur la position (« pourquoi ce coup ? », « comment bouge le cavalier ? »)
// et Pote répond en quelques phrases, grâce à Claude et à la clé secrète ANTHROPIC_API_KEY.
//
// Règle d'or, comme pour /api/expliquer : Claude ne choisit AUCUN coup.
//  1. Le serveur recalcule lui-même les faits de la position (src/lib/faits.ts) à partir
//     des coups de Stockfish envoyés par le téléphone, plus la liste des pièces.
//  2. Claude ne peut répondre qu'avec ces faits et les règles du jeu.
//  3. Garde-fou : si la réponse parle d'une case qui n'est nulle part dans les faits,
//     on ne l'affiche pas (Claude a peut-être inventé un coup).
import Anthropic from "@anthropic-ai/sdk";
import { Chess } from "chess.js";
import { calculerFaits, faitsEnTexte, piecesEnTexte } from "@/lib/faits";
import type { Mood } from "@/lib/evaluation";
import type { Color } from "@/lib/position";
import type { EngineLine } from "@/lib/stockfish";
import { CHAT, PERSONNALITE_IA } from "@/lib/personnalite";
import { adresseIP, creerLimite, erreur, lireLignes } from "@/lib/serveur";

export const maxDuration = 60;

// 100 questions par jour et par adresse internet.
const LIMITE_PAR_JOUR = 100;
const depasseLaLimite = creerLimite(LIMITE_PAR_JOUR);

// Le chat garde les derniers échanges seulement (sinon ça coûte de plus en plus cher).
const MAX_MESSAGES = 12;
const MAX_LONGUEUR = 300;

const CONSIGNES = `Tu es Pote, un petit pion qui aide un vrai débutant (enfant ou adulte) pendant une partie d'échecs. Le joueur te pose des questions dans un petit chat.

Tu reçois plus bas les FAITS de la position, déjà calculés par un ordinateur (Stockfish) et la liste des pièces. Tu réponds à la question avec ces faits et avec les règles du jeu.

Règles absolues :
- N'invente jamais de coup, de case, de pièce ou de menace. Ne parle que des coups qui sont dans les faits.
- Ne propose jamais un autre coup que ceux des faits. Ne juge jamais un coup qui n'est pas dans les faits.
- Si le joueur demande où une pièce peut aller, explique comment elle se déplace sans citer de cases, et dis-lui de toucher la pièce sur le plateau : des petits ronds montrent les cases où elle a le droit d'aller.
- Si le joueur demande ce que donnerait un autre coup, ou une chose que les faits ne disent pas, dis-le honnêtement : tu ne peux pas le calculer de tête. Propose-lui de jouer ce coup sur le plateau (il pourra l'annuler avec « Annuler le coup ») : tu le regarderas alors avec l'ordinateur.
- Tu peux expliquer les règles du jeu (comment bougent les pièces, le roque, la prise en passant, l'échec et mat, le pat…) et donner des conseils généraux de débutant, sans les appliquer à des coups précis qui ne sont pas dans les faits.
- Si la question n'a rien à voir avec les échecs, ramène gentiment la discussion vers la partie.

Style :
- 1 à 4 phrases courtes, en français simple. Tutoie le joueur. Réponds d'abord à la question, directement.
- Zéro jargon : pas de notation (Cf3, e4, O-O), pas de chiffres de score. Si un mot d'échecs est indispensable, explique-le en quelques mots.
- Nomme les pièces en entier et les cases comme dans les faits (« ton cavalier en f3 »). Le « flèche verte » du plateau = le meilleur coup, « flèche orange » = la menace de l'adversaire, « rond rouge » = pièce en danger.
- Pas d'émoji, pas de liste, pas de titre.

Humeur : choisis aussi l'humeur de Pote pour cette réponse : « content » (bonne nouvelle, bon coup), « panique » (danger, gaffe), « pensif » (question difficile, tu ne sais pas), « neutre » (le reste).

${PERSONNALITE_IA.replace("(une fois par explication, pas plus)", "(de temps en temps, pas à chaque réponse)").replace(/^- S'il y a un danger.*$/m, "- Ne commence PAS tes réponses par « Toc toc, chef ! » : dans le chat, ce cri est réservé à l'explication principale.")}`;

const HUMEURS: Mood[] = ["content", "panique", "pensif", "neutre"];
const SCHEMA = {
  type: "object",
  properties: {
    reponse: { type: "string" },
    humeur: { type: "string", enum: HUMEURS },
  },
  required: ["reponse", "humeur"],
  additionalProperties: false,
};

type Message = { role: "joueur" | "pote"; texte: string };

// Vérifie l'historique du chat envoyé par le téléphone : il alterne joueur / Pote et finit par le joueur.
function lireMessages(x: unknown): Message[] | null {
  if (!Array.isArray(x) || x.length === 0) return null;
  const messages = (x as Record<string, unknown>[]).slice(-MAX_MESSAGES).map((m) => ({
    role: m?.role,
    texte: typeof m?.texte === "string" ? m.texte.trim().slice(0, MAX_LONGUEUR * 2) : "",
  }));
  // On commence toujours par une question du joueur.
  while (messages.length && messages[0].role !== "joueur") messages.shift();
  const ok =
    messages.length > 0 &&
    messages.every((m, i) => m.role === (i % 2 === 0 ? "joueur" : "pote") && m.texte) &&
    messages[messages.length - 1].role === "joueur" &&
    messages[messages.length - 1].texte.length <= MAX_LONGUEUR;
  return ok ? (messages as Message[]) : null;
}

// Les cases (a1 … h8) écrites dans un texte.
const cases = (texte: string) => new Set(texte.toLowerCase().match(/\b[a-h][1-8]\b/g) ?? []);

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return erreur("Le chat n'est pas encore activé sur le serveur.", 503);
  }
  if (depasseLaLimite(adresseIP(request))) {
    return erreur(`Tu m'as déjà posé ${LIMITE_PAR_JOUR} questions aujourd'hui, chef. Reviens demain !`, 429);
  }

  let fen: string;
  let turn: Color;
  let lignes: EngineLine[];
  let messages: Message[];
  try {
    const body = (await request.json()) as { fen?: unknown; lines?: unknown; messages?: unknown };
    if (typeof body.fen !== "string" || body.fen.length > 100) throw new Error("fen");
    fen = body.fen;
    new Chess(fen, { skipValidation: true }); // lève une erreur si la position est illisible
    turn = fen.split(" ")[1] === "b" ? "b" : "w";
    const l = lireLignes(body.lines);
    const m = lireMessages(body.messages);
    if (!l || !m) throw new Error("données");
    lignes = l;
    messages = m;
  } catch {
    return erreur("Ta question n'a pas été reçue correctement. Réessaie.", 400);
  }

  const faits = `${faitsEnTexte(calculerFaits(fen, turn, lignes))}\n${piecesEnTexte(fen)}`;

  const client = new Anthropic();
  try {
    const message = await client.beta.messages
      .stream({
        model: "claude-opus-5-5",
        max_tokens: 3000,
        // Si Claude refuse par erreur, on réessaie automatiquement avec un autre modèle.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
        system: `${CONSIGNES}\n\nVoici les faits de la position actuelle :\n${faits}`,
        // Les anciennes réponses de Pote sont redonnées sous la même forme (JSON) que celle demandée.
        messages: messages.map((m) =>
          m.role === "joueur"
            ? { role: "user" as const, content: m.texte }
            : { role: "assistant" as const, content: JSON.stringify({ reponse: m.texte, humeur: "neutre" }) },
        ),
      })
      .finalMessage();

    if (message.stop_reason === "refusal") {
      return erreur("Je n'ai pas trouvé mes mots cette fois. Pose ta question autrement ?", 422);
    }
    const bloc = message.content.find((b) => b.type === "text");
    const data = JSON.parse(bloc?.type === "text" ? bloc.text : "") as { reponse: string; humeur: Mood };
    const reponse = data.reponse?.trim();
    if (!reponse) throw new Error("vide");

    // Garde-fou de la règle d'or : une case absente des faits = peut-être un coup inventé.
    // (Les cases de la question ne comptent pas : si le joueur demande « et si je joue en h5 ? »,
    // Pote ne doit pas répondre « bonne idée, joue en h5 » sans l'avis de l'ordinateur.)
    const connues = cases(faits);
    const inconnues = [...cases(reponse)].filter((c) => !connues.has(c));
    if (inconnues.length) {
      console.warn("Réponse écartée (cases inventées ?)", inconnues, reponse);
      return Response.json({ reponse: CHAT.prudent, humeur: "pensif" });
    }
    return Response.json({ reponse, humeur: HUMEURS.includes(data.humeur) ? data.humeur : "neutre" });
  } catch (err) {
    console.error(err);
    if (err instanceof Anthropic.RateLimitError) {
      return erreur("Trop de questions en même temps. Réessaie dans une minute.", 429);
    }
    return erreur("Ma réponse s'est perdue en route. Réessaie dans un instant.", 500);
  }
}
