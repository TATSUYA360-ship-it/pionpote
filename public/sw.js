// sw.js : le "service worker". C'est un petit programme que le téléphone garde
// en mémoire. Il enregistre les fichiers de l'appli (dont le moteur Stockfish)
// pour que PionPote s'ouvre vite et marche même sans connexion.
const CACHE = "pionpote-v1";
const PRECACHE = [
  "/",
  "/stockfish/stockfish-18-lite-single.js",
  "/stockfish/stockfish-18-lite-single.wasm",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // On supprime les anciennes versions du cache.
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  // Les pages : on essaie d'abord internet (pour avoir la dernière version),
  // et sinon on prend la copie gardée.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/"))),
    );
    return;
  }

  // Le reste (moteur, images, code) : la copie gardée d'abord, c'est plus rapide.
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
