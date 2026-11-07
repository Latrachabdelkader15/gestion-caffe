import type { Prisma } from "@prisma/client";

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
  raison: "VENTE" | "ENTREE" | "AJUSTEMENT" | "ANNULATION",
  commandeId?: number,
) {
  await tx.ingredient.update({
    where: { id: ingredientId },
    data: { quantite: { increment: delta } },
  });
  await tx.mouvementStock.create({ data: { ingredientId, delta, raison, commandeId } });
}
