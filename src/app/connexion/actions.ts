"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifier } from "@/lib/motdepasse";
import { accueilDuRole, fermerSession, ouvrirSession } from "@/lib/session";

// Anti-essais : après 5 erreurs, l'employé est bloqué 1 minute (mémoire du serveur local)
const ESSAIS_MAX = 5;
const BLOCAGE_MS = 60_000;
const echecs = new Map<number, { nombre: number; jusqua: number }>();

export type EtatConnexion = { erreur?: string };

export async function seConnecter(_: EtatConnexion, formData: FormData): Promise<EtatConnexion> {
  const employeId = Number(formData.get("employeId"));
  const motDePasse = String(formData.get("motDePasse") ?? "");
  if (!employeId) return { erreur: "Choisissez votre nom" };

  const bloc = echecs.get(employeId);
  if (bloc && bloc.jusqua > Date.now()) {
    const s = Math.ceil((bloc.jusqua - Date.now()) / 1000);
    return { erreur: `Trop d'essais. Réessayez dans ${s} s.` };
  }

  const employe = await db.employe.findUnique({ where: { id: employeId } });
  if (!employe || !employe.actif || !verifier(motDePasse, employe.motDePasse)) {
    // Si un blocage précédent est terminé, on repart de zéro
    const nombre = (bloc && bloc.jusqua === 0 ? bloc.nombre : 0) + 1;
    echecs.set(employeId, { nombre, jusqua: nombre >= ESSAIS_MAX ? Date.now() + BLOCAGE_MS : 0 });
    return { erreur: "Mot de passe incorrect" };
  }

  echecs.delete(employeId);
  await ouvrirSession(employe.id);
  redirect(accueilDuRole(employe.role));
}

export async function seDeconnecter() {
  await fermerSession();
  redirect("/connexion");
}
