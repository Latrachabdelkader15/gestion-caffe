import { db } from "@/lib/db";
import { AutoRefresh } from "@/components/AutoRefresh";
import { exigerRole } from "@/lib/session";
import { PriseCommande } from "./PriseCommande";

export const dynamic = "force-dynamic";

export default async function PageServeur() {
  const moi = await exigerRole("SERVEUR");
  const voirTout = moi.role === "GERANT";
  const [produits, commandes] = await Promise.all([
    db.produit.findMany({
      where: { actif: true },
      include: { recette: { include: { ingredient: true } } },
      orderBy: [{ categorie: "asc" }, { nom: "asc" }],
    }),
    db.commande.findMany({
      // Un serveur ne voit que ses propres commandes
      where: { statut: { notIn: ["PAYEE", "ANNULEE"] }, ...(voirTout ? {} : { serveurId: moi.id }) },
      include: { lignes: { include: { produit: true } }, serveur: true },
      orderBy: { creeLe: "asc" },
    }),
  ]);

  return (
    <>
      <AutoRefresh secondes={5} />
      <h1>Serveurs</h1>
      <PriseCommande
        voirTout={voirTout}
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
          serveur: c.serveur.nom,
          total: c.lignes.reduce((s, l) => s + l.quantite * l.prixUnit, 0),
          lignes: c.lignes.map((l) => `${l.quantite} × ${l.produit.nom}`),
        }))}
      />
    </>
  );
}
