// serveur.ts : des petits outils partagés par les routes API (/api/expliquer, /api/discuter).
// Ce code ne tourne que sur le serveur (Vercel), jamais dans le téléphone.
import type { EngineLine } from "./stockfish";

/** Répond une erreur en JSON : { erreur: "message en français" }. */
export function erreur(message: string, status: number) {
  return Response.json({ erreur: message }, { status });
}

/** L'adresse internet de la personne (sert à compter ses demandes). */
export function adresseIP(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "inconnu";
}

/**
 * Crée un compteur « N demandes par jour et par adresse internet ».
 * Il est gardé en mémoire, donc pas parfait (il repart à zéro quand le serveur redémarre).
 * La vraie protection reste la limite de dépenses sur console.anthropic.com.
 * Renvoie une fonction : depasse(ip) vaut true quand la limite du jour est dépassée.
 */
export function creerLimite(parJour: number) {
  const compteurs = new Map<string, { jour: string; n: number }>();
  return function depasse(ip: string): boolean {
    const jour = new Date().toISOString().slice(0, 10);
    const c = compteurs.get(ip);
    if (!c || c.jour !== jour) {
      compteurs.set(ip, { jour, n: 1 });
      return false;
    }
    c.n += 1;
    return c.n > parJour;
  };
}

/** Vérifie que les lignes de Stockfish envoyées par le téléphone ont la bonne forme. */
export function lireLignes(x: unknown): EngineLine[] | null {
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
