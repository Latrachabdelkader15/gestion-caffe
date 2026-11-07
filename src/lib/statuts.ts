export const STATUTS = {
  EN_ATTENTE: "En attente",
  EN_PREPARATION: "En préparation",
  PRETE: "Prête",
  SERVIE: "Servie",
  PAYEE: "Payée",
  ANNULEE: "Annulée",
} as const;

export type Statut = keyof typeof STATUTS;

// Transitions autorisées : qui fait passer la commande d'un état à l'autre
export const TRANSITIONS: Record<Statut, Statut[]> = {
  EN_ATTENTE: ["EN_PREPARATION", "ANNULEE"],
  EN_PREPARATION: ["PRETE"],
  PRETE: ["SERVIE"],
  SERVIE: ["PAYEE"],
  PAYEE: [],
  ANNULEE: [],
};
