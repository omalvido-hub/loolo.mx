// LOOLO — Motor de cálculo de presupuestos (Fase 6A). PURO, determinista, testeable.
// Dinero en CENTAVOS enteros (MXN). Redondeo half-up POR LÍNEA. Encabezado = suma de líneas.
// El servidor SIEMPRE recalcula; nunca confía en montos del cliente.

export interface LineInput {
  quantity: number;        // entero ≥ 1
  unitPriceCents: number;  // entero ≥ 0
  discountCents: number;   // entero ≥ 0, ≤ subtotal
  taxRateBps: number;      // entero ≥ 0 (1600 = 16%)
}
export interface LineAmounts {
  subtotalCents: number;   // unitPrice * quantity
  discountCents: number;   // = entrada (validado)
  taxCents: number;        // round_half_up((subtotal - discount) * bps / 10000)
  totalCents: number;      // (subtotal - discount) + tax
}

/** Redondeo half-up sobre enteros: round(n/d) con .5 hacia arriba. n,d enteros, d>0. */
export function divRoundHalfUp(n: number, d: number): number {
  if (d <= 0) throw new Error("divisor inválido");
  return Math.floor((n + Math.floor(d / 2)) / d);
}

export function computeLine(input: LineInput): LineAmounts {
  if (!Number.isInteger(input.quantity) || input.quantity < 1) throw new Error("quantity entero ≥ 1");
  if (!Number.isInteger(input.unitPriceCents) || input.unitPriceCents < 0) throw new Error("unitPriceCents entero ≥ 0");
  if (!Number.isInteger(input.discountCents) || input.discountCents < 0) throw new Error("discountCents entero ≥ 0");
  if (!Number.isInteger(input.taxRateBps) || input.taxRateBps < 0) throw new Error("taxRateBps entero ≥ 0");
  const subtotalCents = input.unitPriceCents * input.quantity;
  if (input.discountCents > subtotalCents) throw new Error("discountCents no puede exceder el subtotal de línea");
  const base = subtotalCents - input.discountCents;
  const taxCents = divRoundHalfUp(base * input.taxRateBps, 10000);
  const totalCents = base + taxCents;
  return { subtotalCents, discountCents: input.discountCents, taxCents, totalCents };
}

export interface QuoteTotals {
  subtotalCents: number;
  discountTotalCents: number;
  taxTotalCents: number;
  totalCents: number;
}

/** Encabezado = suma exacta de líneas ya redondeadas (sin re-redondeo). */
export function computeTotals(lines: LineAmounts[]): QuoteTotals {
  return lines.reduce<QuoteTotals>((acc, l) => ({
    subtotalCents: acc.subtotalCents + l.subtotalCents,
    discountTotalCents: acc.discountTotalCents + l.discountCents,
    taxTotalCents: acc.taxTotalCents + l.taxCents,
    totalCents: acc.totalCents + l.totalCents,
  }), { subtotalCents: 0, discountTotalCents: 0, taxTotalCents: 0, totalCents: 0 });
}
