// sons.ts : le petit bruit « toc toc » de Pote (comme un pion en bois qui tape sur sa case).
// Le son est fabriqué directement par le téléphone (Web Audio), il n'y a pas de fichier audio.
// Il est COUPÉ par défaut ; le choix du joueur est gardé dans le téléphone (localStorage).
//
// Piège iPhone : Safari n'accepte de jouer un son qu'après un toucher de l'écran.
// On « réveille » donc le son au premier toucher, puis il peut jouer plus tard tout seul.

const CLE = "pionpote-son";
let ctx: AudioContext | null = null;

export function sonActive(): boolean {
  try {
    return localStorage.getItem(CLE) === "oui";
  } catch {
    return false;
  }
}

export function choisirSon(actif: boolean) {
  try {
    localStorage.setItem(CLE, actif ? "oui" : "non");
  } catch {
    // stockage bloqué (navigation privée) : tant pis, le choix ne sera pas retenu
  }
  if (actif) reveiller();
}

/** À appeler pendant un toucher de l'écran : prépare le son pour plus tard. */
export function reveiller() {
  if (typeof window === "undefined" || !sonActive()) return;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx ??= new AC();
  if (ctx.state === "suspended") void ctx.resume();
}

/** Un seul « toc » : un petit bruit très court, filtré pour sonner comme du bois. */
function toc(debut: number, aigu: number) {
  if (!ctx) return;
  const duree = 0.08;
  const bruit = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duree), ctx.sampleRate);
  const data = bruit.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 4;
  const source = ctx.createBufferSource();
  source.buffer = bruit;
  const filtre = ctx.createBiquadFilter();
  filtre.type = "bandpass";
  filtre.frequency.value = aigu;
  filtre.Q.value = 6;
  const volume = ctx.createGain();
  volume.gain.setValueAtTime(0.9, debut);
  volume.gain.exponentialRampToValueAtTime(0.001, debut + duree);
  source.connect(filtre).connect(volume).connect(ctx.destination);
  source.start(debut);
}

/** « Toc toc » : deux petits coups de bois, le second un peu plus aigu. */
export function jouerTocToc() {
  if (!sonActive() || !ctx || ctx.state !== "running") return;
  const t = ctx.currentTime + 0.02;
  toc(t, 900);
  toc(t + 0.16, 1100);
}
