"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { consommation, mouvement } from "@/lib/stock";
import { TRANSITIONS, type Statut } from "@/lib/statuts";

export type LigneSaisie = { produitId: number; quantite: number; note?: string };

export type Resultat = { ok: true; id: number } | { ok: false; erreur: string };

/**
 * Le serveur crée une commande : le stock est vérifié puis déduit immédiatement.
 * Retourne une erreur lisible (au lieu de lever une exception) pour que le message
 * s'affiche aussi en production sur la tablette du serveur.
 */
export async function creerCommande(
  serveurId: number,
  table: string,
  lignes: LigneSaisie[],
): Promise<Resultat> {
  const valides = lignes.filter((l) => l.quantite > 0);
  if (!table.trim()) return { ok: false, erreur: "Numéro de table requis" };
  if (valides.length === 0) return { ok: false, erreur: "Commande vide" };

  try {
    const id = await db.$transaction(async (tx) => {
      const produits = await tx.produit.findMany({
        where: { id: { in: valides.map((l) => l.produitId) }, actif: true },
      });
      const prix = new Map(produits.map((p) => [p.id, p.prix]));
      if (valides.some((l) => !prix.has(l.produitId))) throw new ErreurCommande("Produit indisponible");

      // Vérification du stock avant d'accepter la commande
      const besoins = await consommation(tx, valides);
      const ingredients = await tx.ingredient.findMany({ where: { id: { in: [...besoins.keys()] } } });
      const manquants = ingredients
        .filter((i) => i.quantite < (besoins.get(i.id) ?? 0))
        .map((i) => `${i.nom} (reste ${arrondi(i.quantite)} ${i.unite}, besoin ${arrondi(besoins.get(i.id)!)})`);
      if (manquants.length > 0) {
        throw new ErreurCommande(`Stock insuffisant : ${manquants.join(", ")}`);
      }

      const commande = await tx.commande.create({
        data: {
          table: table.trim(),
          serveurId,
          lignes: {
            create: valides.map((l) => ({
              produitId: l.produitId,
              quantite: l.quantite,
              prixUnit: prix.get(l.produitId)!,
              note: l.note,
            })),
          },
        },
      });

      for (const [ingredientId, qte] of besoins) {
        await mouvement(tx, ingredientId, -qte, "VENTE", { commandeId: commande.id, employeId: serveurId });
      }
      return commande.id;
    });
    revalidatePath("/", "layout");
    return { ok: true, id };
  } catch (e) {
    if (e instanceof ErreurCommande) return { ok: false, erreur: e.message };
    throw e;
  }
}

class ErreurCommande extends Error {}

const arrondi = (n: number) => Math.round(n * 100) / 100;

/**
 * Changement d'état (bar : préparation / prête ; serveur : servie / payée / annulée).
 * `barmanId` : le barman qui clique « Commencer » est enregistré sur la commande.
 */
export async function changerStatut(commandeId: number, nouveau: Statut, barmanId?: number) {
  await db.$transaction(async (tx) => {
    const commande = await tx.commande.findUniqueOrThrow({
      where: { id: commandeId },
      include: { lignes: true },
    });
    const actuel = commande.statut as Statut;
    if (nouveau === "EN_PREPARATION") {
      const barman = barmanId ? await tx.employe.findUnique({ where: { id: barmanId } }) : null;
      if (!barman || barman.role !== "BARMAN" || !barman.actif) throw new Error("Choisir le barman");
    }
    if (!TRANSITIONS[actuel].includes(nouveau)) {
      throw new Error(`Transition impossible : ${actuel} → ${nouveau}`);
    }
    await tx.commande.update({
      where: { id: commandeId },
      data: {
        statut: nouveau,
        payeeLe: nouveau === "PAYEE" ? new Date() : undefined,
        barmanId: nouveau === "EN_PREPARATION" ? barmanId : undefined,
      },
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
