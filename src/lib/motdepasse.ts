import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/** Longueur minimale : 4 caractères (un code PIN à 4 chiffres est accepté). */
export const LONGUEUR_MIN = 4;

export function verifierFormat(motDePasse: string): string | null {
  if (motDePasse.length < LONGUEUR_MIN) return `Au moins ${LONGUEUR_MIN} caractères`;
  if (motDePasse.length > 100) return "Mot de passe trop long";
  return null;
}

/** Hache un mot de passe : "scrypt$<sel>$<empreinte>" (sel aléatoire, base64). */
export function hacher(motDePasse: string): string {
  const sel = randomBytes(16);
  const empreinte = scryptSync(motDePasse, sel, 32);
  return `scrypt$${sel.toString("base64")}$${empreinte.toString("base64")}`;
}

export function verifier(motDePasse: string, stocke: string | null): boolean {
  if (!stocke) return false;
  const [algo, sel, empreinte] = stocke.split("$");
  if (algo !== "scrypt" || !sel || !empreinte) return false;
  const attendu = Buffer.from(empreinte, "base64");
  const calcule = scryptSync(motDePasse, Buffer.from(sel, "base64"), attendu.length);
  return timingSafeEqual(attendu, calcule);
}
