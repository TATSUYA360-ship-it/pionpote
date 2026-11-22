// layout.tsx : le "cadre" commun à toutes les pages (langue, titre, styles).
import type { Metadata, Viewport } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
