"use client";
// ServiceWorker.tsx : installe le service worker (public/sw.js) au chargement.
// On ne le fait qu'en version finale : en développement, il gênerait les mises à jour.
import { useEffect } from "react";

export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
