/**
 * Définit le mot de passe d'un employé depuis l'ordinateur du café.
 * Sert surtout au premier démarrage, ou si le gérant a oublié son mot de passe.
 *
 * Usage : npm run mot-de-passe -- "Nom" motdepasse
 * Si aucun employé ne porte ce nom, un compte GÉRANT est créé.
 */
import { PrismaClient } from "@prisma/client";
import { hacher, verifierFormat } from "../src/lib/motdepasse";

async function main() {
  const [nom, motDePasse] = process.argv.slice(2);
  if (!nom || !motDePasse) {
    console.error('Usage : npm run mot-de-passe -- "Nom" motdepasse');
    process.exit(1);
  }
  const invalide = verifierFormat(motDePasse);
  if (invalide) {
    console.error(invalide);
    process.exit(1);
  }

  const db = new PrismaClient();
  try {
    const employe = await db.employe.findFirst({ where: { nom } });
    if (employe) {
      await db.employe.update({ where: { id: employe.id }, data: { motDePasse: hacher(motDePasse), actif: true } });
      await db.session.deleteMany({ where: { employeId: employe.id } });
      console.log(`Mot de passe de ${nom} (${employe.role}) enregistré.`);
    } else {
      await db.employe.create({ data: { nom, role: "GERANT", motDePasse: hacher(motDePasse) } });
      console.log(`Compte gérant « ${nom} » créé.`);
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
