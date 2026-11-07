# Gestion du café

Application web pour gérer les serveurs, le bar et le stock d'un café.

## Fonctionnalités

- **Connexion** (`/connexion`) : chaque employé touche son nom puis tape son mot de passe (clavier chiffré à l'écran pour les tablettes). Chacun ne voit que ses pages :
  - serveur → Serveurs (seulement ses propres commandes) ;
  - barman → Bar (son nom est enregistré quand il commence une commande) ;
  - gérant → tout : Accueil, Serveurs, Bar, Stock, Tableau de bord, Employés.
  Les mots de passe sont hachés (scrypt), jamais stockés en clair. Après 5 erreurs, le compte est bloqué 1 minute. La connexion dure 14 h (un service), bouton « Déconnexion » en haut.
- **Employés** (`/employes`, gérant) : définir ou réinitialiser le mot de passe d'un employé, ajouter un employé, le désactiver. Changer le mot de passe ou désactiver déconnecte l'employé de ses appareils.
- **Serveurs** (`/serveur`) : choix de la table, prise de commande depuis le menu, suivi de l'état, passage en « servie » puis encaissement.
- **Bar** (`/bar`) : file des commandes en temps réel (rafraîchie toutes les 3 s), « Commencer » puis « Prête ».
- **Stock** (`/stock`) : quantités par ingrédient, alertes de stock bas, entrées de marchandise et ajustements, historique des mouvements.
- **Accueil** (`/`) : ventes encaissées du jour par serveur et alertes de stock.
- **Tableau de bord** (`/tableau-de-bord`) : pour le gérant, sur la journée, 7 jours ou 30 jours : chiffre d'affaires, panier moyen, annulations, ventes par heure ou par jour, ventes par serveur, produits les plus vendus, commandes en cours et stock bas.

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

Puis ouvrir http://localhost:3000. Mots de passe de démonstration : Gérant `0000`, Youssef `1111`, Sara `2222`, Karim `3333` (à changer dans « Employés »).

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
   Sans données d'essai, créer le compte du gérant :
   ```bash
   npm run mot-de-passe -- "Nom du gérant" motdepasse
   ```
   Le gérant ajoute ensuite les serveurs et barmans dans « Employés ». La même commande sert si le gérant a oublié son mot de passe.
3. Lancer le serveur (à chaque démarrage de l'ordinateur) :
   ```bash
   npm run serveur
   ```
   L'adresse à ouvrir sur les tablettes s'affiche, par exemple `http://192.168.1.20:3000`.
4. Conseils :
   - Donner une **IP fixe** à l'ordinateur dans la box (réservation DHCP), pour que l'adresse ne change pas.
   - Autoriser le **port 3000** dans le pare-feu de l'ordinateur (Windows le demande au premier lancement : cocher « Réseaux privés »).
   - Désactiver la mise en veille de l'ordinateur.

### Mise à jour d'une installation existante (passage aux mots de passe)

Les anciens codes PIN en clair sont supprimés. Après avoir récupéré la nouvelle version :

```bash
npm run db:sauvegarde
npm install
npx prisma db push --accept-data-loss   # supprime l'ancienne colonne « pin »
npm run mot-de-passe -- "Nom du gérant" motdepasse
npm run serveur
```

Puis, connecté en gérant, définir le mot de passe de chaque employé dans « Employés ».

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
| Personnel | `Employe` (nom, mot de passe haché, rôle `SERVEUR` / `BARMAN` / `GERANT`, actif), `Session` (connexions ouvertes) |
| Menu | `Produit`, `LigneRecette` (ingrédients consommés par produit) |
| Commandes | `Commande` (table, serveur, barman, statut, date de paiement), `LigneCommande` |
| Stock | `Ingredient` (quantité, seuil d'alerte, prix d'achat, fournisseur), `Fournisseur`, `Livraison` + `LigneLivraison` (bons de réception), `MouvementStock` (historique : vente, entrée, ajustement, annulation, perte) |

Chaque variation de stock laisse un `MouvementStock` relié à sa commande, sa livraison et à l'employé concerné.

## Stack

Next.js 15 (App Router, server actions), TypeScript, Prisma 6 avec SQLite.

## Prochaines étapes

- Gestion du menu et des recettes depuis l'interface
- Interface en arabe
