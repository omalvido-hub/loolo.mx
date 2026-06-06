"use client";

// Sección de hallazgos de una consulta específica.
// Muestra SOLO lo registrado en esa consulta — no mezcla con el estado vigente global.
// Permite agregar hallazgos si canRecord=true y la consulta está DRAFT/IN_PROGRESS.

import { useState, useTransition } from "react";
import type { OdontogramEncounterView } from "@/server/domain/clinical/odontogram-views";
import { FindingsPanel } from "./FindingsPanel";
import { OdontogramEmpty } from "./OdontogramEmpty";
import { OdontogramChartInteractive } from "./OdontogramChartInteractive";
import { Button } from "@/components/ui/button";
import {
  recordFindingAction,
  voidFindingAction,
  treatFindingAction,
  resolveFindingAction,
} from "@/server/actions/odontogram";
import { getToothName } from "./tooth-names";
import { ToothDiagram } from "./ToothDiagram";

// ─── Catálogos FDI ──────────────────────────────────────────────────────────

const FDI_LIST: number[] = [
  18, 17, 16, 15, 14, 13, 12, 11,
  21, 22, 23, 24, 25, 26, 27, 28,
  48, 47, 46, 45, 44, 43, 42, 41,
  31, 32, 33, 34, 35, 36, 37, 38,
];

const FINDING_TYPES = [
  { value: "CARIES", label: "Caries" },
  { value: "RESTORATION", label: "Restauración" },
  { value: "CROWN", label: "Corona" },
  { value: "ENDODONTICS", label: "Endodoncia" },
  { value: "IMPLANT", label: "Implante" },
  { value: "FRACTURE", label: "Fractura" },
  { value: "MOBILITY", label: "Movilidad" },
  { value: "MISSING", label: "Pieza ausente" },
  { value: "SEALANT", label: "Sellador" },
  { value: "OTHER", label: "Otro" },
];

const TOOTH_STATUSES = [
  { value: "PRESENT", label: "Presente" },
  { value: "ABSENT", label: "Ausente" },
  { value: "EXTRACTED", label: "Extraída" },
  { value: "IMPACTED", label: "Retenida" },
  { value: "UNERUPTED", label: "No erupcionada" },
  { value: "ROOT_ONLY", label: "Solo raíz" },
];

const SURFACES = [
  { value: "MESIAL", label: "Mesial" },
  { value: "DISTAL", label: "Distal" },
  { value: "OCCLUSAL", label: "Oclusal" },
  { value: "VESTIBULAR", label: "Vestibular" },
  { value: "LINGUAL", label: "Lingual" },
  { value: "INCISAL", label: "Incisal" },
];

// Tipos que requieren superficie (obligatorio)
const SURFACE_REQUIRED = new Set(["CARIES", "RESTORATION", "SEALANT"]);
// Tipos que no admiten superficie
const SURFACE_FORBIDDEN = new Set(["MISSING", "IMPLANT", "CROWN", "ENDODONTICS", "MOBILITY"]);

function surfaceMode(findingType: string): "required" | "forbidden" | "optional" {
  if (SURFACE_REQUIRED.has(findingType)) return "required";
  if (SURFACE_FORBIDDEN.has(findingType)) return "forbidden";
  return "optional";
}

// ─── Props ──────────────────────────────────────────────────────────────────

// ─── Tipos de acción de ciclo de vida ────────────────────────────────────────

type LifecycleAction = "void" | "treat" | "resolve" | "controlled" | "observation";

interface ActiveLifecycle {
  findingId: string;
  action: LifecycleAction;
}

const LIFECYCLE_ACTION_LABEL: Record<LifecycleAction, string> = {
  void:        "Anular hallazgo",
  treat:       "Marcar como tratado",
  resolve:     "Marcar como resuelto",
  controlled:  "Marcar como controlado",
  observation: "Marcar en observación",
};

const LIFECYCLE_CHIP: Record<string, { label: string; cls: string }> = {
  ACTIVE:      { label: "Activo",      cls: "bg-blue-50 text-blue-700 border-blue-200" },
  OBSERVATION: { label: "Observación", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  TREATED:     { label: "Tratado",     cls: "bg-green-50 text-green-700 border-green-200" },
  RESOLVED:    { label: "Resuelto",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CONTROLLED:  { label: "Controlado",  cls: "bg-teal-50 text-teal-700 border-teal-200" },
  VOIDED:      { label: "Anulado",     cls: "bg-gray-100 text-gray-500 border-gray-200" },
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  view: OdontogramEncounterView;
  patientId: string;
  encounterId: string;
  encounterStatus: string;
  canRecord: boolean;
  canVoid?: boolean;
  canActOnFindings?: boolean;
  /** FDI de pieza a preseleccionar al abrir (viene de ?toothFdi= en la URL). */
  initialToothFdi?: number;
  /** Si true y hay consulta activa, abre el formulario de hallazgo al montar. */
  autoOpenForm?: boolean;
}

// ─── Formulario de hallazgo ──────────────────────────────────────────────────

interface FormState {
  toothFdi: string;
  findingType: string;
  toothStatus: string;
  surface: string;
}

const EMPTY_FORM: FormState = {
  toothFdi: "",
  findingType: "",
  toothStatus: "PRESENT",
  surface: "",
};

const OPEN_STATUSES = new Set(["DRAFT", "IN_PROGRESS"]);

// ─── Componente principal ────────────────────────────────────────────────────

export function EncounterFindings({
  view,
  patientId,
  encounterId,
  encounterStatus,
  canRecord,
  canVoid,
  canActOnFindings,
  initialToothFdi,
  autoOpenForm,
}: Props) {
  const { findingsPanel, summary, teeth } = view;

  const canAdd = canRecord && OPEN_STATUSES.has(encounterStatus);
  const hasLifecycleActions = (canVoid || canActOnFindings);

  const [showForm, setShowForm] = useState(
    () => canAdd && autoOpenForm === true && initialToothFdi != null,
  );
  const [form, setForm] = useState<FormState>(() => ({
    ...EMPTY_FORM,
    toothFdi: initialToothFdi != null ? String(initialToothFdi) : "",
  }));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Estado para acciones de ciclo de vida
  const [activeLifecycle, setActiveLifecycle] = useState<ActiveLifecycle | null>(null);
  const [lifecycleReason, setLifecycleReason] = useState("");
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);
  const [isLifecyclePending, startLifecycleTransition] = useTransition();

  function openLifecycle(findingId: string, action: LifecycleAction) {
    setActiveLifecycle({ findingId, action });
    setLifecycleReason("");
    setLifecycleError(null);
  }

  function cancelLifecycle() {
    setActiveLifecycle(null);
    setLifecycleReason("");
    setLifecycleError(null);
  }

  function confirmLifecycle() {
    if (!activeLifecycle) return;
    if (activeLifecycle.action === "void" && !lifecycleReason.trim()) {
      setLifecycleError("El motivo es obligatorio para anular un hallazgo.");
      return;
    }
    startLifecycleTransition(async () => {
      const { findingId, action } = activeLifecycle;
      let result;
      if (action === "void") {
        result = await voidFindingAction(patientId, { findingId, lifecycleReason: lifecycleReason.trim(), encounterId });
      } else if (action === "treat") {
        result = await treatFindingAction(patientId, {
          findingId,
          encounterId,
          ...(lifecycleReason.trim() ? { lifecycleReason: lifecycleReason.trim() } : {}),
        });
      } else {
        const targetStatus =
          action === "resolve"    ? "RESOLVED" :
          action === "controlled" ? "CONTROLLED" :
                                    "OBSERVATION";
        result = await resolveFindingAction(patientId, {
          findingId,
          targetStatus,
          encounterId,
          ...(lifecycleReason.trim() ? { lifecycleReason: lifecycleReason.trim() } : {}),
        });
      }
      if (result.ok) {
        cancelLifecycle();
      } else {
        setLifecycleError(result.error);
      }
    });
  }
  const [selectedFdi, setSelectedFdi] = useState<number | null>(
    () => initialToothFdi ?? null,
  );
  const mode = form.findingType ? surfaceMode(form.findingType) : null;

  // Datos de la pieza actualmente seleccionada en el diagrama.
  const selectedTooth = selectedFdi !== null
    ? (teeth.find((t) => t.fdi === selectedFdi) ?? null)
    : null;
  const selectedToothFindings = selectedFdi !== null
    ? findingsPanel.filter((f) => f.toothFdi === selectedFdi)
    : [];

  function handleOdontogramClick(fdi: number | null) {
    setSelectedFdi(fdi);
    if (fdi !== null) {
      if (showForm) {
        setForm((prev) => ({ ...prev, toothFdi: String(fdi) }));
      }
    }
  }

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Limpiar superficie al cambiar tipo si pasa a forbidden
      if (field === "findingType" && SURFACE_FORBIDDEN.has(value)) {
        next.surface = "";
      }
      return next;
    });
    setError(null);
  }

  function handleSubmit() {
    if (!form.toothFdi || !form.findingType || !form.toothStatus) {
      setError("Completa pieza FDI, tipo de hallazgo y estado.");
      return;
    }
    if (mode === "required" && !form.surface) {
      setError("Este tipo de hallazgo requiere seleccionar una superficie.");
      return;
    }

    startTransition(async () => {
      const result = await recordFindingAction(patientId, encounterId, {
        toothFdi: Number(form.toothFdi),
        findingType: form.findingType,
        toothStatus: form.toothStatus,
        ...(mode !== "forbidden" && form.surface ? { surface: form.surface } : {}),
      });
      if (result.ok) {
        setForm(EMPTY_FORM);
        setShowForm(false);
        setError(null);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      {/* Mini odontograma interactivo — solo en consulta activa */}
      {canAdd && (
        <div className="rounded-lg border p-3 bg-muted/10">
          <div className="overflow-x-auto pb-2">
            <div className="w-max mx-auto">
              <OdontogramChartInteractive
                teeth={teeth}
                patientId={patientId}
                selectedFdi={selectedFdi}
                onToothClick={handleOdontogramClick}
              />
            </div>
          </div>
        </div>
      )}

      {/* Pieza seleccionada — diagrama visual + nombre clínico + hallazgos de esta consulta */}
      {canAdd && selectedFdi !== null && (
        <div className="rounded-lg border border-blue-100 bg-blue-50/40 px-3 py-2.5">
          <div className="flex items-start gap-3">
            <ToothDiagram
              fdi={selectedFdi}
              status={selectedTooth?.status ?? "PRESENT"}
              findings={selectedTooth?.findings ?? []}
              size={56}
            />
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-foreground">
                  Pieza {selectedFdi}
                </span>
                <span className="text-sm text-muted-foreground">
                  {getToothName(selectedFdi).short} {getToothName(selectedFdi).quadrant.toLowerCase()}
                </span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-muted-foreground/30 text-muted-foreground">
                  {TOOTH_STATUSES.find((s) => s.value === (selectedTooth?.status ?? "PRESENT"))?.label
                    ?? (selectedTooth?.status ?? "Presente")}
                </span>
              </div>
              {selectedToothFindings.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                    Hallazgos en esta consulta
                  </p>
                  {selectedToothFindings.map((f, i) => {
                    const chip = LIFECYCLE_CHIP[f.lifecycleStatus] ?? LIFECYCLE_CHIP.ACTIVE;
                    const isTarget = activeLifecycle?.findingId === f.findingId;
                    const canActOnThis = hasLifecycleActions && f.lifecycleStatus !== "VOIDED";
                    return (
                      <div key={i} className={`rounded border text-xs transition-colors ${isTarget ? "border-blue-200 bg-blue-50/40" : "border-transparent"}`}>
                        <div className="flex items-start gap-2 px-1 py-1">
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-foreground">
                              {FINDING_TYPES.find((ft) => ft.value === f.findingType)?.label ?? f.findingType}
                            </span>
                            {f.surface && (
                              <span className="text-muted-foreground">
                                {` · ${SURFACES.find((s) => s.value === f.surface)?.label ?? f.surface}`}
                              </span>
                            )}
                            {f.lifecycleStatus && f.lifecycleStatus !== "ACTIVE" && (
                              <span className={`ml-1.5 text-[9px] font-medium px-1 py-px rounded border ${chip.cls}`}>
                                {chip.label}
                              </span>
                            )}
                          </div>
                          {canActOnThis && !isTarget && (
                            <div className="flex gap-1 flex-shrink-0 flex-wrap justify-end">
                              {canActOnFindings && (
                                <>
                                  <button type="button" onClick={() => openLifecycle(f.findingId, "treat")}
                                    className="text-[9px] px-1.5 py-0.5 rounded border border-green-200 text-green-700 hover:bg-green-50 transition-colors">
                                    Tratar
                                  </button>
                                  <button type="button" onClick={() => openLifecycle(f.findingId, "resolve")}
                                    className="text-[9px] px-1.5 py-0.5 rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors">
                                    Resuelto
                                  </button>
                                  <button type="button" onClick={() => openLifecycle(f.findingId, "controlled")}
                                    className="text-[9px] px-1.5 py-0.5 rounded border border-teal-200 text-teal-700 hover:bg-teal-50 transition-colors">
                                    Controlado
                                  </button>
                                  <button type="button" onClick={() => openLifecycle(f.findingId, "observation")}
                                    className="text-[9px] px-1.5 py-0.5 rounded border border-yellow-200 text-yellow-700 hover:bg-yellow-50 transition-colors">
                                    Obs.
                                  </button>
                                </>
                              )}
                              {canVoid && (
                                <button type="button" onClick={() => openLifecycle(f.findingId, "void")}
                                  className="text-[9px] px-1.5 py-0.5 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                                  Anular
                                </button>
                              )}
                            </div>
                          )}
                          {isTarget && (
                            <button type="button" onClick={cancelLifecycle} disabled={isLifecyclePending}
                              className="text-muted-foreground hover:text-foreground text-xs flex-shrink-0 disabled:opacity-40">
                              ✕
                            </button>
                          )}
                        </div>
                        {isTarget && activeLifecycle && (
                          <div className="px-2 pb-2 space-y-1.5">
                            <p className="text-[10px] font-medium text-foreground">
                              {LIFECYCLE_ACTION_LABEL[activeLifecycle.action]}
                              {activeLifecycle.action === "void" ? " — motivo obligatorio" : " — motivo opcional"}
                            </p>
                            <textarea
                              className="w-full rounded border border-input bg-background text-xs px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                              rows={2}
                              placeholder={activeLifecycle.action === "void" ? "Escribe el motivo de anulación…" : "Motivo (opcional)…"}
                              value={lifecycleReason}
                              onChange={(e) => { setLifecycleReason(e.target.value); setLifecycleError(null); }}
                              disabled={isLifecyclePending}
                            />
                            {lifecycleError && <p className="text-[10px] text-destructive">{lifecycleError}</p>}
                            <div className="flex gap-1.5">
                              <button type="button" onClick={confirmLifecycle} disabled={isLifecyclePending}
                                className="text-[10px] px-2.5 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/80 transition-colors disabled:opacity-50 font-medium">
                                {isLifecyclePending ? "Guardando…" : "Confirmar"}
                              </button>
                              <button type="button" onClick={cancelLifecycle} disabled={isLifecyclePending}
                                className="text-[10px] px-2.5 py-1 rounded border hover:bg-muted transition-colors disabled:opacity-50">
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Sin hallazgos en esta consulta.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold">Hallazgos de esta consulta</h3>
          {summary.findingsCount > 0 && (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
              {summary.findingsCount} hallazgo{summary.findingsCount !== 1 ? "s" : ""}
              {summary.affectedTeethCount > 0 && (
                <> · {summary.affectedTeethCount} pieza{summary.affectedTeethCount !== 1 ? "s" : ""}</>
              )}
            </span>
          )}
        </div>
        {canAdd && !showForm && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setForm({ ...EMPTY_FORM, toothFdi: selectedFdi !== null ? String(selectedFdi) : "" });
              setShowForm(true);
            }}
          >
            + Agregar hallazgo
          </Button>
        )}
      </div>

      {showForm && canAdd && (
        <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Nuevo hallazgo
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {/* Pieza FDI */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Pieza FDI</label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.toothFdi}
                onChange={(e) => handleChange("toothFdi", e.target.value)}
              >
                <option value="">Seleccionar…</option>
                {FDI_LIST.map((fdi) => (
                  <option key={fdi} value={fdi}>
                    {fdi} — {getToothName(fdi).short}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo de hallazgo */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Tipo de hallazgo</label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.findingType}
                onChange={(e) => handleChange("findingType", e.target.value)}
              >
                <option value="">Seleccionar…</option>
                {FINDING_TYPES.map((ft) => (
                  <option key={ft.value} value={ft.value}>
                    {ft.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Estado de la pieza */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Estado de la pieza</label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.toothStatus}
                onChange={(e) => handleChange("toothStatus", e.target.value)}
              >
                {TOOTH_STATUSES.map((ts) => (
                  <option key={ts.value} value={ts.value}>
                    {ts.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Superficie — solo cuando aplique */}
            {mode !== null && mode !== "forbidden" && (
              <div className="space-y-1">
                <label className="text-xs font-medium">
                  Superficie{mode === "required" ? " *" : " (opcional)"}
                </label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={form.surface}
                  onChange={(e) => handleChange("surface", e.target.value)}
                >
                  <option value="">Seleccionar…</option>
                  {SURFACES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Guardando…" : "Guardar hallazgo"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowForm(false);
                setForm(EMPTY_FORM);
                setError(null);
              }}
              disabled={isPending}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {findingsPanel.length === 0 ? (
        <OdontogramEmpty />
      ) : (
        <FindingsPanel findings={findingsPanel} patientId={patientId} />
      )}
    </div>
  );
}
