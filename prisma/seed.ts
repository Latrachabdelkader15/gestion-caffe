import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  await db.mouvementStock.deleteMany();
  await db.ligneCommande.deleteMany();
  await db.commande.deleteMany();
  await db.ligneRecette.deleteMany();
  await db.produit.deleteMany();
  await db.ingredient.deleteMany();
  await db.employe.deleteMany();

  await db.employe.createMany({
    data: [
      { nom: "Gérant", pin: "0000", role: "GERANT" },
      { nom: "Youssef", pin: "1111", role: "SERVEUR" },
      { nom: "Sara", pin: "2222", role: "SERVEUR" },
      { nom: "Karim", pin: "3333", role: "BARMAN" },
    ],
  });

  const ing = async (nom: string, unite: string, quantite: number, seuil: number) =>
    db.ingredient.create({ data: { nom, unite, quantite, seuil } });

  const cafe = await ing("Café en grains", "g", 5000, 500);
  const lait = await ing("Lait", "cl", 2000, 300);
  const the = await ing("Thé vert", "g", 1000, 100);
  const menthe = await ing("Menthe", "botte", 20, 3);
  const sucre = await ing("Sucre", "g", 5000, 500);
  const orange = await ing("Orange", "pièce", 60, 10);
  const eau = await ing("Eau minérale 50cl", "bouteille", 48, 12);

  const produit = async (
    nom: string,
    categorie: string,
    prix: number,
    recette: [number, number][],
  ) =>
    db.produit.create({
      data: {
        nom,
        categorie,
        prix,
        recette: { create: recette.map(([ingredientId, quantite]) => ({ ingredientId, quantite })) },
      },
    });

  await produit("Café noir", "Cafés", 10, [[cafe.id, 8]]);
  await produit("Café crème", "Cafés", 12, [[cafe.id, 8], [lait.id, 10]]);
  await produit("Nous-nous", "Cafés", 12, [[cafe.id, 8], [lait.id, 5]]);
  await produit("Thé à la menthe", "Thés", 10, [[the.id, 5], [menthe.id, 0.1], [sucre.id, 20]]);
  await produit("Jus d'orange", "Jus", 15, [[orange.id, 3]]);
  await produit("Eau minérale", "Boissons", 6, [[eau.id, 1]]);
}

main()
  .then(() => console.log("Données de démonstration créées."))
  .finally(() => db.$disconnect());
