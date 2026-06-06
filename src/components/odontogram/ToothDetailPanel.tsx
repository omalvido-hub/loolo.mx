"use client";

// Panel de detalle de una pieza dental seleccionada.
// Muestra FDI, nombre, estado, hallazgos y acciones de ciclo de vida (LIFECYCLE-1B).
// Acciones disponibles según permisos: tratar, resolver, controlar, observación, anular.
// No expone lifecycleReason ni IDs internos sensibles en vistas públicas.

import { useState, useTransition } from "react";
import Link from "next/link";
import type { FindingPanelItem } from "@/server/domain/clinical/odontogram-views";
import { getToothName } from "./tooth-names";
import { ToothDiagram } from "./ToothDiagram";
import {
  voidFindingAction,
  treatFindingAction,
  resolveFindingAction,
} from "@/server/actions/odontogram";

const FINDING_TYPE_LABEL: Record<string, string> = {
  CARIES:      "Caries",
  RESTORATION: "Restauración",
  CROWN:       "Corona",
  ENDODONTICS: "Endodoncia",
  IMPLANT:     "Implante",
  FRACTURE:    "Fractura",
  MOBILITY:    "Movilidad",
  MISSING:     "Ausente",
  SEALANT:     "Sellante",
  OTHER:       "Otro",
};

const TOOTH_STATUS_LABEL: Record<string, string> = {
  PRESENT:   "Presente",
  ABSENT:    "Ausente",
  EXTRACTED: "Extraído",
  IMPACTED:  "Impactado",
  UNERUPTED: "Sin erupcionar",
  ROOT_ONLY: "Solo raíz",
  MISSING:   "Ausente",
};

const TOOTH_STATUS_COLOR: Record<string, string> = {
  PRESENT:   "bg-green-50 text-green-700 border-green-200",
  ABSENT:    "bg-gray-100 text-gray-600 border-gray-200",
  EXTRACTED: "bg-gray-100 text-gray-600 border-gray-200",
  IMPACTED:  "bg-yellow-50 text-yellow-700 border-yellow-200",
  UNERUPTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ROOT_ONLY: "bg-red-50 text-red-700 border-red-200",
  MISSING:   "bg-gray-100 text-gray-600 border-gray-200",
};

const SURFACE_LABEL: Record<string, string> = {
  MESIAL:     "Mesial",
  DISTAL:     "Distal",
  OCCLUSAL:   "Oclusal",
  VESTIBULAR: "Vestibular",
  LINGUAL:    "Lingual",
  INCISAL:    "Incisal",
};

const FINDING_TYPE_COLOR: Record<string, string> = {
  CARIES:      "#dc2626",
  RESTORATION: "#2563eb",
  CROWN:       "#7c3aed",
  ENDODONTICS: "#ea580c",
  IMPLANT:     "#6b7280",
  FRACTURE:    "#f59e0b",
  MOBILITY:    "#ca8a04",
  MISSING:     "#374151",
  SEALANT:     "#0891b2",
  OTHER:       "#9ca3af",
};

const LIFECYCLE_CHIP: Record<string, { label: string; cls: string }> = {
  ACTIVE:      { label: "Activo",      cls: "bg-blue-50 text-blue-700 border-blue-200" },
  OBSERVATION: { label: "Observación", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  TREATED:     { label: "Tratado",     cls: "bg-green-50 text-green-700 border-green-200" },
  RESOLVED:    { label: "Resuelto",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CONTROLLED:  { label: "Controlado",  cls: "bg-teal-50 text-teal-700 border-teal-200" },
  VOIDED:      { label: "Anulado",     cls: "bg-gray-100 text-gray-500 border-gray-200" },
};

const FMT_DATE = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  dateStyle: "short",
});

function fDate(iso: string): string {
  try { return FMT_DATE.format(new Date(iso)); } catch { return "—"; }
}

// ─── Tipos de acción de ciclo de vida ────────────────────────────────────────

type ActionType = "void" | "treat" | "resolve" | "controlled" | "observation";

interface ActiveAction {
  findingId: string;
  action: ActionType;
}

const ACTION_LABEL: Record<ActionType, string> = {
  void:        "Anular hallazgo",
  treat:       "Marcar como tratado",
  resolve:     "Marcar como resuelto",
  controlled:  "Marcar como controlado",
  observation: "Marcar en observación",
};

// Mapeo de estado actual → acción que lo representa.
// Si el hallazgo ya está en ese estado, su botón equivalente se oculta.
const LIFECYCLE_STATUS_TO_ACTION: Partial<Record<string, ActionType>> = {
  TREATED:     "treat",
  RESOLVED:    "resolve",
  CONTROLLED:  "controlled",
  OBSERVATION: "observation",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  fdi: number;
  status: string;
  findings: FindingPanelItem[];
  patientId?: string;
  activeEncounterId?: string | null;
  onClose: () => void;
  canVoid?: boolean;
  canActOnFindings?: boolean;
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function ToothDetailPanel({
  fdi,
  status,
  findings,
  patientId,
  activeEncounterId,
  onClose,
  canVoid,
  canActOnFindings,
}: Props) {
  const name = getToothName(fdi);
  const statusLabel = TOOTH_STATUS_LABEL[status] ?? status;
  const statusColorClass = TOOTH_STATUS_COLOR[status] ?? "bg-gray-100 text-gray-600 border-gray-200";

  const [activeAction, setActiveAction] = useState<ActiveAction | null>(null);
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openAction(findingId: string, action: ActionType) {
    setActiveAction({ findingId, action });
    setReason("");
    setActionError(null);
  }

  function cancelAction() {
    setActiveAction(null);
    setReason("");
    setActionError(null);
  }

  function confirmAction() {
    if (!activeAction || !patientId) return;

    if (activeAction.action === "void" && !reason.trim()) {
      setActionError("El motivo es obligatorio para anular un hallazgo.");
      return;
    }

    startTransition(async () => {
      const { findingId, action } = activeAction;
      let result;

      if (action === "void") {
        result = await voidFindingAction(patientId, {
          findingId,
          lifecycleReason: reason.trim(),
        });
      } else if (action === "treat") {
        result = await treatFindingAction(patientId, {
          findingId,
          ...(reason.trim() ? { lifecycleReason: reason.trim() } : {}),
        });
      } else {
        const targetStatus =
          action === "resolve"     ? "RESOLVED" :
          action === "controlled"  ? "CONTROLLED" :
                                     "OBSERVATION";
        result = await resolveFindingAction(patientId, {
          findingId,
          targetStatus,
          ...(reason.trim() ? { lifecycleReason: reason.trim() } : {}),
        });
      }

      if (result.ok) {
        cancelAction();
        onClose();
      } else {
        setActionError(result.error);
      }
    });
  }

  const hasActions = (canVoid || canActOnFindings) && !!patientId;

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      {/* Cabecera */}
      <div className="px-4 py-3 bg-blue-50/60 border-b border-blue-100 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex flex-col items-center shrink-0">
            <ToothDiagram fdi={fdi} status={status} findings={findings} size={64} />
            <p className="text-[8px] text-muted-foreground/50 mt-0.5 text-center leading-tight">
              Superficies
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider mb-1">
              Pieza seleccionada
            </p>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-xl font-bold text-foreground leading-tight">
                Pieza {fdi}
              </span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${statusColorClass}`}>
                {statusLabel}
              </span>
            </div>
            <p className="text-[12px] text-muted-foreground mt-1 leading-tight font-medium">
              {name.full}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none mt-0.5 flex-shrink-0"
          aria-label="Cerrar panel"
        >
          ×
        </button>
      </div>

      {/* Hallazgos */}
      <div className="px-3 py-2.5">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Hallazgos en esta pieza
        </p>

        {findings.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            Sin hallazgos en esta pieza
          </p>
        ) : (
          <div className="space-y-1.5">
            {findings.map((f, i) => {
              const color = FINDING_TYPE_COLOR[f.findingType] ?? "#9ca3af";
              const chip = LIFECYCLE_CHIP[f.lifecycleStatus] ?? LIFECYCLE_CHIP.ACTIVE;
              const isTarget = activeAction?.findingId === f.findingId;
              const canActOnThis = hasActions && f.lifecycleStatus !== "VOIDED";
              // Acción que ya representa el estado actual → su botón se oculta.
              const currentStatusAction = LIFECYCLE_STATUS_TO_ACTION[f.lifecycleStatus] ?? null;

              return (
                <div
                  key={i}
                  className={`rounded border text-xs transition-colors ${
                    isTarget ? "border-blue-200 bg-blue-50/40" : "border-transparent"
                  }`}
                >
                  {/* Fila del hallazgo */}
                  <div className="flex items-start gap-2 px-1.5 py-1.5">
                    <div
                      className="mt-0.5 w-2 h-2 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">
                        {FINDING_TYPE_LABEL[f.findingType] ?? f.findingType}
                      </span>
                      {f.surface && (
                        <span className="text-muted-foreground">
                          {" · "}{SURFACE_LABEL[f.surface] ?? f.surface}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className={`text-[9px] font-medium px-1 py-px rounded border ${chip.cls}`}>
                          {chip.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{fDate(f.createdAt)}</span>
                      </div>
                    </div>

                    {/* Botones de acción */}
                    {canActOnThis && !isTarget && (
                      <div className="flex flex-col gap-1 flex-shrink-0 items-end">
                        <div className="flex gap-1 flex-wrap justify-end">
                          {canActOnFindings && (
                            <>
                              {currentStatusAction !== "treat" && (
                                <button
                                  type="button"
                                  onClick={() => openAction(f.findingId, "treat")}
                                  className="text-[9px] px-1.5 py-0.5 rounded border border-green-200 text-green-700 hover:bg-green-50 transition-colors whitespace-nowrap"
                                >
                                  Tratar
                                </button>
                              )}
                              {currentStatusAction !== "resolve" && (
                                <button
                                  type="button"
                                  onClick={() => openAction(f.findingId, "resolve")}
                                  className="text-[9px] px-1.5 py-0.5 rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors whitespace-nowrap"
                                >
                                  Resuelto
                                </button>
                              )}
                              {currentStatusAction !== "controlled" && (
                                <button
                                  type="button"
                                  onClick={() => openAction(f.findingId, "controlled")}
                                  className="text-[9px] px-1.5 py-0.5 rounded border border-teal-200 text-teal-700 hover:bg-teal-50 transition-colors whitespace-nowrap"
                                >
                                  Controlado
                                </button>
                              )}
                              {currentStatusAction !== "observation" && (
                                <button
                                  type="button"
                                  onClick={() => openAction(f.findingId, "observation")}
                                  className="text-[9px] px-1.5 py-0.5 rounded border border-yellow-200 text-yellow-700 hover:bg-yellow-50 transition-colors whitespace-nowrap"
                                >
                                  Obs.
                                </button>
                              )}
                            </>
                          )}
                          {canVoid && (
                            <button
                              type="button"
                              onClick={() => openAction(f.findingId, "void")}
                              className="text-[9px] px-1.5 py-0.5 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors whitespace-nowrap"
                            >
                              Anular
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Botón cerrar form inline */}
                    {isTarget && (
                      <button
                        type="button"
                        onClick={cancelAction}
                        disabled={isPending}
                        className="text-muted-foreground hover:text-foreground text-xs flex-shrink-0 leading-none disabled:opacity-40"
                        aria-label="Cancelar acción"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Formulario de confirmación inline */}
                  {isTarget && activeAction && (
                    <div className="px-2 pb-2.5 space-y-1.5">
                      <p className="text-[10px] font-medium text-foreground">
                        {ACTION_LABEL[activeAction.action]}
                        {activeAction.action === "void"
                          ? " — motivo obligatorio"
                          : " — motivo opcional"}
                      </p>
                      <textarea
                        className="w-full rounded border border-input bg-background text-xs px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                        rows={2}
                        placeholder={
                          activeAction.action === "void"
                            ? "Escribe el motivo de anulación…"
                            : "Motivo (opcional)…"
                        }
                        value={reason}
                        onChange={(e) => { setReason(e.target.value); setActionError(null); }}
                        disabled={isPending}
                      />
                      {actionError && (
                        <p className="text-[10px] text-destructive">{actionError}</p>
                      )}
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={confirmAction}
                          disabled={isPending}
                          className="text-[10px] px-2.5 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/80 transition-colors disabled:opacity-50 font-medium"
                        >
                          {isPending ? "Guardando…" : "Confirmar"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelAction}
                          disabled={isPending}
                          className="text-[10px] px-2.5 py-1 rounded border hover:bg-muted transition-colors disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Acción — navegar a consulta activa con pieza preseleccionada */}
      <div className="px-3 pb-3">
        {activeEncounterId && patientId ? (
          <Link
            href={`/pacientes/${patientId}/consultas/${activeEncounterId}?toothFdi=${fdi}&openFinding=1`}
            className="flex items-center justify-center w-full text-xs py-1.5 px-3 rounded border border-blue-200 bg-blue-50/60 text-blue-700 hover:bg-blue-100 transition-colors font-medium"
          >
            + Agregar hallazgo en consulta activa
          </Link>
        ) : (
          <p className="text-[10px] text-muted-foreground/60 text-center py-1.5">
            Para agregar hallazgos, inicia o continúa una consulta activa.
          </p>
        )}
      </div>
    </div>
  );
}
