"use client";

import { useMemo, useState, useTransition } from "react";
import { creerCommande } from "@/app/actions";
import { BoutonStatut } from "@/components/BoutonStatut";
import { STATUTS, type Statut } from "@/lib/statuts";

// disponible : nombre maximum d'unités réalisables avec le stock actuel (null = pas de recette)
type Produit = { id: number; nom: string; categorie: string; prix: number; disponible: number | null };
type Commande = {
  id: number;
  table: string;
  statut: string;
  serveurId: number;
  total: number;
  lignes: string[];
};

const TABLES = Array.from({ length: 20 }, (_, i) => String(i + 1));

export function PriseCommande({
  serveurs,
  produits,
  commandes,
}: {
  serveurs: { id: number; nom: string }[];
  produits: Produit[];
  commandes: Commande[];
}) {
  const [serveurId, setServeurId] = useState<number>(serveurs[0]?.id ?? 0);
  const [table, setTable] = useState("");
  const [panier, setPanier] = useState<Record<number, number>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, start] = useTransition();

  const categories = useMemo(() => [...new Set(produits.map((p) => p.categorie))], [produits]);
  const [categorie, setCategorie] = useState<string>("TOUT");
  const visibles = categorie === "TOUT" ? produits : produits.filter((p) => p.categorie === categorie);

  const lignes = produits.filter((p) => (panier[p.id] ?? 0) > 0);
  const total = lignes.reduce((s, p) => s + panier[p.id] * p.prix, 0);
  // On ne peut pas ajouter plus que ce que le stock permet de préparer
  const max = (id: number) => produits.find((p) => p.id === id)?.disponible ?? Infinity;
  const ajouter = (id: number, n: number) =>
    setPanier((p) => ({ ...p, [id]: Math.min(max(id), Math.max(0, (p[id] ?? 0) + n)) }));
  const plein = (id: number) => (panier[id] ?? 0) >= max(id);

  const envoyer = () =>
    start(async () => {
      setErreur(null);
      try {
        const res = await creerCommande(
          serveurId,
          table,
          Object.entries(panier).map(([produitId, quantite]) => ({ produitId: Number(produitId), quantite })),
        );
        if (!res.ok) return setErreur(res.erreur);
        setPanier({});
        setTable("");
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Erreur");
      }
    });

  const mesCommandes = commandes.filter((c) => c.serveurId === serveurId);

  return (
    <div className="tactile">
      <div className="choix">
        {serveurs.map((s) => (
          <button
            key={s.id}
            className={s.id === serveurId ? "puce actif" : "puce"}
            onClick={() => setServeurId(s.id)}
          >
            {s.nom}
          </button>
        ))}
      </div>

      <div className="caisse">
        <div>
          <div className="choix">
            <button className={categorie === "TOUT" ? "puce actif" : "puce"} onClick={() => setCategorie("TOUT")}>
              Tout
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                className={categorie === cat ? "puce actif" : "puce"}
                onClick={() => setCategorie(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="tuiles">
            {visibles.map((p) => (
              <button key={p.id} className="tuile" disabled={plein(p.id)} onClick={() => ajouter(p.id, 1)}>
                {(panier[p.id] ?? 0) > 0 && <span className="pastille">{panier[p.id]}</span>}
                <span className="tuile-nom">{p.nom}</span>
                {p.disponible === 0 && <span className="alerte">Épuisé</span>}
                {p.disponible !== null && p.disponible > 0 && p.disponible <= 5 && (
                  <span className="alerte">Plus que {p.disponible}</span>
                )}
                <span className="tuile-prix">{p.prix.toFixed(2)} DH</span>
              </button>
            ))}
          </div>
        </div>

        <aside className="ticket carte">
          <div className="muted">Table</div>
          <div className="tables">
            {TABLES.map((t) => (
              <button key={t} className={t === table ? "puce actif" : "puce"} onClick={() => setTable(t)}>
                {t}
              </button>
            ))}
          </div>

          <div className="ticket-lignes">
            {lignes.map((p) => (
              <div key={p.id} className="ligne ticket-ligne">
                <span>{p.nom}</span>
                <span className="ligne">
                  <button className="rond secondaire" onClick={() => ajouter(p.id, -1)} aria-label="Retirer">−</button>
                  <strong style={{ minWidth: "1.5rem", textAlign: "center" }}>{panier[p.id]}</strong>
                  <button className="rond" disabled={plein(p.id)} onClick={() => ajouter(p.id, 1)} aria-label="Ajouter">+</button>
                </span>
              </div>
            ))}
            {lignes.length === 0 && <p className="muted">Touchez un produit pour l'ajouter.</p>}
          </div>

          <div className="ligne" style={{ fontSize: "1.3rem" }}>
            <strong>Total</strong>
            <strong>{total.toFixed(2)} DH</strong>
          </div>
          {erreur && <p className="alerte">{erreur}</p>}
          <div className="ligne">
            <button className="grand secondaire" disabled={enCours || lignes.length === 0} onClick={() => setPanier({})}>
              Vider
            </button>
            <button className="grand" disabled={enCours || lignes.length === 0 || !table} onClick={envoyer}>
              {table ? `Envoyer (table ${table})` : "Choisir la table"}
            </button>
          </div>
        </aside>
      </div>

      <h2>Mes commandes en cours</h2>
      <div className="grille">
        {mesCommandes.map((c) => (
          <div key={c.id} className="carte">
            <div className="ligne">
              <strong>Table {c.table}</strong>
              <span className="badge">{STATUTS[c.statut as Statut]}</span>
            </div>
            <ul>{c.lignes.map((l, i) => <li key={i}>{l}</li>)}</ul>
            <div className="ligne">
              <span>{c.total.toFixed(2)} DH</span>
              {c.statut === "EN_ATTENTE" && (
                <BoutonStatut commandeId={c.id} vers="ANNULEE" libelle="Annuler" secondaire />
              )}
              {c.statut === "PRETE" && <BoutonStatut commandeId={c.id} vers="SERVIE" libelle="Servie" />}
              {c.statut === "SERVIE" && <BoutonStatut commandeId={c.id} vers="PAYEE" libelle="Encaisser" />}
            </div>
          </div>
        ))}
        {mesCommandes.length === 0 && <p className="muted">Aucune commande en cours.</p>}
      </div>
    </div>
  );
}
