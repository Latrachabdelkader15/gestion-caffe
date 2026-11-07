"use client";

import { useActionState, useEffect, useState } from "react";
import { seConnecter } from "./actions";

const TOUCHES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "effacer", "0", "ok"];

export function FormulaireConnexion({ employes }: { employes: { id: number; nom: string; role: string }[] }) {
  const [employeId, setEmployeId] = useState<number | null>(null);
  const [motDePasse, setMotDePasse] = useState("");
  const [etat, action, enCours] = useActionState(seConnecter, {});
  const choisi = employes.find((e) => e.id === employeId);
  // Mot de passe refusé : on vide le champ
  useEffect(() => setMotDePasse(""), [etat]);

  if (!choisi) {
    return (
      <div className="tactile">
        <p className="muted">Touchez votre nom</p>
        <div className="tuiles">
          {employes.map((e) => (
            <button key={e.id} className="tuile" onClick={() => setEmployeId(e.id)}>
              <span className="tuile-nom">{e.nom}</span>
              <span className="tuile-prix">{e.role}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="connexion carte tactile">
      <input type="hidden" name="employeId" value={choisi.id} />
      <div className="ligne">
        <strong style={{ fontSize: "1.3rem" }}>{choisi.nom}</strong>
        <button
          type="button"
          className="secondaire"
          onClick={() => {
            setEmployeId(null);
            setMotDePasse("");
          }}
        >
          Changer
        </button>
      </div>
      <input
        name="motDePasse"
        type="password"
        autoComplete="current-password"
        placeholder="Mot de passe"
        className="champ-mdp"
        value={motDePasse}
        onChange={(e) => setMotDePasse(e.target.value)}
        autoFocus
        required
      />
      {/* Clavier à l'écran pour les codes chiffrés sur tablette */}
      <div className="clavier">
        {TOUCHES.map((t) =>
          t === "ok" ? (
            <button key={t} type="submit" disabled={enCours || !motDePasse}>
              Entrer
            </button>
          ) : t === "effacer" ? (
            <button key={t} type="button" className="secondaire" onClick={() => setMotDePasse((m) => m.slice(0, -1))}>
              ⌫
            </button>
          ) : (
            <button key={t} type="button" className="puce" onClick={() => setMotDePasse((m) => m + t)}>
              {t}
            </button>
          ),
        )}
      </div>
      {etat.erreur && <p className="alerte">{etat.erreur}</p>}
    </form>
  );
}
