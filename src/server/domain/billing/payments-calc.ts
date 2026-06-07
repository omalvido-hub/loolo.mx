// NELZZON — Motor de saldo de pagos (Fase 6B). PURO, determinista, testeable.
// Ledger: PAYMENT suma, REVERSAL resta. Centavos enteros (MXN). Sin float.

export interface PaymentEntry {
  entryKind: "PAYMENT" | "REVERSAL";
  amountCents: number;
}
export interface BalanceResult {
  paidCents: number;
  balanceCents: number;
  liquidado: boolean;
}

/** paid = Σ PAYMENT − Σ REVERSAL ; balance = total − paid ; liquidado = balance 0. */
export function computeBalance(quoteTotalCents: number, entries: PaymentEntry[]): BalanceResult {
  let paidCents = 0;
  for (const e of entries) {
    if (e.entryKind === "PAYMENT") paidCents += e.amountCents;
    else if (e.entryKind === "REVERSAL") paidCents -= e.amountCents;
  }
  const balanceCents = quoteTotalCents - paidCents;
  return { paidCents, balanceCents, liquidado: balanceCents === 0 };
}
