/**
 * Sauvegarde de la base SQLite dans le dossier ./sauvegardes (garde les 30 dernières).
 * Fonctionne même pendant que l'application tourne (VACUUM INTO = copie cohérente).
 * Usage : npm run db:sauvegarde
 */
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const GARDER = 30;

async function main() {
  const dossier = resolve("sauvegardes");
  mkdirSync(dossier, { recursive: true });
  const n = new Date();
  const d = (x: number) => String(x).padStart(2, "0");
  const horodatage = `${n.getFullYear()}-${d(n.getMonth() + 1)}-${d(n.getDate())}-${d(n.getHours())}h${d(n.getMinutes())}`;
  const fichier = join(dossier, `cafe-${horodatage}.db`);

  const db = new PrismaClient();
  try {
    await db.$executeRawUnsafe(`VACUUM INTO '${fichier.replace(/'/g, "''")}'`);
  } finally {
    await db.$disconnect();
  }
  console.log(`Sauvegarde créée : ${fichier}`);

  const anciennes = readdirSync(dossier)
    .filter((f) => /^cafe-.*\.db$/.test(f))
    .sort()
    .slice(0, -GARDER);
  for (const f of anciennes) rmSync(join(dossier, f));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
