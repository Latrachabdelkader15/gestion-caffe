import type { Prisma, RaisonMouvement } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Calcule la consommation d'ingrédients pour une liste de lignes de commande.
 * Retourne une map ingredientId -> quantité consommée.
 */
export async function consommation(
  tx: Tx,
  lignes: { produitId: number; quantite: number }[],
): Promise<Map<number, number>> {
  const recettes = await tx.ligneRecette.findMany({
    where: { produitId: { in: lignes.map((l) => l.produitId) } },
  });
  const total = new Map<number, number>();
  for (const l of lignes) {
    for (const r of recettes.filter((r) => r.produitId === l.produitId)) {
      total.set(r.ingredientId, (total.get(r.ingredientId) ?? 0) + r.quantite * l.quantite);
    }
  }
  return total;
}

/** Applique un mouvement de stock (delta négatif = sortie) et l'enregistre. */
export async function mouvement(
  tx: Tx,
  ingredientId: number,
  delta: number,
  raison: RaisonMouvement,
  lien: { commandeId?: number; livraisonId?: number; employeId?: number; note?: string } = {},
) {
  await tx.ingredient.update({
    where: { id: ingredientId },
    data: { quantite: { increment: delta } },
  });
  await tx.mouvementStock.create({ data: { ingredientId, delta, raison, ...lien } });
}

/** Réception d'une livraison : crée le bon et ajoute chaque ligne au stock. */
export async function enregistrerLivraison(
  tx: Tx,
  donnees: {
    fournisseurId?: number;
    employeId?: number;
    note?: string;
    lignes: { ingredientId: number; quantite: number; prixUnit?: number }[];
  },
) {
  const lignes = donnees.lignes.filter((l) => l.quantite > 0);
  if (lignes.length === 0) throw new Error("Livraison vide");
  const livraison = await tx.livraison.create({
    data: {
      fournisseurId: donnees.fournisseurId,
      employeId: donnees.employeId,
      note: donnees.note,
      lignes: { create: lignes.map((l) => ({ ...l, prixUnit: l.prixUnit ?? 0 })) },
    },
  });
  for (const l of lignes) {
    await mouvement(tx, l.ingredientId, l.quantite, "ENTREE", {
      livraisonId: livraison.id,
      employeId: donnees.employeId,
    });
    if (l.prixUnit) {
      await tx.ingredient.update({ where: { id: l.ingredientId }, data: { prixAchat: l.prixUnit } });
    }
  }
  return livraison.id;
}
