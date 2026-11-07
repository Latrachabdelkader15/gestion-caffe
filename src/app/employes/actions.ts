"use server";

import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { hacher, verifierFormat } from "@/lib/motdepasse";
import { autoriser } from "@/lib/session";

const ROLES: Role[] = ["SERVEUR", "BARMAN", "GERANT"];

const retour = (message: string, erreur = false): never =>
  redirect(`/employes?${erreur ? "erreur" : "ok"}=${encodeURIComponent(message)}`);

export async function ajouterEmploye(formData: FormData) {
  await autoriser("GERANT");
  const nom = String(formData.get("nom") ?? "").trim();
  const role = String(formData.get("role")) as Role;
  const motDePasse = String(formData.get("motDePasse") ?? "");
  if (!nom) retour("Nom requis", true);
  if (!ROLES.includes(role)) retour("Rôle inconnu", true);
  const invalide = verifierFormat(motDePasse);
  if (invalide) retour(invalide, true);
  await db.employe.create({ data: { nom, role, motDePasse: hacher(motDePasse) } });
  retour(`${nom} ajouté`);
}

/** Définir ou réinitialiser le mot de passe : l'employé est déconnecté de ses appareils. */
export async function changerMotDePasse(formData: FormData) {
  const moi = await autoriser("GERANT");
  const employeId = Number(formData.get("employeId"));
  const motDePasse = String(formData.get("motDePasse") ?? "");
  const invalide = verifierFormat(motDePasse);
  if (invalide) retour(invalide, true);
  const employe = await db.employe.update({
    where: { id: employeId },
    data: { motDePasse: hacher(motDePasse) },
  });
  if (employeId !== moi.id) await db.session.deleteMany({ where: { employeId } });
  retour(`Mot de passe de ${employe.nom} enregistré`);
}

export async function changerActif(formData: FormData) {
  const moi = await autoriser("GERANT");
  const employeId = Number(formData.get("employeId"));
  const actif = formData.get("actif") === "1";
  if (employeId === moi.id && !actif) retour("Vous ne pouvez pas désactiver votre propre compte", true);
  const employe = await db.employe.update({ where: { id: employeId }, data: { actif } });
  if (!actif) await db.session.deleteMany({ where: { employeId } });
  retour(`${employe.nom} ${actif ? "réactivé" : "désactivé"}`);
}
