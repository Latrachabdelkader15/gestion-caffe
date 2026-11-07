import Link from "next/link";
import "./globals.css";

export const metadata = { title: "Gestion du café" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <nav>
          <Link href="/">Accueil</Link>
          <Link href="/serveur">Serveurs</Link>
          <Link href="/bar">Bar</Link>
          <Link href="/stock">Stock</Link>
          <Link href="/tableau-de-bord">Tableau de bord</Link>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
