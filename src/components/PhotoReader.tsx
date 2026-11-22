"use client";
// PhotoReader.tsx : les deux boutons « Prendre une photo » et « Choisir une image ».
// - « Prendre une photo » ouvre directement l'appareil photo de l'iPhone.
// - « Choisir une image » ouvre la galerie (pratique pour une capture d'écran).
// La photo est compressée (src/lib/photo.ts), envoyée au serveur (/api/lire-photo),
// et la position lue est renvoyée à l'éditeur via `onRead`.
import { useRef, useState } from "react";
import { compresserPhoto } from "@/lib/photo";
import styles from "./PhotoReader.module.css";

type Props = {
  onStart: () => void;
  onRead: (rows: string[], doutes: string) => void;
  onError: (message: string) => void;
};

export default function PhotoReader({ onStart, onRead, onError }: Props) {
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    e.target.value = ""; // permet de reprendre la même photo une 2e fois
    if (!fichier) return;

    setBusy(true);
    onStart();
    try {
      const photo = await compresserPhoto(fichier);
      const res = await fetch("/api/lire-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(photo),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onError(data.erreur ?? "La lecture de la photo a échoué. Réessaie.");
      } else {
        onRead(data.rows, data.doutes ?? "");
      }
    } catch {
      onError(
        navigator.onLine
          ? "Je n'arrive pas à ouvrir cette image. Essaie une autre photo."
          : "Il faut une connexion internet pour lire une photo.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.box}>
      <button
        type="button"
        className="btn btn-main"
        disabled={busy}
        onClick={() => cameraRef.current?.click()}
      >
        {busy ? "Je regarde ta photo…" : "📷 Prendre en photo mon échiquier"}
      </button>
      <button
        type="button"
        className="btn"
        disabled={busy}
        onClick={() => galleryRef.current?.click()}
      >
        🖼️ Choisir une image ou une capture
      </button>
      {/* Les vrais champs "fichier" sont cachés : on les déclenche avec les beaux boutons. */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onFile}
      />
      <input ref={galleryRef} type="file" accept="image/*" hidden onChange={onFile} />
      <p className={styles.tip}>
        Astuce : prends la photo bien au-dessus du plateau, avec tout l&apos;échiquier dans
        l&apos;image et une bonne lumière.
      </p>
    </div>
  );
}
