"use client";

import { useTransition } from "react";
import { changerStatut } from "@/app/actions";
import type { Statut } from "@/lib/statuts";

export function BoutonStatut({
  commandeId,
  vers,
  libelle,
  secondaire,
}: {
  commandeId: number;
  vers: Statut;
  libelle: string;
  secondaire?: boolean;
}) {
  const [enCours, start] = useTransition();
  return (
    <button
      className={secondaire ? "secondaire" : undefined}
      disabled={enCours}
      onClick={() => start(() => changerStatut(commandeId, vers))}
    >
      {libelle}
    </button>
  );
}
