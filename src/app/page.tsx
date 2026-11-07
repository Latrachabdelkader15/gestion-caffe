import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Accueil() {
  const debutJour = new Date();
  debutJour.setHours(0, 0, 0, 0);

  const [lignes, ingredients, enCours] = await Promise.all([
    db.ligneCommande.findMany({
      where: { commande: { statut: "PAYEE", creeLe: { gte: debutJour } } },
      include: { commande: { include: { serveur: true } } },
    }),
    db.ingredient.findMany(),
    db.commande.count({ where: { statut: { in: ["EN_ATTENTE", "EN_PREPARATION", "PRETE"] } } }),
  ]);

  const parServeur = new Map<string, number>();
  for (const l of lignes) {
    const nom = l.commande.serveur.nom;
    parServeur.set(nom, (parServeur.get(nom) ?? 0) + l.quantite * l.prixUnit);
  }
  const total = [...parServeur.values()].reduce((a, b) => a + b, 0);
  const bas = ingredients.filter((i) => i.quantite <= i.seuil);

  return (
    <>
      <h1>Gestion du café</h1>
      <div className="grille">
        <Link href="/serveur" className="carte">
          <h3>Serveurs</h3>
          <p className="muted">Prendre et suivre les commandes</p>
        </Link>
        <Link href="/bar" className="carte">
          <h3>Bar</h3>
          <p className="muted">{enCours} commande(s) en cours</p>
        </Link>
        <Link href="/stock" className="carte">
          <h3>Stock</h3>
          <p className={bas.length ? "alerte" : "muted"}>
            {bas.length ? `${bas.length} ingrédient(s) en stock bas` : "Stock correct"}
          </p>
        </Link>
        <Link href="/tableau-de-bord" className="carte">
          <h3>Tableau de bord</h3>
          <p className="muted">Ventes, serveurs, produits, stock</p>
        </Link>
      </div>

      <h2>Ventes du jour : {total.toFixed(2)} DH</h2>
      <table>
        <thead>
          <tr><th>Serveur</th><th>Encaissé</th></tr>
        </thead>
        <tbody>
          {[...parServeur].map(([nom, montant]) => (
            <tr key={nom}><td>{nom}</td><td>{montant.toFixed(2)} DH</td></tr>
          ))}
          {parServeur.size === 0 && (
            <tr><td colSpan={2} className="muted">Aucune vente encaissée aujourd'hui</td></tr>
          )}
        </tbody>
      </table>
    </>
  );
}
