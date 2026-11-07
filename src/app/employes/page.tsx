import { db } from "@/lib/db";
import { LONGUEUR_MIN } from "@/lib/motdepasse";
import { exigerRole } from "@/lib/session";
import { ajouterEmploye, changerActif, changerMotDePasse } from "./actions";

export const dynamic = "force-dynamic";

const ROLES = { SERVEUR: "Serveur", BARMAN: "Barman", GERANT: "Gérant" } as const;

export default async function PageEmployes({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const moi = await exigerRole("GERANT");
  const { ok, erreur } = await searchParams;
  const employes = await db.employe.findMany({ orderBy: [{ actif: "desc" }, { role: "asc" }, { nom: "asc" }] });

  return (
    <>
      <h1>Employés</h1>
      {ok && <p className="succes">{ok}</p>}
      {erreur && <p className="alerte">{erreur}</p>}

      <table>
        <thead>
          <tr><th>Nom</th><th>Rôle</th><th>Mot de passe</th><th>Nouveau mot de passe</th><th></th></tr>
        </thead>
        <tbody>
          {employes.map((e) => (
            <tr key={e.id} className={e.actif ? undefined : "muted"}>
              <td>{e.nom}{e.id === moi.id && " (vous)"}</td>
              <td>{ROLES[e.role]}</td>
              <td>{e.motDePasse ? "Défini" : <span className="alerte">À définir</span>}</td>
              <td>
                <form action={changerMotDePasse} className="ligne" style={{ justifyContent: "flex-start" }}>
                  <input type="hidden" name="employeId" value={e.id} />
                  <input
                    name="motDePasse"
                    type="password"
                    autoComplete="new-password"
                    minLength={LONGUEUR_MIN}
                    placeholder={`${LONGUEUR_MIN} caractères min.`}
                    style={{ width: "10rem" }}
                    required
                  />
                  <button>{e.motDePasse ? "Réinitialiser" : "Définir"}</button>
                </form>
              </td>
              <td>
                {e.id !== moi.id && (
                  <form action={changerActif}>
                    <input type="hidden" name="employeId" value={e.id} />
                    <input type="hidden" name="actif" value={e.actif ? "0" : "1"} />
                    <button className="secondaire">{e.actif ? "Désactiver" : "Réactiver"}</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">
        Changer le mot de passe d'un employé ou le désactiver le déconnecte immédiatement de ses appareils.
      </p>

      <h2>Ajouter un employé</h2>
      <form action={ajouterEmploye} className="ligne carte" style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
        <input name="nom" placeholder="Nom" required />
        <select name="role" defaultValue="SERVEUR">
          {Object.entries(ROLES).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <input
          name="motDePasse"
          type="password"
          autoComplete="new-password"
          minLength={LONGUEUR_MIN}
          placeholder="Mot de passe"
          required
        />
        <button>Ajouter</button>
      </form>
    </>
  );
}
