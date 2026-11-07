import { db } from "@/lib/db";
import { AutoRefresh } from "@/components/AutoRefresh";
import { BoutonStatut } from "@/components/BoutonStatut";
import { STATUTS, type Statut } from "@/lib/statuts";

export const dynamic = "force-dynamic";

export default async function PageBar() {
  const commandes = await db.commande.findMany({
    where: { statut: { in: ["EN_ATTENTE", "EN_PREPARATION", "PRETE"] } },
    include: { lignes: { include: { produit: true } }, serveur: true },
    orderBy: { creeLe: "asc" },
  });

  return (
    <>
      <AutoRefresh secondes={3} />
      <h1>Bar : commandes à préparer</h1>
      <div className="grille">
        {commandes.map((c) => (
          <div key={c.id} className="carte">
            <div className="ligne">
              <strong>Table {c.table}</strong>
              <span className="badge">{STATUTS[c.statut as Statut]}</span>
            </div>
            <div className="muted">
              {c.serveur.nom} · {c.creeLe.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <ul>
              {c.lignes.map((l) => (
                <li key={l.id}>
                  <strong>{l.quantite} ×</strong> {l.produit.nom}
                  {l.note && <em> ({l.note})</em>}
                </li>
              ))}
            </ul>
            {c.statut === "EN_ATTENTE" && (
              <BoutonStatut commandeId={c.id} vers="EN_PREPARATION" libelle="Commencer" />
            )}
            {c.statut === "EN_PREPARATION" && (
              <BoutonStatut commandeId={c.id} vers="PRETE" libelle="Prête" />
            )}
            {c.statut === "PRETE" && <p className="muted">En attente du serveur</p>}
          </div>
        ))}
        {commandes.length === 0 && <p className="muted">Aucune commande en attente.</p>}
      </div>
    </>
  );
}
