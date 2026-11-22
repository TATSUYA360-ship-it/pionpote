// photo.ts : préparer la photo AVANT de l'envoyer au serveur.
// Une photo d'iPhone pèse souvent 3 à 5 Mo : on la réduit (1600 pixels de large au maximum)
// et on la convertit en JPEG. Elle devient ~10 fois plus légère, s'envoie vite,
// et Claude la lit aussi bien (il ne regarde pas plus de détails que ça).
const TAILLE_MAX = 1600;

export async function compresserPhoto(fichier: File): Promise<{ image: string; type: "image/jpeg" }> {
  const url = URL.createObjectURL(fichier);
  try {
    const img = new Image();
    img.src = url;
    await img.decode(); // attend que la photo soit chargée (le navigateur tient compte de la rotation)

    const echelle = Math.min(1, TAILLE_MAX / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * echelle);
    canvas.height = Math.round(img.naturalHeight * echelle);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    // dataUrl ressemble à "data:image/jpeg;base64,AAAA…" : on ne garde que la partie après la virgule.
    return { image: dataUrl.split(",")[1], type: "image/jpeg" };
  } finally {
    URL.revokeObjectURL(url);
  }
}
