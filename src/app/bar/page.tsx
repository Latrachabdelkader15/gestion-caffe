import { db } from "@/lib/db";
import { AutoRefresh } from "@/components/AutoRefresh";
import { BoutonStatut } from "@/components/BoutonStatut";
import { STATUTS, type Statut } from "@/lib/statuts";

export const dynamic = "force-dynamic";

export default async function PageBar({
  searchParams,
}: {
  searchParams: Promise<{ barman?: string }>;
}) {
  const [commandes, barmans] = await Promise.all([
    db.commande.findMany({
      where: { statut: { in: ["EN_ATTENTE", "EN_PREPARATION", "PRETE"] } },
      include: { lignes: { include: { produit: true } }, serveur: true, barman: true },
      orderBy: { creeLe: "asc" },
    }),
    db.employe.findMany({ where: { role: "BARMAN", actif: true }, orderBy: { nom: "asc" } }),
  ]);
  // Barman choisi dans l'URL (/bar?barman=3), sinon le premier de la liste
  const choisi = Number((await searchParams).barman);
  const barman = barmans.find((b) => b.id === choisi) ?? barmans[0];

  return (
    <>
      <AutoRefresh secondes={3} />
      <h1>Bar : commandes à préparer</h1>
      <form className="ligne" style={{ justifyContent: "flex-start", marginBottom: "1rem" }}>
        <label>
          Barman{" "}
          <select name="barman" defaultValue={barman?.id}>
            {barmans.map((b) => (
              <option key={b.id} value={b.id}>{b.nom}</option>
            ))}
          </select>
        </label>
        <button className="secondaire">Changer</button>
      </form>
      {!barman && <p className="alerte">Aucun barman actif : en ajouter un dans les employés.</p>}
      <div className="grille">
        {commandes.map((c) => (
          <div key={c.id} className="carte">
            <div className="ligne">
              <strong>Table {c.table}</strong>
              <span className="badge">{STATUTS[c.statut as Statut]}</span>
            </div>
            <div className="muted">
              {c.serveur.nom}
              {c.barman && ` → ${c.barman.nom}`} · {c.creeLe.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <ul>
              {c.lignes.map((l) => (
                <li key={l.id}>
                  <strong>{l.quantite} ×</strong> {l.produit.nom}
                  {l.note && <em> ({l.note})</em>}
                </li>
              ))}
            </ul>
            {c.statut === "EN_ATTENTE" && barman && (
              <BoutonStatut commandeId={c.id} vers="EN_PREPARATION" libelle="Commencer" barmanId={barman.id} />
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
