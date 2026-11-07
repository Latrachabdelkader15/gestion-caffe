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

## Stack

Next.js 15 (App Router, server actions), TypeScript, Prisma 6 avec SQLite.

## Prochaines étapes

- Connexion par code PIN et droits selon le rôle (serveur, barman, gérant)
- Gestion du menu, des recettes et des employés depuis l'interface
- Interface en arabe
