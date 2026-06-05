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
import { recordFindingAction } from "@/server/actions/odontogram";
import { getToothName } from "./tooth-names";

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

interface Props {
  view: OdontogramEncounterView;
  patientId: string;
  encounterId: string;
  encounterStatus: string;
  canRecord: boolean;
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
}: Props) {
  const { findingsPanel, summary, teeth } = view;
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedFdi, setSelectedFdi] = useState<number | null>(null);

  const canAdd = canRecord && OPEN_STATUSES.has(encounterStatus);
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

      {/* Pieza seleccionada — nombre clínico, estado y hallazgos de esta consulta */}
      {canAdd && selectedFdi !== null && (
        <div className="rounded-lg border border-blue-100 bg-blue-50/40 px-3 py-2.5 space-y-1.5">
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
            <div className="space-y-0.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Hallazgos en esta consulta
              </p>
              {selectedToothFindings.map((f, i) => (
                <p key={i} className="text-xs text-foreground">
                  {FINDING_TYPES.find((ft) => ft.value === f.findingType)?.label ?? f.findingType}
                  {f.surface
                    ? ` · ${SURFACES.find((s) => s.value === f.surface)?.label ?? f.surface}`
                    : ""}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Sin hallazgos registrados en esta pieza.
            </p>
          )}
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
                    {fdi}
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
