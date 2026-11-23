// aide/page.tsx : la page « Aide » (adresse /aide).
// Apple demande une adresse « d'assistance » où les joueurs trouvent de l'aide et un contact.
import type { Metadata } from "next";
import Link from "next/link";
import styles from "../texte.module.css";

export const metadata: Metadata = { title: "Aide – PionPote" };

export default function Aide() {
  return (
    <main className={`container ${styles.page}`}>
      <Link href="/" className={`btn ${styles.retour}`}>
        Retour à PionPote
      </Link>
      <h1 className="titre">Aide</h1>

      <section className="card">
        <h2 className="titre">Comment ça marche ?</h2>
        <ul>
          <li>Prends en photo ton échiquier, bien au-dessus, avec une bonne lumière.</li>
          <li>Corrige les pièces mal placées si besoin, puis choisis qui joue.</li>
          <li>Appuie sur « Analyser » : Pote te montre le bon coup et t&apos;explique pourquoi.</li>
          <li>Pose-lui tes questions dans le chat sous les résultats.</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="titre">Les flèches</h2>
        <ul>
          <li>Verte : le bon coup conseillé.</li>
          <li>Rouge : une de tes pièces est en danger.</li>
          <li>Orange : ce que l&apos;adversaire menace.</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="titre">Ça ne marche pas ?</h2>
        <ul>
          <li>La photo est mal lue : reprends-la de plus haut, sans reflet, ou corrige les pièces à la main.</li>
          <li>Pote ne répond plus : vérifie ta connexion internet. L&apos;analyse du moteur, elle, marche sans réseau.</li>
          <li>Trop de demandes aujourd&apos;hui : la limite repart à zéro le lendemain.</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="titre">Nous écrire</h2>
        <p>
          Un souci, une idée ? Laisse un message ici :{" "}
          <a href="https://github.com/TATSUYA360-ship-it/pionpote/issues">page des messages de PionPote</a>.
        </p>
        <p className={styles.petit}>
          Voir aussi la page <Link href="/confidentialite">Confidentialité</Link>.
        </p>
      </section>

      <section className="card">
        <h2 className="titre">Merci</h2>
        <p className={styles.petit}>
          Les coups viennent du moteur <a href="https://stockfishchess.org">Stockfish</a>, un logiciel
          libre (licence GPL v3). Les explications sont écrites par l&apos;IA Claude d&apos;Anthropic.
          Le code de PionPote est public :{" "}
          <a href="https://github.com/TATSUYA360-ship-it/pionpote">github.com/TATSUYA360-ship-it/pionpote</a>.
        </p>
      </section>
    </main>
  );
}
