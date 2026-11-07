# Gestion du café

Application web pour gérer les serveurs, le bar et le stock d'un café.

## Fonctionnalités

- **Serveurs** (`/serveur`) : choix du serveur et de la table, prise de commande depuis le menu, suivi de l'état, passage en « servie » puis encaissement.
- **Bar** (`/bar`) : file des commandes en temps réel (rafraîchie toutes les 3 s), « Commencer » puis « Prête ».
- **Stock** (`/stock`) : quantités par ingrédient, alertes de stock bas, entrées de marchandise et ajustements, historique des mouvements.
- **Accueil** (`/`) : ventes encaissées du jour par serveur et alertes de stock.

Chaque produit a une recette (ingrédients consommés par unité). Le stock est déduit à la création de la commande et remis en place si elle est annulée.

Cycle d'une commande : En attente → En préparation → Prête → Servie → Payée (ou Annulée tant qu'elle est en attente).

## Démarrage

```bash
npm install
cp .env.example .env
npm run db:push
npm run db:seed   # données de démonstration
npm run dev
```

Puis ouvrir http://localhost:3000.

## Installation sur l'ordinateur du café (serveur local)

Un ordinateur du café héberge l'application et la base. Les tablettes / téléphones des serveurs et l'écran du bar s'y connectent par le Wi-Fi du café, sans internet.

1. Installer [Node.js](https://nodejs.org) (version 20 ou plus) sur l'ordinateur.
2. Dans le dossier du projet, la première fois :
   ```bash
   npm install
   cp .env.example .env
   npm run db:push
   npm run db:seed   # seulement pour des données d'essai
   ```
3. Lancer le serveur (à chaque démarrage de l'ordinateur) :
   ```bash
   npm run serveur
   ```
   L'adresse à ouvrir sur les tablettes s'affiche, par exemple `http://192.168.1.20:3000`.
4. Conseils :
   - Donner une **IP fixe** à l'ordinateur dans la box (réservation DHCP), pour que l'adresse ne change pas.
   - Autoriser le **port 3000** dans le pare-feu de l'ordinateur (Windows le demande au premier lancement : cocher « Réseaux privés »).
   - Désactiver la mise en veille de l'ordinateur.

### Sauvegarde de la base

Toutes les données sont dans le fichier `prisma/cafe.db`.

```bash
npm run db:sauvegarde
```

crée une copie datée dans `sauvegardes/` (les 30 dernières sont gardées). On peut la lancer pendant que le café tourne, par exemple chaque soir à la fermeture (Planificateur de tâches sous Windows, `cron` sous Linux). Copier de temps en temps le dossier `sauvegardes/` sur une clé USB.

Pour restaurer : arrêter le serveur, remplacer `prisma/cafe.db` par la sauvegarde voulue, relancer.

## Base de données

| Domaine | Tables |
| --- | --- |
| Personnel | `Employe` (nom, code PIN unique, rôle `SERVEUR` / `BARMAN` / `GERANT`, actif) |
| Menu | `Produit`, `LigneRecette` (ingrédients consommés par produit) |
| Commandes | `Commande` (table, serveur, barman, statut, date de paiement), `LigneCommande` |
| Stock | `Ingredient` (quantité, seuil d'alerte, prix d'achat, fournisseur), `Fournisseur`, `Livraison` + `LigneLivraison` (bons de réception), `MouvementStock` (historique : vente, entrée, ajustement, annulation, perte) |

Chaque variation de stock laisse un `MouvementStock` relié à sa commande, sa livraison et à l'employé concerné.

## Stack

Next.js 15 (App Router, server actions), TypeScript, Prisma 6 avec SQLite.

## Prochaines étapes

- Connexion par code PIN et droits selon le rôle (serveur, barman, gérant)
- Gestion du menu, des recettes et des employés depuis l'interface
- Interface en arabe
