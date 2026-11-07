import Link from "next/link";
import { employeConnecte } from "@/lib/session";
import { seDeconnecter } from "./connexion/actions";
import "./globals.css";

export const metadata = { title: "Gestion du café" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const moi = await employeConnecte();
  const gerant = moi?.role === "GERANT";

  return (
    <html lang="fr">
      <body>
        <nav>
          {gerant && <Link href="/">Accueil</Link>}
          {(gerant || moi?.role === "SERVEUR") && <Link href="/serveur">Serveurs</Link>}
          {(gerant || moi?.role === "BARMAN") && <Link href="/bar">Bar</Link>}
          {gerant && <Link href="/stock">Stock</Link>}
          {gerant && <Link href="/tableau-de-bord">Tableau de bord</Link>}
          {gerant && <Link href="/employes">Employés</Link>}
          {!moi && <span className="nav-titre">Gestion du café</span>}
          {moi && (
            <form action={seDeconnecter} className="nav-compte">
              <span>{moi.nom}</span>
              <button className="deconnexion">Déconnexion</button>
            </form>
          )}
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
