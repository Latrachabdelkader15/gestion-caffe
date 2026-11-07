import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { accueilDuRole, employeConnecte } from "@/lib/session";
import { FormulaireConnexion } from "./FormulaireConnexion";

export const dynamic = "force-dynamic";

const ROLES = { SERVEUR: "Serveur", BARMAN: "Barman", GERANT: "Gérant" } as const;

export default async function PageConnexion() {
  const moi = await employeConnecte();
  if (moi) redirect(accueilDuRole(moi.role));

  // Seuls les employés actifs qui ont un mot de passe apparaissent
  const employes = await db.employe.findMany({
    where: { actif: true, motDePasse: { not: null } },
    orderBy: [{ role: "asc" }, { nom: "asc" }],
  });

  return (
    <>
      <h1>Connexion</h1>
      {employes.length === 0 ? (
        <p className="alerte">
          Aucun mot de passe défini. Sur l'ordinateur du café, lancer :{" "}
          <code>npm run mot-de-passe -- "Nom du gérant" motdepasse</code>
        </p>
      ) : (
        <FormulaireConnexion
          employes={employes.map((e) => ({ id: e.id, nom: e.nom, role: ROLES[e.role] }))}
        />
      )}
    </>
  );
}
