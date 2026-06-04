"use client";

// LOOLO — Sección interactiva de Presupuestos y Cobros (UI-6 / UI-6A).
// Gestiona: crear presupuesto desde plan activo, editar precios y descuentos en DRAFT,
// transiciones de estado, cancelar borradores, registro de pagos, reverso de cobros.
// Todo fluye por Server Actions → revalidatePath → re-render del servidor.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PatientQuotesView, QuoteView } from "@/server/domain/billing/billing-views";
import type { TreatmentItemView } from "@/server/domain/clinical/treatment-views";
import { QuoteStatusBadge } from "./QuoteStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createQuoteFromPlanAction,
  updateLinePriceAction,
  updateLineDiscountAction,
  setQuoteStatusAction,
  recordPaymentAction,
  reversePaymentAction,
} from "@/server/actions/billing";

// ─── Utilidades ────────────────────────────────────────────────────────────

const FMT_CURRENCY = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const FMT_DATE = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  dateStyle: "medium",
});

const fCents = (c: number) => FMT_CURRENCY.format(c / 100);
const fDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  try { return FMT_DATE.format(new Date(iso)); } catch { return "—"; }
};

const PROCEDURE_LABELS: Record<string, string> = {
  EXAM: "Exploración",
  PROPHYLAXIS: "Profilaxis",
  RESTORATION: "Restauración",
  ENDODONTICS: "Endodoncia",
  EXTRACTION: "Extracción",
  CROWN: "Corona",
  BRIDGE: "Puente",
  IMPLANT: "Implante",
  PERIODONTAL: "Periodontal",
  ORTHODONTICS: "Ortodoncia",
  SURGERY: "Cirugía",
  OTHER: "Otro",
};

const METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
  CHECK: "Cheque",
  OTHER: "Otro",
};

// ─── Props ─────────────────────────────────────────────────────────────────

interface QuotesSectionClientProps {
  view: PatientQuotesView;
  patientId: string;
  activePlan: { id: string; title: string | null; items: TreatmentItemView[] } | null;
  canCreate: boolean;
  canEdit: boolean;
  canPropose: boolean;
  canAccept: boolean;
  canCancel: boolean;
  canRecordPayment: boolean;
  canViewPayments: boolean;
  canReverse: boolean;
}

// ─── Subcomponente: Formulario para crear presupuesto ──────────────────────

interface CreateQuoteFormProps {
  patientId: string;
  activePlan: { id: string; title: string | null; items: TreatmentItemView[] };
  onCancel: () => void;
  onDone: () => void;
}

function CreateQuoteForm({ patientId, activePlan, onCancel, onDone }: CreateQuoteFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const item of activePlan.items) init[item.id] = "";
    return init;
  });

  const planTitle = activePlan.title ?? "Plan de tratamiento";

  function handleSubmit() {
    setError(null);
    const lines = activePlan.items.map((item, i) => {
      const raw = prices[item.id] ?? "";
      const pesos = parseFloat(raw.replace(",", "."));
      const unitPriceCents = isNaN(pesos) ? 0 : Math.round(pesos * 100);
      const label = PROCEDURE_LABELS[item.procedureType] ?? item.procedureType;
      const desc = item.toothFdi ? `${label} (pieza ${item.toothFdi})` : label;
      return {
        description: desc,
        treatmentPlanItemId: item.id,
        unitPriceCents,
        sortOrder: i,
      };
    });

    startTransition(async () => {
      const result = await createQuoteFromPlanAction(patientId, activePlan.id, lines);
      if (!result.ok) {
        setError(result.error);
      } else {
        onDone();
      }
    });
  }

  return (
    <div className="rounded-xl border bg-card ring-1 ring-foreground/10 overflow-hidden">
      <div className="px-4 py-3 border-b bg-blue-50/60 dark:bg-blue-950/20">
        <h3 className="font-medium text-sm">Nuevo presupuesto desde {planTitle}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Asigna precio a cada procedimiento (en MXN). Puedes editar después.
        </p>
      </div>
      <div className="px-4 py-4 space-y-3">
        {activePlan.items.map((item) => {
          const label = PROCEDURE_LABELS[item.procedureType] ?? item.procedureType;
          const toothLabel = item.toothFdi ? ` — Pieza ${item.toothFdi}` : "";
          return (
            <div key={item.id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{label}{toothLabel}</p>
              </div>
              <div className="w-36 shrink-0">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={prices[item.id] ?? ""}
                  onChange={(e) =>
                    setPrices((prev) => ({ ...prev, [item.id]: e.target.value }))
                  }
                  className="text-right text-sm h-8"
                  disabled={isPending}
                  aria-label={`Precio de ${label}`}
                />
              </div>
              <span className="text-xs text-muted-foreground w-8 shrink-0">MXN</span>
            </div>
          );
        })}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Creando…" : "Crear presupuesto"}
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponente: Editar precio de línea ─────────────────────────────────

interface EditLinePriceProps {
  patientId: string;
  lineId: string;
  currentCents: number;
  onDone: () => void;
  onCancel: () => void;
}

function EditLinePrice({ patientId, lineId, currentCents, onDone, onCancel }: EditLinePriceProps) {
  const [value, setValue] = useState(String(currentCents / 100));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    const pesos = parseFloat(value.replace(",", "."));
    if (isNaN(pesos) || pesos < 0) {
      setError("Precio inválido.");
      return;
    }
    const cents = Math.round(pesos * 100);
    startTransition(async () => {
      const result = await updateLinePriceAction(patientId, lineId, cents);
      if (!result.ok) setError(result.error);
      else onDone();
    });
  }

  return (
    <span className="inline-flex items-center gap-1">
      <Input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-24 h-6 text-right text-xs"
        disabled={isPending}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") onCancel();
        }}
      />
      <Button size="icon-xs" onClick={handleSave} disabled={isPending}>✓</Button>
      <Button size="icon-xs" variant="outline" onClick={onCancel} disabled={isPending}>✕</Button>
      {error && <span className="text-xs text-destructive ml-1">{error}</span>}
    </span>
  );
}

// ─── Subcomponente: Editar descuento de línea ──────────────────────────────

interface EditLineDiscountProps {
  patientId: string;
  lineId: string;
  currentCents: number;
  subtotalCents: number;
  onDone: () => void;
  onCancel: () => void;
}

function EditLineDiscount({ patientId, lineId, currentCents, subtotalCents, onDone, onCancel }: EditLineDiscountProps) {
  const [value, setValue] = useState(String(currentCents / 100));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    const pesos = parseFloat(value.replace(",", "."));
    if (isNaN(pesos) || pesos < 0) {
      setError("Descuento inválido.");
      return;
    }
    const cents = Math.round(pesos * 100);
    if (cents > subtotalCents) {
      setError(`No puede superar ${fCents(subtotalCents)}.`);
      return;
    }
    startTransition(async () => {
      const result = await updateLineDiscountAction(patientId, lineId, cents);
      if (!result.ok) setError(result.error);
      else onDone();
    });
  }

  return (
    <span className="inline-flex items-center gap-1">
      <Input
        type="number"
        min="0"
        step="0.01"
        max={String(subtotalCents / 100)}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-24 h-6 text-right text-xs"
        disabled={isPending}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") onCancel();
        }}
      />
      <Button size="icon-xs" onClick={handleSave} disabled={isPending}>✓</Button>
      <Button size="icon-xs" variant="outline" onClick={onCancel} disabled={isPending}>✕</Button>
      {error && <span className="text-xs text-destructive ml-1">{error}</span>}
    </span>
  );
}

// ─── Subcomponente: Formulario de pago ─────────────────────────────────────

interface RecordPaymentFormProps {
  patientId: string;
  quoteId: string;
  balanceCents: number;
  onDone: () => void;
  onCancel: () => void;
}

function RecordPaymentForm({ patientId, quoteId, balanceCents, onDone, onCancel }: RecordPaymentFormProps) {
  const [amount, setAmount] = useState(String(balanceCents / 100));
  const [method, setMethod] = useState("CASH");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    const pesos = parseFloat(amount.replace(",", "."));
    if (isNaN(pesos) || pesos <= 0) {
      setError("Ingresa un monto válido.");
      return;
    }
    const cents = Math.round(pesos * 100);
    if (cents > balanceCents) {
      setError(`El monto supera el saldo (${fCents(balanceCents)}).`);
      return;
    }
    startTransition(async () => {
      const result = await recordPaymentAction(patientId, quoteId, cents, method);
      if (!result.ok) setError(result.error);
      else onDone();
    });
  }

  return (
    <div className="mt-3 p-3 rounded-lg border bg-muted/20 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Registrar cobro — Saldo: {fCents(balanceCents)}
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min="0.01"
            step="0.01"
            max={String(balanceCents / 100)}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-28 h-7 text-right text-sm"
            placeholder="0.00"
            disabled={isPending}
            aria-label="Monto a cobrar en pesos MXN"
          />
          <span className="text-xs text-muted-foreground">MXN</span>
        </div>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="h-7 rounded-md border border-input bg-background px-2 text-sm"
          disabled={isPending}
          aria-label="Método de pago"
        >
          {Object.entries(METHOD_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <Button size="sm" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Guardando…" : "Registrar"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─── Subcomponente: Formulario de reverso de pago ──────────────────────────

interface ReversePaymentFormProps {
  patientId: string;
  paymentId: string;
  amountCents: number;
  onDone: () => void;
  onCancel: () => void;
}

function ReversePaymentForm({ patientId, paymentId, amountCents, onDone, onCancel }: ReversePaymentFormProps) {
  const [motivo, setMotivo] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const reference = motivo.trim() || undefined;
      const result = await reversePaymentAction(patientId, paymentId, reference);
      if (!result.ok) setError(result.error);
      else onDone();
    });
  }

  return (
    <div className="mt-2 p-2 rounded-lg border border-destructive/40 bg-destructive/5 space-y-2">
      <p className="text-xs font-medium text-destructive">
        Se revertirá {fCents(amountCents)}. Esta acción no se puede deshacer.
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          type="text"
          maxLength={60}
          placeholder="Motivo (opcional, máx. 60 caracteres)"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className="flex-1 min-w-0 h-7 text-sm"
          disabled={isPending}
        />
        <Button size="sm" variant="destructive" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Revirtiendo…" : "Confirmar reverso"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─── Subcomponente: Tarjeta de presupuesto ─────────────────────────────────

interface QuoteCardProps {
  quote: QuoteView;
  patientId: string;
  canEdit: boolean;
  canPropose: boolean;
  canAccept: boolean;
  canCancel: boolean;
  canRecordPayment: boolean;
  canViewPayments: boolean;
  canReverse: boolean;
}

function QuoteCard({
  quote,
  patientId,
  canEdit,
  canPropose,
  canAccept,
  canCancel,
  canRecordPayment,
  canViewPayments,
  canReverse,
}: QuoteCardProps) {
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [reversingPaymentId, setReversingPaymentId] = useState<string | null>(null);
  const [statusPending, startStatusTransition] = useTransition();
  const [statusError, setStatusError] = useState<string | null>(null);
  const router = useRouter();

  function handleStatusChange(to: string) {
    setStatusError(null);
    setConfirmingCancel(false);
    startStatusTransition(async () => {
      const result = await setQuoteStatusAction(patientId, quote.id, to);
      if (!result.ok) setStatusError(result.error);
      else router.refresh();
    });
  }

  const isDraft = quote.status === "DRAFT";
  const isProposed = quote.status === "PROPOSED";
  const isAccepted = quote.status === "ACCEPTED";
  const isTerminal = ["REJECTED", "CANCELED", "EXPIRED"].includes(quote.status);

  // IDs de pagos que ya tienen un reverso
  const reversedPaymentIds = new Set(
    quote.payments
      .filter((p) => p.entryKind === "REVERSAL" && p.reversesPaymentId)
      .map((p) => p.reversesPaymentId!),
  );

  const dateLabel = quote.acceptedAt
    ? `Aceptado el ${fDate(quote.acceptedAt)}`
    : quote.proposedAt
    ? `Propuesto el ${fDate(quote.proposedAt)}`
    : `Creado el ${fDate(quote.createdAt)}`;

  return (
    <div
      className={`rounded-xl border overflow-hidden ${
        isAccepted
          ? "ring-2 ring-green-400/50 bg-card"
          : isTerminal
          ? "bg-muted/30 ring-1 ring-foreground/5"
          : "bg-card ring-1 ring-foreground/10"
      }`}
    >
      {/* Cabecera */}
      <div
        className={`px-4 py-3 border-b flex items-start justify-between gap-3 ${
          isAccepted ? "bg-green-50/60 dark:bg-green-950/20" : "bg-muted/30"
        }`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <QuoteStatusBadge status={quote.status} />
            {quote.quoteNumber && (
              <span className="text-xs text-muted-foreground font-mono">#{quote.quoteNumber}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{dateLabel}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold">{fCents(quote.totalCents)}</p>
          {isAccepted && quote.balanceCents > 0 && (
            <p className="text-xs text-destructive font-medium">
              Saldo: {fCents(quote.balanceCents)}
            </p>
          )}
          {isAccepted && quote.liquidado && (
            <p className="text-xs text-green-700 font-medium">Liquidado</p>
          )}
        </div>
      </div>

      {/* Líneas */}
      <div className="px-4 py-3">
        {quote.lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin líneas.</p>
        ) : (
          <div className="space-y-1">
            {/* Cabecera de columnas */}
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide pb-1">
              <span className="flex-1">Descripción</span>
              <span className="w-28 shrink-0 text-right">Precio</span>
              <span className="w-24 shrink-0 text-right">Total</span>
            </div>
            {quote.lines.map((line) => (
              <div key={line.id} className="py-1 text-sm rounded hover:bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="truncate block">{line.description}</span>
                  </div>
                  {/* Precio editable en DRAFT */}
                  <div className="w-28 shrink-0 text-right">
                    {isDraft && canEdit && editingLineId === line.id ? (
                      <EditLinePrice
                        patientId={patientId}
                        lineId={line.id}
                        currentCents={line.unitPriceCents}
                        onDone={() => { setEditingLineId(null); router.refresh(); }}
                        onCancel={() => setEditingLineId(null)}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (isDraft && canEdit) {
                            setEditingDiscountId(null);
                            setEditingLineId(line.id);
                          }
                        }}
                        className={`font-medium ${isDraft && canEdit ? "hover:text-primary cursor-pointer underline-offset-2 hover:underline" : "cursor-default"}`}
                        disabled={!isDraft || !canEdit}
                        title={isDraft && canEdit ? "Haz clic para editar el precio" : undefined}
                      >
                        {fCents(line.unitPriceCents)}
                      </button>
                    )}
                  </div>
                  <div className="w-24 shrink-0 text-right font-medium">
                    {fCents(line.totalCents)}
                  </div>
                </div>
                {/* Descuento editable en DRAFT */}
                {isDraft && canEdit && (
                  <div className="pl-0 mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
                    <span>Desc:</span>
                    {editingDiscountId === line.id ? (
                      <EditLineDiscount
                        patientId={patientId}
                        lineId={line.id}
                        currentCents={line.discountCents}
                        subtotalCents={line.subtotalCents}
                        onDone={() => { setEditingDiscountId(null); router.refresh(); }}
                        onCancel={() => setEditingDiscountId(null)}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLineId(null);
                          setEditingDiscountId(line.id);
                        }}
                        className="hover:text-primary cursor-pointer underline-offset-2 hover:underline"
                        title="Haz clic para editar el descuento"
                      >
                        {fCents(line.discountCents)}
                      </button>
                    )}
                  </div>
                )}
                {/* Descuento informativo fuera de DRAFT */}
                {!isDraft && line.discountCents > 0 && (
                  <div className="pl-0 mt-0.5 text-xs text-muted-foreground">
                    Descuento: {fCents(line.discountCents)}
                  </div>
                )}
              </div>
            ))}
            {/* Totales */}
            <div className="border-t mt-2 pt-2 flex flex-col items-end gap-0.5 text-sm">
              {(quote.taxTotalCents > 0 || quote.discountTotalCents > 0) && (
                <>
                  <div className="flex gap-8 text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{fCents(quote.subtotalCents)}</span>
                  </div>
                  {quote.discountTotalCents > 0 && (
                    <div className="flex gap-8 text-muted-foreground">
                      <span>Descuento</span>
                      <span>−{fCents(quote.discountTotalCents)}</span>
                    </div>
                  )}
                  {quote.taxTotalCents > 0 && (
                    <div className="flex gap-8 text-muted-foreground">
                      <span>IVA</span>
                      <span>{fCents(quote.taxTotalCents)}</span>
                    </div>
                  )}
                </>
              )}
              <div className="flex gap-8 font-semibold">
                <span>Total</span>
                <span>{fCents(quote.totalCents)}</span>
              </div>
              {isAccepted && (
                <>
                  <div className="flex gap-8 text-green-700">
                    <span>Pagado</span>
                    <span>{fCents(quote.paidCents)}</span>
                  </div>
                  <div className={`flex gap-8 font-medium ${quote.balanceCents > 0 ? "text-destructive" : "text-green-700"}`}>
                    <span>Saldo</span>
                    <span>{fCents(quote.balanceCents)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Acciones de estado */}
      {(isDraft || isProposed) && (
        <div className="px-4 py-3 border-t bg-muted/10 flex items-center gap-2 flex-wrap">
          {isDraft && canPropose && !confirmingCancel && (
            <Button
              size="sm"
              onClick={() => handleStatusChange("PROPOSED")}
              disabled={statusPending}
            >
              {statusPending ? "Procesando…" : "Proponer"}
            </Button>
          )}
          {isProposed && canAccept && !confirmingCancel && (
            <>
              <Button
                size="sm"
                onClick={() => handleStatusChange("ACCEPTED")}
                disabled={statusPending}
              >
                {statusPending ? "Procesando…" : "Aceptar"}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleStatusChange("REJECTED")}
                disabled={statusPending}
              >
                Rechazar
              </Button>
            </>
          )}
          {/* Cancelar borrador (DRAFT o PROPOSED) */}
          {canCancel && !confirmingCancel && (
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmingCancel(true)}
              disabled={statusPending}
            >
              Cancelar borrador
            </Button>
          )}
          {confirmingCancel && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-destructive font-medium">
                ¿Cancelar este presupuesto?
              </span>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleStatusChange("CANCELED")}
                disabled={statusPending}
              >
                {statusPending ? "Cancelando…" : "Sí, cancelar"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmingCancel(false)}
                disabled={statusPending}
              >
                Atrás
              </Button>
            </div>
          )}
          {statusError && (
            <p className="text-xs text-destructive w-full">{statusError}</p>
          )}
        </div>
      )}

      {/* Cobros: historial + form */}
      {(isAccepted || (canViewPayments && quote.payments.length > 0)) && (
        <div className="px-4 py-3 border-t">
          {canViewPayments && quote.payments.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Historial de cobros
              </p>
              <div className="space-y-1">
                {quote.payments.map((p) => (
                  <div key={p.id}>
                    <div className="flex items-center gap-2 text-sm">
                      <span
                        className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                          p.entryKind === "REVERSAL" ? "bg-red-400" : "bg-green-400"
                        }`}
                      />
                      <span className={p.entryKind === "REVERSAL" ? "line-through text-muted-foreground" : ""}>
                        {fCents(p.amountCents)}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {METHOD_LABELS[p.method] ?? p.method}
                      </span>
                      {p.paidAt && (
                        <span className="text-muted-foreground text-xs">{fDate(p.paidAt)}</span>
                      )}
                      {p.entryKind === "REVERSAL" && (
                        <span className="text-xs text-destructive">Revertido</span>
                      )}
                      {/* Botón reverso: solo en PAYMENT no revertido, si el usuario puede */}
                      {p.entryKind === "PAYMENT" &&
                        !reversedPaymentIds.has(p.id) &&
                        canReverse &&
                        reversingPaymentId !== p.id && (
                          <button
                            type="button"
                            onClick={() => setReversingPaymentId(p.id)}
                            className="ml-auto text-xs text-muted-foreground hover:text-destructive underline-offset-2 hover:underline"
                          >
                            Revertir
                          </button>
                        )}
                    </div>
                    {/* Formulario de reverso inline */}
                    {reversingPaymentId === p.id && (
                      <ReversePaymentForm
                        patientId={patientId}
                        paymentId={p.id}
                        amountCents={p.amountCents}
                        onDone={() => { setReversingPaymentId(null); router.refresh(); }}
                        onCancel={() => setReversingPaymentId(null)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isAccepted && canRecordPayment && !quote.liquidado && (
            <>
              {showPaymentForm ? (
                <RecordPaymentForm
                  patientId={patientId}
                  quoteId={quote.id}
                  balanceCents={quote.balanceCents}
                  onDone={() => { setShowPaymentForm(false); router.refresh(); }}
                  onCancel={() => setShowPaymentForm(false)}
                />
              ) : (
                <Button size="sm" variant="outline" onClick={() => setShowPaymentForm(true)}>
                  Registrar cobro
                </Button>
              )}
            </>
          )}

          {isAccepted && quote.liquidado && (
            <p className="text-xs text-green-700 font-medium">Presupuesto liquidado.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ───────────────────────────────────────────────────

export function QuotesSectionClient({
  view,
  patientId,
  activePlan,
  canCreate,
  canEdit,
  canPropose,
  canAccept,
  canCancel,
  canRecordPayment,
  canViewPayments,
  canReverse,
}: QuotesSectionClientProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const router = useRouter();

  const { quotes, totalQuotes } = view;

  const totalProposedCents = quotes
    .filter((q) => ["PROPOSED", "ACCEPTED"].includes(q.status))
    .reduce((sum, q) => sum + q.totalCents, 0);
  const totalAcceptedCents = quotes
    .filter((q) => q.status === "ACCEPTED")
    .reduce((sum, q) => sum + q.totalCents, 0);
  const paidCents = quotes
    .filter((q) => q.status === "ACCEPTED")
    .reduce((sum, q) => sum + q.paidCents, 0);
  const balanceCents = totalAcceptedCents - paidCents;

  const canShowCreate =
    canCreate &&
    activePlan !== null &&
    activePlan.items.length > 0;

  return (
    <div className="space-y-4">
      {/* Cabecera de sección */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Presupuestos y Cobros</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalQuotes === 0
              ? "Sin presupuestos registrados"
              : `${totalQuotes} presupuesto${totalQuotes !== 1 ? "s" : ""}`}
          </p>
        </div>
        {canShowCreate && !showCreateForm && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCreateForm(true)}
          >
            + Nuevo presupuesto
          </Button>
        )}
      </div>

      {/* Resumen financiero */}
      {totalQuotes > 0 && (
        <div className="rounded-xl border bg-card ring-1 ring-foreground/10 overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30">
            <h3 className="font-medium text-sm">Resumen financiero</h3>
          </div>
          <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Total propuesto</p>
              <p className="font-semibold">{fCents(totalProposedCents)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total aceptado</p>
              <p className="font-semibold">{fCents(totalAcceptedCents)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pagado</p>
              <p className="font-semibold text-green-700">{fCents(paidCents)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saldo pendiente</p>
              <p className={`font-semibold ${balanceCents > 0 ? "text-destructive" : ""}`}>
                {fCents(balanceCents)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Formulario de creación */}
      {showCreateForm && activePlan && (
        <CreateQuoteForm
          patientId={patientId}
          activePlan={activePlan}
          onCancel={() => setShowCreateForm(false)}
          onDone={() => { setShowCreateForm(false); router.refresh(); }}
        />
      )}

      {/* Lista de presupuestos */}
      {quotes.length === 0 && !showCreateForm && (
        <div className="rounded-xl border bg-card ring-1 ring-foreground/10 overflow-hidden">
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">Sin presupuestos registrados.</p>
            {canShowCreate && (
              <p className="text-xs text-muted-foreground mt-1">
                Usa el botón "Nuevo presupuesto" para crear uno desde el plan activo.
              </p>
            )}
          </div>
        </div>
      )}

      {quotes.map((quote) => (
        <QuoteCard
          key={quote.id}
          quote={quote}
          patientId={patientId}
          canEdit={canEdit}
          canPropose={canPropose}
          canAccept={canAccept}
          canCancel={canCancel}
          canRecordPayment={canRecordPayment}
          canViewPayments={canViewPayments}
          canReverse={canReverse}
        />
      ))}
    </div>
  );
}
