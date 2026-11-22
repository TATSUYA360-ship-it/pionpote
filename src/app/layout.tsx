// layout.tsx : le "cadre" commun à toutes les pages (langue, titre, styles).
import type { Metadata, Viewport } from "next";
import { Bangers, Yusei_Magic } from "next/font/google";
import ServiceWorker from "@/components/ServiceWorker";
import "./globals.css";

// Police "bande dessinée" pour les onomatopées manga (BAM !, ÉCHEC !).
const manga = Bangers({ weight: "400", subsets: ["latin"], variable: "--font-manga" });
// Police "écrite au feutre" pour le logo PionPote.
const feutre = Yusei_Magic({ weight: "400", subsets: ["latin"], variable: "--font-feutre" });

export const metadata: Metadata = {
  title: "PionPote",
  description: "Comprendre une position d'échecs, expliquée simplement.",
  // Réglages pour l'iPhone quand l'appli est ajoutée à l'écran d'accueil.
  appleWebApp: { capable: true, title: "PionPote", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2f8f4e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <div className={`${manga.variable} ${feutre.variable}`}>{children}</div>
        <ServiceWorker />
      </body>
    </html>
  );
}
