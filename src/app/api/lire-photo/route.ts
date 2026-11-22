// route.ts : la "route API" /api/lire-photo. Ce code tourne sur le serveur (Vercel),
// jamais dans le téléphone. C'est ici, et seulement ici, qu'on utilise la clé API Claude
// (variable d'environnement ANTHROPIC_API_KEY), pour qu'elle reste secrète.
//
// Le téléphone envoie une photo (en texte "base64"). On la donne à Claude, qui répond
// avec les 8 rangées de l'échiquier. On vérifie la réponse et on la renvoie au téléphone.
// Claude ne fait QUE lire la photo : il ne propose aucun coup (règle d'or du projet).
import Anthropic from "@anthropic-ai/sdk";

// Lire une photo peut prendre jusqu'à une minute : on laisse 2 minutes au serveur.
export const maxDuration = 120;

// Limite simple : 20 photos par jour et par adresse internet. Elle est gardée en mémoire,
// donc elle n'est pas parfaite (elle repart à zéro quand Vercel redémarre le serveur).
// La vraie protection, c'est la limite de dépenses réglée sur console.anthropic.com.
const LIMITE_PAR_JOUR = 20;
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

const TYPES_ACCEPTES = ["image/jpeg", "image/png", "image/webp"] as const;
type TypeImage = (typeof TYPES_ACCEPTES)[number];

// Les consignes données à Claude (en anglais : c'est là qu'il lit le plus précisément).
const CONSIGNES = `You read chess positions from photos of real, physical chess boards (or screenshots).

Return the position in standard orientation, whatever the camera angle:
- "rows" has exactly 8 strings, from rank 8 (Black's back rank) down to rank 1 (White's back rank).
- Each string has exactly 8 characters, from file a to file h.
- Use FEN letters: K Q R B N P for White, k q r b n p for Black, and "." for an empty square.

How to find the orientation: use the coordinates printed on the board if you can read them.
Otherwise, square h1 is a light square in the bottom-right corner when seen from White's side.
If you still cannot tell, assume White's pieces started on the side closest to the camera.

Look at every square carefully, one rank at a time. Real pieces cast shadows and can hide each other:
count the pieces of each side and check it is plausible (one king each, at most 8 pawns each).
Never invent pieces to make the position look "normal", and never suggest moves.

"board_found" is false if there is no chess board in the image.
"doubts" is a short sentence in simple French listing the squares you are unsure about,
or an empty string if you are confident.`;

const SCHEMA = {
  type: "object",
  properties: {
    board_found: { type: "boolean" },
    rows: { type: "array", items: { type: "string" } },
    doubts: { type: "string" },
  },
  required: ["board_found", "rows", "doubts"],
  additionalProperties: false,
};

type Reponse = { board_found: boolean; rows: string[]; doubts: string };

function erreur(message: string, status: number) {
  return Response.json({ erreur: message }, { status });
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return erreur(
      "La lecture de photo n'est pas encore activée : il manque la clé API Claude sur le serveur.",
      503,
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "inconnu";
  if (depasseLaLimite(ip)) {
    return erreur(`Tu as déjà lu ${LIMITE_PAR_JOUR} photos aujourd'hui. Reviens demain !`, 429);
  }

  let image: string;
  let type: TypeImage;
  try {
    const body = (await request.json()) as { image?: unknown; type?: unknown };
    if (typeof body.image !== "string" || !TYPES_ACCEPTES.includes(body.type as TypeImage)) {
      throw new Error("format");
    }
    image = body.image;
    type = body.type as TypeImage;
  } catch {
    return erreur("La photo n'a pas été reçue correctement. Réessaie.", 400);
  }
  // Environ 4 Mo de texte au maximum (le téléphone compresse la photo avant l'envoi).
  if (image.length > 4_000_000) {
    return erreur("La photo est trop lourde. Réessaie avec une autre photo.", 413);
  }

  const client = new Anthropic();
  try {
    const message = await client.beta.messages
      .stream({
        model: "claude-opus-5-5",
        max_tokens: 16000,
        // Si Claude refuse par erreur, on réessaie automatiquement avec un autre modèle.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "high", format: { type: "json_schema", schema: SCHEMA } },
        system: CONSIGNES,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: type, data: image } },
              { type: "text", text: "Read the chess position in this image." },
            ],
          },
        ],
      })
      .finalMessage();

    if (message.stop_reason === "refusal") {
      return erreur("Je n'ai pas réussi à lire cette photo. Essaie avec une autre.", 422);
    }

    const texte = message.content.find((b) => b.type === "text");
    const lu = JSON.parse(texte?.type === "text" ? texte.text : "") as Reponse;

    if (!lu.board_found) {
      return erreur("Je ne vois pas d'échiquier sur cette photo. Essaie de cadrer tout le plateau.", 422);
    }
    const rows = lu.rows.map((r) => r.trim());
    const ok = rows.length === 8 && rows.every((r) => /^[KQRBNPkqrbnp.]{8}$/.test(r));
    if (!ok) {
      return erreur("J'ai mal lu le plateau. Essaie une photo plus nette, prise bien au-dessus.", 422);
    }

    return Response.json({ rows, doutes: lu.doubts });
  } catch (err) {
    console.error(err);
    if (err instanceof Anthropic.AuthenticationError) {
      return erreur("La clé API Claude du serveur n'est pas valide.", 500);
    }
    if (err instanceof Anthropic.RateLimitError) {
      return erreur("Trop de demandes en même temps. Réessaie dans une minute.", 429);
    }
    return erreur("La lecture de la photo a échoué. Réessaie dans un instant.", 500);
  }
}
