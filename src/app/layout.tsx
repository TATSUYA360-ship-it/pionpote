// layout.tsx : le "cadre" commun à toutes les pages (langue, titre, styles).
import type { Metadata, Viewport } from "next";
import { Bangers } from "next/font/google";
import "./globals.css";

// Police "bande dessinée" pour les onomatopées manga (BAM !, ÉCHEC !).
const manga = Bangers({ weight: "400", subsets: ["latin"], variable: "--font-manga" });

export const metadata: Metadata = {
  title: "PionPote",
  description: "Comprendre une position d'échecs, expliquée simplement.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <div className={manga.variable}>{children}</div>
      </body>
    </html>
  );
}
