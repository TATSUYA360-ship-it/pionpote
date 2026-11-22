// page.tsx : la page d'accueil de l'appli (adresse "/").
import BoardEditor from "@/components/BoardEditor";

export default function Home() {
  return (
    <main className="container">
      <header className="header">
        <h1>PionPote</h1>
        <p>Ton pote pour comprendre une position d&apos;échecs.</p>
      </header>
      <BoardEditor />
    </main>
  );
}
