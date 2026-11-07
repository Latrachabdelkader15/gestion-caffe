import Link from "next/link";
import { db } from "@/lib/db";
import { AutoRefresh } from "@/components/AutoRefresh";
import { STATUTS, type Statut } from "@/lib/statuts";

export const dynamic = "force-dynamic";

const PERIODES = {
  jour: { libelle: "Aujourd'hui", jours: 1 },
  semaine: { libelle: "7 derniers jours", jours: 7 },
  mois: { libelle: "30 derniers jours", jours: 30 },
} as const;
type Periode = keyof typeof PERIODES;

const EN_COURS = ["EN_ATTENTE", "EN_PREPARATION", "PRETE", "SERVIE"] as const;

const dh = (n: number) => `${n.toFixed(2)} DH`;

function cleJour(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default async function TableauDeBord({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const { periode: p } = await searchParams;
  const periode: Periode = p && p in PERIODES ? (p as Periode) : "jour";
  const { jours } = PERIODES[periode];

  const debut = new Date();
  debut.setHours(0, 0, 0, 0);
  debut.setDate(debut.getDate() - (jours - 1));

  const [payees, annulees, enCours, ingredients, catalogue] = await Promise.all([
    db.commande.findMany({
      where: { statut: "PAYEE", creeLe: { gte: debut } },
      include: { serveur: true, lignes: { include: { produit: true } } },
    }),
    db.commande.count({ where: { statut: "ANNULEE", creeLe: { gte: debut } } }),
    db.commande.findMany({
      where: { statut: { in: [...EN_COURS] } },
      include: { serveur: true },
      orderBy: { creeLe: "asc" },
    }),
    db.ingredient.findMany({ orderBy: { nom: "asc" } }),
    db.produit.findMany({
      where: { actif: true },
      include: { recette: { include: { ingredient: true } } },
      orderBy: [{ categorie: "asc" }, { nom: "asc" }],
    }),
  ]);

  // Chiffres globaux
  const montant = (c: (typeof payees)[number]) =>
    c.lignes.reduce((s, l) => s + l.quantite * l.prixUnit, 0);
  const ca = payees.reduce((s, c) => s + montant(c), 0);
  const panierMoyen = payees.length ? ca / payees.length : 0;

  // Ventes par serveur
  const parServeur = new Map<string, { commandes: number; ca: number }>();
  for (const c of payees) {
    const v = parServeur.get(c.serveur.nom) ?? { commandes: 0, ca: 0 };
    v.commandes += 1;
    v.ca += montant(c);
    parServeur.set(c.serveur.nom, v);
  }
  const serveurs = [...parServeur].sort((a, b) => b[1].ca - a[1].ca);

  // Tous les produits : ventes sur la période et portions possibles avec le stock actuel
  const parProduit = new Map<number, { quantite: number; ca: number }>();
  for (const c of payees) {
    for (const l of c.lignes) {
      const v = parProduit.get(l.produitId) ?? { quantite: 0, ca: 0 };
      v.quantite += l.quantite;
      v.ca += l.quantite * l.prixUnit;
      parProduit.set(l.produitId, v);
    }
  }
  const produits = catalogue
    .map((pr) => {
      const v = parProduit.get(pr.id) ?? { quantite: 0, ca: 0 };
      // Nombre d'unités réalisables : limité par l'ingrédient le plus juste
      const possibles = pr.recette.length
        ? Math.max(0, Math.floor(Math.min(...pr.recette.map((r) => r.ingredient.quantite / r.quantite))))
        : null;
      const manque = pr.recette
        .filter((r) => r.ingredient.quantite <= r.ingredient.seuil)
        .map((r) => r.ingredient.nom);
      return { ...pr, vendus: v.quantite, montant: v.ca, possibles, manque };
    })
    .sort((a, b) => b.vendus - a.vendus || a.nom.localeCompare(b.nom));

  // Évolution : par heure pour la journée, par jour sinon
  let barres: { libelle: string; valeur: number }[];
  if (periode === "jour") {
    const heures = new Map<number, number>();
    for (const c of payees) {
      const h = c.creeLe.getHours();
      heures.set(h, (heures.get(h) ?? 0) + montant(c));
    }
    const hs = [...heures.keys()];
    const de = hs.length ? Math.min(8, ...hs) : 8;
    const a = hs.length ? Math.max(new Date().getHours(), ...hs) : new Date().getHours();
    barres = [];
    for (let h = de; h <= a; h++) barres.push({ libelle: `${h}h`, valeur: heures.get(h) ?? 0 });
  } else {
    const parJour = new Map<string, number>();
    for (const c of payees) {
      const k = cleJour(c.creeLe);
      parJour.set(k, (parJour.get(k) ?? 0) + montant(c));
    }
    barres = [];
    for (let i = 0; i < jours; i++) {
      const d = new Date(debut);
      d.setDate(debut.getDate() + i);
      barres.push({
        libelle: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
        valeur: parJour.get(cleJour(d)) ?? 0,
      });
    }
  }
  const max = Math.max(1, ...barres.map((b) => b.valeur));

  // Opérationnel : commandes en cours et stock bas
  const stockBas = ingredients.filter((i) => i.quantite <= i.seuil);
  const attenteMin = enCours.length
    ? Math.floor((Date.now() - enCours[0].creeLe.getTime()) / 60000)
    : 0;
  const compteStatut = (s: string) => enCours.filter((c) => c.statut === s).length;

  return (
    <>
      <AutoRefresh secondes={30} />
      <div className="ligne" style={{ flexWrap: "wrap" }}>
        <h1>Tableau de bord</h1>
        <div className="onglets">
          {(Object.keys(PERIODES) as Periode[]).map((k) => (
            <Link
              key={k}
              href={`/tableau-de-bord?periode=${k}`}
              className={k === periode ? "onglet actif" : "onglet"}
            >
              {PERIODES[k].libelle}
            </Link>
          ))}
        </div>
      </div>

      <div className="grille">
        <div className="carte">
          <div className="muted">Chiffre d'affaires</div>
          <div className="chiffre">{dh(ca)}</div>
        </div>
        <div className="carte">
          <div className="muted">Commandes payées</div>
          <div className="chiffre">{payees.length}</div>
        </div>
        <div className="carte">
          <div className="muted">Panier moyen</div>
          <div className="chiffre">{dh(panierMoyen)}</div>
        </div>
        <div className="carte">
          <div className="muted">Commandes annulées</div>
          <div className={annulees ? "chiffre alerte" : "chiffre"}>{annulees}</div>
        </div>
      </div>

      <h2>{periode === "jour" ? "Ventes par heure" : "Ventes par jour"}</h2>
      <div className="carte">
        <div className="histo">
          {barres.map((b) => (
            <div key={b.libelle} className="histo-col" title={`${b.libelle} : ${dh(b.valeur)}`}>
              <div className="histo-valeur">{b.valeur ? Math.round(b.valeur) : ""}</div>
              <div className="histo-barre" style={{ height: `${(b.valeur / max) * 100}%` }} />
              <div className="histo-libelle">{b.libelle}</div>
            </div>
          ))}
        </div>
        <p className="muted" style={{ marginBottom: 0 }}>Montants en DH, commandes payées uniquement.</p>
      </div>

      <div className="deux-colonnes">
        <section>
          <h2>Ventes par serveur</h2>
          <table>
            <thead>
              <tr><th>Serveur</th><th>Commandes</th><th>Montant</th><th>Part</th></tr>
            </thead>
            <tbody>
              {serveurs.map(([nom, v]) => (
                <tr key={nom}>
                  <td>{nom}</td>
                  <td>{v.commandes}</td>
                  <td>{dh(v.ca)}</td>
                  <td className="muted">{ca ? Math.round((v.ca / ca) * 100) : 0} %</td>
                </tr>
              ))}
              {serveurs.length === 0 && (
                <tr><td colSpan={4} className="muted">Aucune vente sur la période</td></tr>
              )}
            </tbody>
          </table>
        </section>

      </div>

      <h2>Produits</h2>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Produit</th><th>Catégorie</th><th>Prix</th><th>Vendus</th><th>Montant</th>
              <th>Encore possible</th>
            </tr>
          </thead>
          <tbody>
            {produits.map((pr) => (
              <tr key={pr.id}>
                <td>{pr.nom}</td>
                <td className="muted">{pr.categorie}</td>
                <td>{dh(pr.prix)}</td>
                <td>{pr.vendus}</td>
                <td>{dh(pr.montant)}</td>
                <td>
                  {pr.possibles === null ? (
                    <span className="muted">pas de recette</span>
                  ) : (
                    <span className={pr.possibles === 0 || pr.manque.length ? "alerte" : undefined}>
                      {pr.possibles}
                    </span>
                  )}
                  {pr.manque.length > 0 && (
                    <span className="muted"> · bas : {pr.manque.join(", ")}</span>
                  )}
                </td>
              </tr>
            ))}
            {produits.length === 0 && (
              <tr><td colSpan={6} className="muted">Aucun produit au menu</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="muted">« Encore possible » : nombre de produits qu'on peut encore préparer avec le stock actuel.</p>

      <div className="deux-colonnes">
        <section>
          <h2>En ce moment</h2>
          <div className="carte">
            <p style={{ marginTop: 0 }}>
              <strong>{enCours.length}</strong> commande(s) non encaissée(s)
              {enCours.length > 0 && (
                <span className={attenteMin >= 15 ? "alerte" : "muted"}>
                  {" "}· la plus ancienne date de {attenteMin} min (table {enCours[0].table}, {enCours[0].serveur.nom})
                </span>
              )}
            </p>
            <div className="ligne" style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
              {EN_COURS.map((s) => (
                <span key={s} className="badge">
                  {STATUTS[s as Statut]} : {compteStatut(s)}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section>
          <h2>Stock bas</h2>
          <div className="carte">
            {stockBas.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>Tout le stock est au-dessus du seuil.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                {stockBas.map((i) => (
                  <li key={i.id}>
                    <span className="alerte">{i.nom}</span> : {+i.quantite.toFixed(2)} {i.unite}{" "}
                    <span className="muted">(seuil {i.seuil} {i.unite})</span>
                  </li>
                ))}
              </ul>
            )}
            <p style={{ marginBottom: 0 }}>
              <Link href="/stock">Gérer le stock →</Link>
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
