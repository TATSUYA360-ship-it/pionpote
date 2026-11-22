// manifest.ts : la "carte d'identité" de l'appli pour le téléphone.
// Grâce à elle, on peut ajouter PionPote sur l'écran d'accueil : il s'ouvre
// alors en plein écran, avec son icône, comme une vraie appli.
import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PionPote",
    short_name: "PionPote",
    description: "Ton pote pour comprendre une position d'échecs.",
    lang: "fr",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f4ee",
    theme_color: "#2f8f4e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
