import { db } from "@/lib/db";
import { AutoRefresh } from "@/components/AutoRefresh";
import { PriseCommande } from "./PriseCommande";

export const dynamic = "force-dynamic";

export default async function PageServeur() {
  const [serveurs, produits, commandes] = await Promise.all([
    db.employe.findMany({ where: { role: "SERVEUR", actif: true }, orderBy: { nom: "asc" } }),
    db.produit.findMany({
      where: { actif: true },
      include: { recette: { include: { ingredient: true } } },
      orderBy: [{ categorie: "asc" }, { nom: "asc" }],
    }),
    db.commande.findMany({
      where: { statut: { notIn: ["PAYEE", "ANNULEE"] } },
      include: { lignes: { include: { produit: true } }, serveur: true },
      orderBy: { creeLe: "asc" },
    }),
  ]);

  return (
    <>
      <AutoRefresh secondes={5} />
      <h1>Serveurs</h1>
      <PriseCommande
        serveurs={serveurs.map((s) => ({ id: s.id, nom: s.nom }))}
        produits={produits.map((p) => ({
          id: p.id,
          nom: p.nom,
          categorie: p.categorie,
          prix: p.prix,
          disponible: p.recette.length
            ? Math.max(0, Math.min(...p.recette.map((r) => Math.floor(r.ingredient.quantite / r.quantite + 1e-9))))
            : null,
        }))}
        commandes={commandes.map((c) => ({
          id: c.id,
          table: c.table,
          statut: c.statut,
          serveurId: c.serveurId,
          total: c.lignes.reduce((s, l) => s + l.quantite * l.prixUnit, 0),
          lignes: c.lignes.map((l) => `${l.quantite} × ${l.produit.nom}`),
        }))}
      />
    </>
  );
}
