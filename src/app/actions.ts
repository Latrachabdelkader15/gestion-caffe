"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { consommation, mouvement } from "@/lib/stock";
import { TRANSITIONS, type Statut } from "@/lib/statuts";

export type LigneSaisie = { produitId: number; quantite: number; note?: string };

/** Le serveur crée une commande : le stock est déduit immédiatement. */
export async function creerCommande(serveurId: number, table: string, lignes: LigneSaisie[]) {
  const valides = lignes.filter((l) => l.quantite > 0);
  if (!table.trim()) throw new Error("Numéro de table requis");
  if (valides.length === 0) throw new Error("Commande vide");

  const id = await db.$transaction(async (tx) => {
    const produits = await tx.produit.findMany({
      where: { id: { in: valides.map((l) => l.produitId) }, actif: true },
    });
    const prix = new Map(produits.map((p) => [p.id, p.prix]));

    const commande = await tx.commande.create({
      data: {
        table: table.trim(),
        serveurId,
        lignes: {
          create: valides.map((l) => {
            const prixUnit = prix.get(l.produitId);
            if (prixUnit === undefined) throw new Error("Produit indisponible");
            return { produitId: l.produitId, quantite: l.quantite, prixUnit, note: l.note };
          }),
        },
      },
    });

    for (const [ingredientId, qte] of await consommation(tx, valides)) {
      await mouvement(tx, ingredientId, -qte, "VENTE", { commandeId: commande.id, employeId: serveurId });
    }
    return commande.id;
  });

  revalidatePath("/", "layout");
  return id;
}

/** Changement d'état (bar : préparation / prête ; serveur : servie / payée / annulée). */
export async function changerStatut(commandeId: number, nouveau: Statut) {
  await db.$transaction(async (tx) => {
    const commande = await tx.commande.findUniqueOrThrow({
      where: { id: commandeId },
      include: { lignes: true },
    });
    const actuel = commande.statut as Statut;
    if (!TRANSITIONS[actuel].includes(nouveau)) {
      throw new Error(`Transition impossible : ${actuel} → ${nouveau}`);
    }
    await tx.commande.update({
      where: { id: commandeId },
      data: { statut: nouveau, payeeLe: nouveau === "PAYEE" ? new Date() : undefined },
    });

    // Annulation avant préparation : on remet le stock
    if (nouveau === "ANNULEE") {
      for (const [ingredientId, qte] of await consommation(tx, commande.lignes)) {
        await mouvement(tx, ingredientId, qte, "ANNULATION", { commandeId });
      }
    }
  });
  revalidatePath("/", "layout");
}

/** Entrée de marchandise ou ajustement d'inventaire. */
export async function ajusterStock(formData: FormData) {
  const ingredientId = Number(formData.get("ingredientId"));
  const choix = formData.get("raison");
  const raison = choix === "AJUSTEMENT" || choix === "PERTE" ? choix : "ENTREE";
  const saisi = Number(formData.get("delta"));
  const delta = raison === "PERTE" ? -Math.abs(saisi) : saisi;
  if (!ingredientId || !Number.isFinite(delta) || delta === 0) return;
  await db.$transaction((tx) => mouvement(tx, ingredientId, delta, raison));
  revalidatePath("/stock");
}
