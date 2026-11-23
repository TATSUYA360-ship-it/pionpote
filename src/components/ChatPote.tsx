"use client";
// ChatPote.tsx : le petit chat pour poser des questions à Pote sur la position affichée.
// - des questions toutes prêtes à toucher (pas besoin d'écrire) ;
// - un champ pour écrire sa propre question ;
// - les réponses de Pote, avec sa petite tête qui change d'humeur.
// Les questions partent au serveur (/api/discuter), avec la position et les coups de
// Stockfish : Pote ne répond qu'avec ces faits (règle d'or : il n'invente aucun coup).
// Le chat repart à zéro à chaque nouvelle position (BoardEditor lui donne une « key »).
import { useEffect, useRef, useState } from "react";
import type { Mood } from "@/lib/evaluation";
import type { EngineLine } from "@/lib/stockfish";
import { CHAT } from "@/lib/personnalite";
import { PoteIcon } from "./Pote";
import styles from "./ChatPote.module.css";

// erreur : le message d'erreur n'est pas renvoyé au serveur avec les questions suivantes.
type Message = { role: "joueur" | "pote"; texte: string; humeur?: Mood; erreur?: boolean };

const MAX_LONGUEUR = 300;

export default function ChatPote({ fen, lines }: { fen: string; lines: EngineLine[] }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [saisie, setSaisie] = useState("");
  const [attente, setAttente] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  // À chaque nouveau message, on fait défiler juste ce qu'il faut pour le voir.
  useEffect(() => {
    if (messages.length) finRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [messages.length, attente]);

  const demander = async (question: string) => {
    const q = question.trim().slice(0, MAX_LONGUEUR);
    if (!q || attente) return;
    const avec = [...messages, { role: "joueur" as const, texte: q }];
    setMessages(avec);
    setSaisie("");
    setAttente(true);

    // L'historique envoyé : on enlève les questions restées sans réponse (erreur).
    const historique: { role: string; texte: string }[] = [];
    avec.forEach((m, i) => {
      if (m.erreur) return;
      if (m.role === "joueur" && avec[i + 1]?.erreur) return;
      historique.push({ role: m.role, texte: m.texte });
    });

    let reponse: Message;
    try {
      const res = await fetch("/api/discuter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fen,
          lines: lines.map(({ score, pv }) => ({ score, pv: pv.slice(0, 2) })),
          messages: historique,
        }),
      });
      const data = await res.json().catch(() => ({}));
      reponse =
        res.ok && typeof data.reponse === "string"
          ? { role: "pote", texte: data.reponse, humeur: data.humeur }
          : { role: "pote", texte: data.erreur ?? CHAT.horsLigne, humeur: "panique", erreur: true };
    } catch {
      reponse = { role: "pote", texte: CHAT.horsLigne, humeur: "panique", erreur: true };
    }
    setMessages((m) => [...m, reponse]);
    setAttente(false);
  };

  // Les questions toutes prêtes déjà posées disparaissent.
  const suggestions = CHAT.suggestions.filter((s) => !messages.some((m) => m.texte === s));

  return (
    <section className={`card ${styles.chat}`} aria-label={CHAT.titre}>
      <h2 className="titre">{CHAT.titre}</h2>

      {messages.length === 0 && <p className={styles.hint}>{CHAT.invite}</p>}

      {messages.length > 0 && (
        <div className={styles.fil} aria-live="polite">
          {messages.map((m, i) =>
            m.role === "joueur" ? (
              <p key={i} className={styles.joueur}>
                {m.texte}
              </p>
            ) : (
              <div key={i} className={styles.ligne}>
                <span className={styles.avatar}>
                  <PoteIcon mood={m.humeur ?? "neutre"} />
                </span>
                <p className={`${styles.pote} ${styles["bulle_" + (m.humeur ?? "neutre")]}`}>{m.texte}</p>
              </div>
            ),
          )}
          {attente && (
            <div className={styles.ligne}>
              <span className={styles.avatar}>
                <PoteIcon mood="pensif" />
              </span>
              <p className={`${styles.pote} ${styles.bulle_pensif}`} aria-label={CHAT.reflechit}>
                <span className={styles.points} aria-hidden>
                  <i />
                  <i />
                  <i />
                </span>
              </p>
            </div>
          )}
          <div ref={finRef} />
        </div>
      )}

      {!attente && suggestions.length > 0 && (
        <div className={styles.suggestions}>
          {suggestions.map((s) => (
            <button key={s} type="button" className="btn btn-petit" onClick={() => demander(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          demander(saisie);
        }}
      >
        <input
          className={styles.champ}
          type="text"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          placeholder={CHAT.champ}
          maxLength={MAX_LONGUEUR}
          enterKeyHint="send"
          aria-label={CHAT.champ}
        />
        <button type="submit" className="btn" disabled={attente || !saisie.trim()}>
          Envoyer
        </button>
      </form>
    </section>
  );
}
