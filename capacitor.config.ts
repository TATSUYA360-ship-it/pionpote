// capacitor.config.ts : les réglages de l'appli iPhone (Capacitor).
// Capacitor fabrique une « vraie » appli iPhone qui affiche PionPote dans une fenêtre
// plein écran. Ici, l'appli ouvre directement le site en ligne (pionpote.vercel.app) :
// comme ça, chaque mise en ligne sur main met aussi l'appli à jour, sans repasser par Apple.
// Les routes /api (photo, explications, chat) restent sur le serveur Vercel, avec la clé
// secrète : la clé n'est jamais dans l'appli.
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // L'identifiant unique de l'appli chez Apple (on ne peut plus le changer après la 1re publication).
  appId: "com.pionpote.app",
  appName: "PionPote",
  // Petit dossier embarqué dans l'appli : la page affichée s'il n'y a pas d'internet au démarrage.
  webDir: "capacitor-www",
  server: {
    url: "https://pionpote.vercel.app",
    errorPath: "hors-ligne.html",
  },
  ios: {
    // Permet au « service worker » (sw.js) de marcher dans l'appli : le moteur Stockfish
    // reste enregistré dans le téléphone, l'analyse marche même sans réseau.
    limitsNavigationsToAppBoundDomains: true,
    // Le site sait qu'il tourne dans l'appli (voir src/lib/natif.ts).
    appendUserAgent: "PionPoteApp",
    contentInset: "never",
    backgroundColor: "#f6efe0",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: "#f6efe0",
      showSpinner: false,
    },
  },
};

export default config;
