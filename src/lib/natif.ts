// natif.ts : les petits « plus » quand PionPote tourne dans l'appli iPhone (Capacitor),
// et pas dans Safari. Dans Safari ou sur ordinateur, ces fonctions ne font simplement rien.
// Aujourd'hui : faire vibrer légèrement le téléphone (le « retour haptique »)
//   - quand Pote t'interpelle pour un danger (« Toc toc, chef ! ») : vibration d'alerte ;
//   - quand Pote est content d'un bon coup : petit tapotement léger.
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

/** Vrai seulement dans l'appli iPhone installée depuis l'App Store (ou Xcode). */
export function dansLAppli(): boolean {
  return Capacitor.isNativePlatform();
}

/** Fait vibrer le téléphone : "alerte" pour un danger, "leger" pour un bon coup. */
export function vibrer(type: "alerte" | "leger") {
  if (!dansLAppli()) return;
  const essai =
    type === "alerte"
      ? Haptics.notification({ type: NotificationType.Warning })
      : Haptics.impact({ style: ImpactStyle.Light });
  essai.catch(() => {}); // si la vibration n'est pas possible, on ne dit rien
}
