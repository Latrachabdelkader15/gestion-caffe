import { PrismaClient } from "@prisma/client";
import { enregistrerLivraison } from "../src/lib/stock";
import { hacher } from "../src/lib/motdepasse";

const db = new PrismaClient();

async function main() {
  await db.session.deleteMany();
  await db.mouvementStock.deleteMany();
  await db.ligneLivraison.deleteMany();
  await db.livraison.deleteMany();
  await db.ligneCommande.deleteMany();
  await db.commande.deleteMany();
  await db.ligneRecette.deleteMany();
  await db.produit.deleteMany();
  await db.ingredient.deleteMany();
  await db.employe.deleteMany();
  await db.fournisseur.deleteMany();

  const torrefacteur = await db.fournisseur.create({ data: { nom: "Torréfaction Atlas", telephone: "0600000001" } });
  const laiterie = await db.fournisseur.create({ data: { nom: "Laiterie du quartier", telephone: "0600000002" } });
  const souk = await db.fournisseur.create({ data: { nom: "Marché de gros" } });

  // Mots de passe de démonstration : à changer dans « Employés » avant d'ouvrir le café
  await db.employe.createMany({
    data: [
      { nom: "Gérant", motDePasse: hacher("0000"), role: "GERANT" },
      { nom: "Youssef", motDePasse: hacher("1111"), role: "SERVEUR" },
      { nom: "Sara", motDePasse: hacher("2222"), role: "SERVEUR" },
      { nom: "Karim", motDePasse: hacher("3333"), role: "BARMAN" },
    ],
  });

  // Les ingrédients démarrent à 0 : le stock initial arrive par une livraison
  const ing = async (nom: string, unite: string, seuil: number, prixAchat: number, fournisseurId: number) =>
    db.ingredient.create({ data: { nom, unite, seuil, prixAchat, fournisseurId } });

  const cafe = await ing("Café en grains", "g", 500, 0.15, torrefacteur.id);
  const lait = await ing("Lait", "cl", 300, 0.07, laiterie.id);
  const the = await ing("Thé vert", "g", 100, 0.1, souk.id);
  const menthe = await ing("Menthe", "botte", 3, 3, souk.id);
  const sucre = await ing("Sucre", "g", 500, 0.01, souk.id);
  const orange = await ing("Orange", "pièce", 10, 1, souk.id);
  const eau = await ing("Eau minérale 50cl", "bouteille", 12, 2.5, souk.id);

  const gerant = await db.employe.findFirstOrThrow({ where: { role: "GERANT" } });
  const livrer = (fournisseurId: number, lignes: [number, number][]) =>
    db.$transaction((tx) =>
      enregistrerLivraison(tx, {
        fournisseurId,
        employeId: gerant.id,
        note: "Stock initial",
        lignes: lignes.map(([ingredientId, quantite]) => ({ ingredientId, quantite })),
      }),
    );
  await livrer(torrefacteur.id, [[cafe.id, 5000]]);
  await livrer(laiterie.id, [[lait.id, 2000]]);
  await livrer(souk.id, [[the.id, 1000], [menthe.id, 20], [sucre.id, 5000], [orange.id, 60], [eau.id, 48]]);

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
