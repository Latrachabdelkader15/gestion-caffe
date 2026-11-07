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
  const total = produits.reduce((s, p) => s + (panier[p.id] ?? 0) * p.prix, 0);
  const ajouter = (id: number, n: number) =>
    setPanier((p) => ({ ...p, [id]: Math.max(0, (p[id] ?? 0) + n) }));

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
    <>
      <div className="ligne" style={{ justifyContent: "flex-start", marginBottom: "1rem" }}>
        <label>
          Serveur{" "}
          <select value={serveurId} onChange={(e) => setServeurId(Number(e.target.value))}>
            {serveurs.map((s) => (
              <option key={s.id} value={s.id}>{s.nom}</option>
            ))}
          </select>
        </label>
        <label>
          Table <input value={table} onChange={(e) => setTable(e.target.value)} size={4} />
        </label>
      </div>

      {categories.map((cat) => (
        <section key={cat}>
          <h3>{cat}</h3>
          <div className="grille">
            {produits.filter((p) => p.categorie === cat).map((p) => (
              <div key={p.id} className="carte ligne">
                <div>
                  <strong>{p.nom}</strong>
                  <div className="muted">{p.prix.toFixed(2)} DH</div>
                  {p.disponible === 0 && <span className="alerte">Épuisé</span>}
                  {p.disponible !== null && p.disponible > 0 && p.disponible <= 5 && (
                    <span className="alerte">Plus que {p.disponible}</span>
                  )}
                </div>
                <div className="ligne">
                  <button className="secondaire" onClick={() => ajouter(p.id, -1)}>−</button>
                  <span>{panier[p.id] ?? 0}</span>
                  <button
                    disabled={p.disponible !== null && (panier[p.id] ?? 0) >= p.disponible}
                    onClick={() => ajouter(p.id, 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <div className="carte ligne" style={{ marginTop: "1rem" }}>
        <strong>Total : {total.toFixed(2)} DH</strong>
        <button disabled={enCours || total === 0} onClick={envoyer}>Envoyer au bar</button>
      </div>
      {erreur && <p className="alerte">{erreur}</p>}

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
    </>
  );
}
