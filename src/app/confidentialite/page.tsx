// confidentialite/page.tsx : la page « Confidentialité » (adresse /confidentialite).
// Apple exige une politique de confidentialité pour publier une appli sur l'App Store.
// Elle dit simplement, en français clair, ce que PionPote fait (et ne fait pas) de tes données.
import type { Metadata } from "next";
import Link from "next/link";
import styles from "../texte.module.css";

export const metadata: Metadata = { title: "Confidentialité – PionPote" };

export default function Confidentialite() {
  return (
    <main className={`container ${styles.page}`}>
      <Link href="/" className={`btn ${styles.retour}`}>
        Retour à PionPote
      </Link>
      <h1 className="titre">Confidentialité</h1>
      <p className={styles.petit}>Dernière mise à jour : 23 novembre 2026</p>

      <section className="card">
        <h2 className="titre">En bref</h2>
        <ul>
          <li>Pas de compte, pas d&apos;e-mail, pas de nom demandé.</li>
          <li>Pas de publicité, pas de pisteur, pas de revente de données.</li>
          <li>PionPote ne garde ni tes photos, ni tes questions, ni tes parties.</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="titre">Ce qui est envoyé, et à qui</h2>
        <p>
          Pour t&apos;expliquer la position, PionPote utilise l&apos;intelligence artificielle
          Claude, de la société Anthropic. Elle ne reçoit que ce qu&apos;il faut pour répondre :
        </p>
        <ul>
          <li>
            <strong>La photo de l&apos;échiquier</strong>, quand tu en prends une ou que tu choisis
            une image : elle sert uniquement à reconnaître les pièces.
          </li>
          <li>
            <strong>La position et l&apos;analyse du moteur</strong> (les coups proposés par
            Stockfish), pour que Pote les explique.
          </li>
          <li>
            <strong>Les questions que tu écris</strong> dans le chat avec Pote.
          </li>
        </ul>
        <p>
          Rien n&apos;est envoyé tant que tu n&apos;appuies pas sur un bouton (photo, analyse ou
          envoi d&apos;une question). Évite de photographier des personnes ou d&apos;écrire des
          informations personnelles : ce n&apos;est pas utile.
        </p>
        <p>
          Anthropic n&apos;utilise pas ces données pour entraîner ses modèles. Elle peut les garder
          quelques semaines au maximum pour la sécurité de son service, puis les efface. Détails :{" "}
          <a href="https://www.anthropic.com/legal/privacy">politique de confidentialité d&apos;Anthropic</a>.
        </p>
      </section>

      <section className="card">
        <h2 className="titre">Ce qui reste sur ton téléphone</h2>
        <ul>
          <li>Le moteur d&apos;échecs Stockfish, enregistré pour que l&apos;analyse marche sans réseau.</li>
          <li>Ton choix « son allumé ou coupé ».</li>
        </ul>
        <p>Ces informations ne quittent pas ton téléphone.</p>
      </section>

      <section className="card">
        <h2 className="titre">Ce que voit le serveur</h2>
        <p>
          Le serveur de PionPote (hébergé chez Vercel) compte combien de demandes arrivent de chaque
          adresse internet dans la journée, pour éviter les abus. Ce compteur est effacé chaque jour.
        </p>
      </section>

      <section className="card">
        <h2 className="titre">Appareil photo et photos</h2>
        <p>
          L&apos;appli te demande la permission d&apos;utiliser l&apos;appareil photo et tes photos,
          seulement pour photographier ou choisir un échiquier. Tu peux retirer ces permissions à tout
          moment dans Réglages, puis PionPote.
        </p>
      </section>

      <section className="card">
        <h2 className="titre">Enfants</h2>
        <p>
          PionPote convient à tous les âges et ne demande aucune information personnelle.
        </p>
      </section>

      <section className="card">
        <h2 className="titre">Une question ?</h2>
        <p>
          Écris-nous depuis la page <Link href="/aide">Aide</Link>.
        </p>
      </section>
    </main>
  );
}
