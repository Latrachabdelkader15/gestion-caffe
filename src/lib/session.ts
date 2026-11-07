import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";

const COOKIE = "session";
/** Durée d'une connexion : un service complet. Après, il faut retaper le mot de passe. */
const DUREE_HEURES = 14;

export type Connecte = { id: number; nom: string; role: Role };

const empreinte = (jeton: string) => createHash("sha256").update(jeton).digest("hex");

/** Page d'arrivée de chaque rôle après connexion. */
export function accueilDuRole(role: Role): string {
  if (role === "SERVEUR") return "/serveur";
  if (role === "BARMAN") return "/bar";
  return "/";
}

/** Ouvre une session (à appeler depuis une server action). */
export async function ouvrirSession(employeId: number) {
  const jeton = randomBytes(32).toString("base64url");
  const expireLe = new Date(Date.now() + DUREE_HEURES * 3600_000);
  await db.session.create({ data: { id: empreinte(jeton), employeId, expireLe } });
  // Nettoyage des sessions expirées
  await db.session.deleteMany({ where: { expireLe: { lt: new Date() } } });
  (await cookies()).set(COOKIE, jeton, {
    httpOnly: true,
    sameSite: "lax",
    // Le café fonctionne en http sur le réseau local : pas de « secure »
    secure: false,
    path: "/",
    expires: expireLe,
  });
}

export async function fermerSession() {
  const c = await cookies();
  const jeton = c.get(COOKIE)?.value;
  if (jeton) await db.session.deleteMany({ where: { id: empreinte(jeton) } });
  c.delete(COOKIE);
}

/** Employé connecté, ou null (session absente, expirée ou employé désactivé). */
export async function employeConnecte(): Promise<Connecte | null> {
  const jeton = (await cookies()).get(COOKIE)?.value;
  if (!jeton) return null;
  const session = await db.session.findUnique({
    where: { id: empreinte(jeton) },
    include: { employe: true },
  });
  if (!session || session.expireLe < new Date() || !session.employe.actif) return null;
  const { id, nom, role } = session.employe;
  return { id, nom, role };
}

/**
 * Pour les pages : renvoie l'employé connecté s'il a l'un des rôles demandés.
 * Le gérant a accès à tout. Sinon : vers la connexion, ou vers sa propre page.
 */
export async function exigerRole(...roles: Role[]): Promise<Connecte> {
  const moi = await employeConnecte();
  if (!moi) redirect("/connexion");
  if (moi.role !== "GERANT" && !roles.includes(moi.role)) redirect(accueilDuRole(moi.role));
  return moi;
}

/** Pour les server actions : même contrôle, mais lève une erreur au lieu de rediriger. */
export async function autoriser(...roles: Role[]): Promise<Connecte> {
  const moi = await employeConnecte();
  if (!moi) throw new Error("Session expirée : reconnectez-vous");
  if (moi.role !== "GERANT" && !roles.includes(moi.role)) throw new Error("Accès refusé");
  return moi;
}
