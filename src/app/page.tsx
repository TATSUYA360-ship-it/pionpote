// page.tsx : la page d'accueil de l'appli (adresse "/").
// En haut : le logo "feutre" (titre écrit au marqueur, souligné en vert, Pote au-dessus)
// et la petite phrase d'accueil.
import BoardEditor from "@/components/BoardEditor";
import { PoteIcon } from "@/components/Pote";

export default function Home() {
  return (
    <main className="container">
      {/* Filtre invisible qui fait "trembler" un peu les traits, comme dessinés à la main. */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <filter id="trait-main">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={7} />
          <feDisplacementMap in="SourceGraphic" scale={3} />
        </filter>
      </svg>
      <header className="header">
        <div className="logo">
          <h1>PionPote</h1>
          <PoteIcon className="logo-pote" />
          <svg className="logo-trait" viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden>
            <path
              d="M4 12 C 60 4, 140 16, 200 8 S 280 10, 296 6"
              fill="none"
              stroke="var(--green)"
              strokeWidth="7"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <p className="tagline">ton pote pour comprendre les échecs</p>
      </header>
      <BoardEditor />
    </main>
  );
}
