import { db } from "@/lib/db";
import { ajusterStock } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function PageStock() {
  const [ingredients, mouvements] = await Promise.all([
    db.ingredient.findMany({ orderBy: { nom: "asc" } }),
    db.mouvementStock.findMany({
      include: { ingredient: true },
      orderBy: { creeLe: "desc" },
      take: 20,
    }),
  ]);

  return (
    <>
      <h1>Stock</h1>
      <table>
        <thead>
          <tr><th>Ingrédient</th><th>Quantité</th><th>Seuil</th><th>Entrée / ajustement</th></tr>
        </thead>
        <tbody>
          {ingredients.map((i) => (
            <tr key={i.id}>
              <td>{i.nom}</td>
              <td className={i.quantite <= i.seuil ? "alerte" : undefined}>
                {+i.quantite.toFixed(2)} {i.unite}
              </td>
              <td className="muted">{i.seuil} {i.unite}</td>
              <td>
                <form action={ajusterStock} className="ligne" style={{ justifyContent: "flex-start" }}>
                  <input type="hidden" name="ingredientId" value={i.id} />
                  <input name="delta" type="number" step="any" placeholder="+/−" style={{ width: "6rem" }} required />
                  <select name="raison" defaultValue="ENTREE">
                    <option value="ENTREE">Entrée</option>
                    <option value="AJUSTEMENT">Ajustement</option>
                  </select>
                  <button>OK</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Derniers mouvements</h2>
      <table>
        <thead>
          <tr><th>Date</th><th>Ingrédient</th><th>Variation</th><th>Raison</th></tr>
        </thead>
        <tbody>
          {mouvements.map((m) => (
            <tr key={m.id}>
              <td className="muted">{m.creeLe.toLocaleString("fr-FR")}</td>
              <td>{m.ingredient.nom}</td>
              <td>{m.delta > 0 ? "+" : ""}{+m.delta.toFixed(2)} {m.ingredient.unite}</td>
              <td>{m.raison}{m.commandeId ? ` (cmd #${m.commandeId})` : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
