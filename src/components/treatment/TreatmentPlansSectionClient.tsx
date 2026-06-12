"use client";

// NELZZON — Sección interactiva mínima de Plan de tratamiento (FASE 1B).
// Permite: crear plan (DRAFT), agregar ítems a un plan DRAFT/ACTIVE, y
// transicionar estados de plan/ítem según las matrices del dominio
// (PLAN_TRANSITIONS / ITEM_TRANSITIONS de treatment-schemas.ts).
// Todo fluye por Server Actions (src/server/actions/treatment.ts) →
// revalidatePath → router.refresh(). Sin lógica de negocio propia.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TreatmentPlansPatientView, TreatmentPlanView, TreatmentItemView } from "@/server/domain/clinical/treatment-views";
import { PLAN_TRANSITIONS, ITEM_TRANSITIONS, ITEM_TERMINAL, ProcedureTypeZ, TreatmentPriorityZ } from "@/server/domain/clinical/treatment-schemas";
import { ToothSurfaceZ } from "@/server/domain/clinical/odontogram-schemas";
import { TreatmentPlanStatusBadge } from "./TreatmentPlanStatusBadge";
import { TreatmentEmpty } from "./TreatmentEmpty";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createPlanAction,
  addItemAction,
  setPlanStatusAction,
  setItemStatusAction,
} from "@/server/actions/treatment";

// ─── Utilidades y etiquetas ─────────────────────────────────────────────────

const FMT_DATE = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  dateStyle: "medium",
});

function fDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try { return FMT_DATE.format(new Date(iso)); } catch { return "—"; }
}

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

const SURFACE_LABELS: Record<string, string> = {
  MESIAL: "Mesial",
  DISTAL: "Distal",
  OCCLUSAL: "Oclusal",
  VESTIBULAR: "Vestibular",
  LINGUAL: "Lingual",
  INCISAL: "Incisal",
};

const PRIORITY_LABELS: Record<string, string> = {
  URGENT: "Urgente",
  HIGH: "Alta",
  NORMAL: "Normal",
  LOW: "Baja",
};

// Etiqueta del botón de transición según el estado destino.
const TRANSITION_LABELS: Record<string, string> = {
  PROPOSED: "Proponer",
  ACCEPTED: "Aceptar",
  REJECTED: "Rechazar",
  ACTIVE: "Activar",
  IN_PROGRESS: "Iniciar",
  COMPLETED: "Completar",
  CANCELED: "Cancelar",
};

// Mapeo estado destino → permiso requerido (espejo de PLAN_PERM/ITEM_PERM en
// treatment.ts; solo gobierna qué botones se muestran, la autorización real
// vive en el dominio vía authorize()).
const PLAN_PERM_FLAG: Record<string, keyof TreatmentPermissions> = {
  PROPOSED: "canPropose",
  ACCEPTED: "canAccept",
  REJECTED: "canAccept",
  ACTIVE: "canAccept",
  COMPLETED: "canComplete",
  CANCELED: "canCancel",
};
const ITEM_PERM_FLAG: Record<string, keyof TreatmentPermissions> = {
  ACCEPTED: "canAccept",
  REJECTED: "canAccept",
  IN_PROGRESS: "canEdit",
  COMPLETED: "canComplete",
  CANCELED: "canCancel",
};

// Transiciones que terminan el plan/ítem sin avance (rechazar/cancelar) se
// agrupan visualmente aparte de las transiciones de avance (proponer, aceptar,
// activar, iniciar, completar). Misma lista de transiciones, solo orden visual.
const DESTRUCTIVE_TARGETS = new Set(["CANCELED", "REJECTED"]);

function splitTargets(targets: string[]): { primary: string[]; destructive: string[] } {
  return {
    primary: targets.filter((t) => !DESTRUCTIVE_TARGETS.has(t)),
    destructive: targets.filter((t) => DESTRUCTIVE_TARGETS.has(t)),
  };
}

// ─── Permisos ────────────────────────────────────────────────────────────────

export interface TreatmentPermissions {
  canCreate: boolean;
  canEdit: boolean;
  canPropose: boolean;
  canAccept: boolean;
  canComplete: boolean;
  canCancel: boolean;
}

// ─── Subcomponente: formulario "Agregar tratamiento" ───────────────────────

interface AddItemFormProps {
  patientId: string;
  planId: string;
  onCancel: () => void;
  onDone: () => void;
}

function AddItemForm({ patientId, planId, onCancel, onDone }: AddItemFormProps) {
  const [procedureType, setProcedureType] = useState<string>(ProcedureTypeZ.options[0]);
  const [toothFdi, setToothFdi] = useState("");
  const [surface, setSurface] = useState("");
  const [priority, setPriority] = useState<string>("NORMAL");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    const raw: Record<string, unknown> = { planId, procedureType, priority };
    if (toothFdi.trim() !== "") {
      const fdi = Number(toothFdi);
      if (!Number.isInteger(fdi)) {
        setError("La pieza debe ser un número FDI válido (11-48).");
        return;
      }
      raw.toothFdi = fdi;
    }
    if (surface !== "") raw.surface = surface;

    startTransition(async () => {
      const result = await addItemAction(patientId, raw);
      if (!result.ok) setError(result.error);
      else onDone();
    });
  }

  return (
    <div className="mt-2 p-3 rounded-lg border bg-muted/20 space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Agregar tratamiento
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={procedureType}
          onChange={(e) => setProcedureType(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          disabled={isPending}
          aria-label="Tipo de procedimiento"
        >
          {ProcedureTypeZ.options.map((value) => (
            <option key={value} value={value}>{PROCEDURE_LABELS[value] ?? value}</option>
          ))}
        </select>
        <Input
          type="number"
          min={11}
          max={48}
          placeholder="Pieza (opcional)"
          value={toothFdi}
          onChange={(e) => setToothFdi(e.target.value)}
          className="w-32 h-8 text-sm"
          disabled={isPending}
          aria-label="Pieza dental FDI (opcional)"
        />
        <select
          value={surface}
          onChange={(e) => setSurface(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          disabled={isPending}
          aria-label="Superficie (opcional)"
        >
          <option value="">Superficie (opcional)</option>
          {ToothSurfaceZ.options.map((value) => (
            <option key={value} value={value}>{SURFACE_LABELS[value] ?? value}</option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          disabled={isPending}
          aria-label="Prioridad"
        >
          {TreatmentPriorityZ.options.map((value) => (
            <option key={value} value={value}>{PRIORITY_LABELS[value] ?? value}</option>
          ))}
        </select>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Guardando…" : "Agregar"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

// ─── Subcomponente: fila de ítem con acciones de estado ────────────────────

interface ItemRowClientProps {
  patientId: string;
  item: TreatmentItemView;
  permissions: TreatmentPermissions;
  onChanged: () => void;
}

function ItemRowClient({ patientId, item, permissions, onChanged }: ItemRowClientProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const procedureLabel = PROCEDURE_LABELS[item.procedureType] ?? item.procedureType;
  const surfaceLabel = item.surface ? SURFACE_LABELS[item.surface] ?? item.surface : null;
  const priorityLabel = PRIORITY_LABELS[item.priority] ?? item.priority;

  const targets = (ITEM_TRANSITIONS[item.status] ?? []).filter(
    (to) => permissions[ITEM_PERM_FLAG[to]],
  );

  function handleTransition(to: string) {
    setError(null);
    startTransition(async () => {
      const result = await setItemStatusAction(patientId, item.id, to);
      if (!result.ok) setError(result.error);
      else onChanged();
    });
  }

  return (
    <div className="py-2 px-3 rounded-lg hover:bg-muted/40 transition-colors text-sm">
      <div className="flex items-center gap-3">
        <div className="w-14 shrink-0 text-center">
          {item.toothFdi ? (
            <span className="font-mono font-medium text-foreground">
              {item.toothFdi}
              {surfaceLabel && (
                <span className="text-xs text-muted-foreground ml-0.5">{surfaceLabel.slice(0, 1)}</span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-medium truncate">{procedureLabel}</span>
        </div>
        <div className="w-20 shrink-0 text-right">
          <span className="text-xs text-muted-foreground">{priorityLabel}</span>
        </div>
        <div className="shrink-0">
          <TreatmentPlanStatusBadge status={item.status} variant="item" />
        </div>
      </div>
      {targets.length > 0 && (() => {
        const { primary, destructive } = splitTargets(targets);
        return (
          <div className="flex items-center gap-2 mt-1 pl-1 flex-wrap">
            {primary.map((to) => (
              <Button
                key={to}
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={() => handleTransition(to)}
                disabled={isPending}
              >
                {TRANSITION_LABELS[to] ?? to}
              </Button>
            ))}
            {destructive.length > 0 && (
              <div className="ml-auto flex items-center gap-2">
                {destructive.map((to) => (
                  <Button
                    key={to}
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive h-7 px-2 text-xs"
                    onClick={() => handleTransition(to)}
                    disabled={isPending}
                  >
                    {TRANSITION_LABELS[to] ?? to}
                  </Button>
                ))}
              </div>
            )}
            {error && <span className="text-xs text-destructive w-full">{error}</span>}
          </div>
        );
      })()}
    </div>
  );
}

// ─── Subcomponente: tarjeta de plan con acciones ───────────────────────────

interface PlanCardClientProps {
  patientId: string;
  plan: TreatmentPlanView;
  permissions: TreatmentPermissions;
  highlighted?: boolean;
}

function PlanCardClient({ patientId, plan, permissions, highlighted = false }: PlanCardClientProps) {
  const router = useRouter();
  const [showAddItem, setShowAddItem] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const title = plan.title ?? "Plan de tratamiento";
  const dateLabel = plan.activatedAt
    ? `Activado el ${fDate(plan.activatedAt)}`
    : plan.proposedAt
    ? `Propuesto el ${fDate(plan.proposedAt)}`
    : `Creado el ${fDate(plan.createdAt)}`;

  const liveCount = plan.liveItemsCount;
  const totalCount = plan.itemsCount;
  const completedCount = plan.items.filter((i) => i.status === "COMPLETED").length;

  const liveItems = plan.items.filter((i) => !ITEM_TERMINAL.has(i.status));
  const terminalItems = plan.items.filter((i) => ITEM_TERMINAL.has(i.status));

  const planTargets = (PLAN_TRANSITIONS[plan.status] ?? []).filter(
    (to) => permissions[PLAN_PERM_FLAG[to]],
  );
  const canAddItem = permissions.canCreate && (plan.status === "DRAFT" || plan.status === "ACTIVE");

  function handlePlanTransition(to: string) {
    setError(null);
    startTransition(async () => {
      const result = await setPlanStatusAction(patientId, plan.id, to);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div
      className={`rounded-xl border overflow-hidden ${
        highlighted
          ? "ring-2 ring-green-400/60 bg-card"
          : "bg-card ring-1 ring-foreground/10"
      }`}
    >
      {/* Cabecera del plan */}
      <div className={`px-4 py-3 border-b flex items-start justify-between gap-3 ${highlighted ? "bg-green-50/60" : "bg-muted/30"}`}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <TreatmentPlanStatusBadge status={plan.status} variant="plan" />
            {highlighted && (
              <span className="text-xs font-medium text-green-700 bg-green-100 rounded-full px-2 py-0.5">
                Plan activo
              </span>
            )}
          </div>
          <p className="font-medium text-sm mt-1 truncate">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{dateLabel}</p>
        </div>
        <div className="shrink-0 text-right text-xs text-muted-foreground whitespace-nowrap">
          {totalCount === 0
            ? "Sin ítems"
            : `${liveCount} vivo${liveCount !== 1 ? "s" : ""} · ${completedCount} completado${completedCount !== 1 ? "s" : ""} / ${totalCount} total`}
        </div>
      </div>

      {/* Lista de ítems */}
      <div className="px-1 py-1">
        {plan.items.length === 0 ? (
          <p className="px-3 py-3 text-sm text-muted-foreground">Sin procedimientos registrados.</p>
        ) : (
          <div>
            <div className="flex items-center gap-3 px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span className="w-14 shrink-0 text-center">Pieza</span>
              <span className="flex-1">Procedimiento</span>
              <span className="w-20 shrink-0 text-right">Prioridad</span>
              <span className="shrink-0">Estado</span>
            </div>
            {liveItems.map((item) => (
              <ItemRowClient
                key={item.id}
                patientId={patientId}
                item={item}
                permissions={permissions}
                onChanged={() => router.refresh()}
              />
            ))}
            {terminalItems.length > 0 && (
              <div className="mt-2 pt-2 border-t">
                <p className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Finalizados
                </p>
                <div className="opacity-70">
                  {terminalItems.map((item) => (
                    <ItemRowClient
                      key={item.id}
                      patientId={patientId}
                      item={item}
                      permissions={permissions}
                      onChanged={() => router.refresh()}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Agregar tratamiento */}
      {canAddItem && (
        <div className="px-3 pb-3">
          {showAddItem ? (
            <AddItemForm
              patientId={patientId}
              planId={plan.id}
              onCancel={() => setShowAddItem(false)}
              onDone={() => { setShowAddItem(false); router.refresh(); }}
            />
          ) : (
            <Button size="sm" variant="outline" onClick={() => setShowAddItem(true)}>
              + Agregar tratamiento
            </Button>
          )}
        </div>
      )}

      {/* Acciones de estado del plan */}
      {planTargets.length > 0 && (() => {
        const { primary, destructive } = splitTargets(planTargets);
        return (
          <div className="px-4 py-3 border-t bg-muted/10 flex items-center gap-2 flex-wrap">
            {primary.map((to) => (
              <Button
                key={to}
                size="sm"
                variant="outline"
                onClick={() => handlePlanTransition(to)}
                disabled={isPending}
              >
                {isPending ? "Procesando…" : (TRANSITION_LABELS[to] ?? to)}
              </Button>
            ))}
            {destructive.length > 0 && (
              <div className="ml-auto flex items-center gap-2">
                {destructive.map((to) => (
                  <Button
                    key={to}
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handlePlanTransition(to)}
                    disabled={isPending}
                  >
                    {isPending ? "Procesando…" : (TRANSITION_LABELS[to] ?? to)}
                  </Button>
                ))}
              </div>
            )}
            {error && <p className="text-xs text-destructive w-full">{error}</p>}
          </div>
        );
      })()}

      {/* Fechas relevantes al pie */}
      {(plan.completedAt || plan.rejectedAt || plan.canceledAt) && (
        <div className="px-4 py-2 border-t bg-muted/20">
          {plan.completedAt && (
            <p className="text-xs text-muted-foreground">Completado el {fDate(plan.completedAt)}</p>
          )}
          {plan.rejectedAt && (
            <p className="text-xs text-muted-foreground">Rechazado el {fDate(plan.rejectedAt)}</p>
          )}
          {plan.canceledAt && (
            <p className="text-xs text-muted-foreground">Cancelado el {fDate(plan.canceledAt)}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ───────────────────────────────────────────────────

interface Props {
  view: TreatmentPlansPatientView;
  patientId: string;
  permissions: TreatmentPermissions;
}

export function TreatmentPlansSectionClient({ view, patientId, permissions }: Props) {
  const router = useRouter();
  const { plans, activePlan, totalPlans } = view;
  const otherPlans = plans.filter((p) => p.status !== "ACTIVE");
  const hasOpenPlan = plans.some((p) => p.status === "ACTIVE" || p.status === "DRAFT");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const subtitle =
    totalPlans === 0
      ? "Sin planes registrados"
      : activePlan
      ? `Plan activo con ${activePlan.liveItemsCount} ítem${activePlan.liveItemsCount !== 1 ? "s" : ""} vivo${activePlan.liveItemsCount !== 1 ? "s" : ""}`
      : `${totalPlans} plan${totalPlans !== 1 ? "es" : ""} registrado${totalPlans !== 1 ? "s" : ""}`;

  function handleCreatePlan() {
    setError(null);
    startTransition(async () => {
      const result = await createPlanAction(patientId, { patientId });
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Cabecera de sección */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Planes de tratamiento — detalle</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        {permissions.canCreate && !hasOpenPlan && (
          <Button size="sm" variant="outline" onClick={handleCreatePlan} disabled={isPending}>
            {isPending ? "Creando…" : "+ Nuevo plan"}
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {totalPlans === 0 ? (
        <div className="rounded-xl border bg-card ring-1 ring-foreground/10 overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30">
            <h2 className="font-medium text-base">Planes de tratamiento</h2>
          </div>
          <div className="px-4 py-4">
            <TreatmentEmpty />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {activePlan && (
            <PlanCardClient patientId={patientId} plan={activePlan} permissions={permissions} highlighted />
          )}
          {otherPlans.map((plan) => (
            <PlanCardClient key={plan.id} patientId={patientId} plan={plan} permissions={permissions} />
          ))}
        </div>
      )}
    </div>
  );
}
