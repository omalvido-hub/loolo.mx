"use client";

// Vista de detalle de consulta clínica — interactiva (NELZZON-ENCOUNTERS-1B-UI).
// Orquesta: iniciar, editar contenido clínico, agregar nota (append-only),
// finalizar y cancelar. Todo fluye por Server Actions → revalidatePath → router.refresh().
// FINALIZED/CANCELED se muestran bloqueadas de forma explícita — son registros inmutables.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EncounterStatusBadge } from "./EncounterStatusBadge";
import { ClinicalNotesSummary } from "./ClinicalNotesSummary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  startEncounterAction,
  updateEncounterAction,
  addClinicalNoteAction,
  finalizeEncounterAction,
  cancelEncounterAction,
} from "@/server/actions/encounters";
import type { EncounterSafeView } from "@/server/domain/clinical/encounter-views";

const FMT_DATE = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  dateStyle: "medium",
});

const FMT_DATETIME = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  dateStyle: "medium",
  timeStyle: "short",
});

function fDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try { return FMT_DATE.format(new Date(iso)); } catch { return "—"; }
}

function fDatetime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try { return FMT_DATETIME.format(new Date(iso)); } catch { return "—"; }
}

const EDITABLE_STATUSES = new Set(["DRAFT", "IN_PROGRESS"]);
const NOTE_MAX = 5000;

const TEXTAREA_CLASS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none " +
  "focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50";

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
}

function SectionCard({ title, children }: SectionCardProps) {
  return (
    <div className="rounded-xl border bg-card ring-1 ring-foreground/10 overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30">
        <h2 className="font-medium text-base">{title}</h2>
      </div>
      <div className="px-4 py-4 space-y-3">{children}</div>
    </div>
  );
}

interface RowProps { label: string; value: React.ReactNode }
function Row({ label, value }: RowProps) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="w-44 shrink-0 text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  );
}

interface Props {
  view: EncounterSafeView;
  patientId: string;
  canEdit: boolean;
  canAddNote: boolean;
  canFinalize: boolean;
  canCancel: boolean;
}

export function EncounterDetailView({
  view,
  patientId,
  canEdit,
  canAddNote,
  canFinalize,
  canCancel,
}: Props) {
  const router = useRouter();
  const isEditableStatus = EDITABLE_STATUSES.has(view.status);

  // ── Ciclo de vida: iniciar / finalizar / cancelar ─────────────────────────
  const [isLifecyclePending, startLifecycle] = useTransition();
  const [confirmAction, setConfirmAction] = useState<"finalize" | "cancel" | null>(null);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);

  function handleStart() {
    setLifecycleError(null);
    startLifecycle(async () => {
      const result = await startEncounterAction(patientId, view.encounterId);
      if (!result.ok) { setLifecycleError(result.error); return; }
      router.refresh();
    });
  }

  function handleConfirmLifecycle() {
    if (!confirmAction) return;
    setLifecycleError(null);
    const action = confirmAction === "finalize" ? finalizeEncounterAction : cancelEncounterAction;
    startLifecycle(async () => {
      const result = await action(patientId, view.encounterId);
      if (!result.ok) { setLifecycleError(result.error); return; }
      setConfirmAction(null);
      router.refresh();
    });
  }

  // ── Contenido clínico editable ────────────────────────────────────────────
  const [isContentPending, startContent] = useTransition();
  const [editingContent, setEditingContent] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [contentForm, setContentForm] = useState({
    chiefComplaint: view.chiefComplaint,
    preliminaryDiagnosis: view.preliminaryDiagnosis ?? "",
    observations: view.observations ?? "",
    indications: view.indications ?? "",
  });

  function openEditContent() {
    setContentForm({
      chiefComplaint: view.chiefComplaint,
      preliminaryDiagnosis: view.preliminaryDiagnosis ?? "",
      observations: view.observations ?? "",
      indications: view.indications ?? "",
    });
    setContentError(null);
    setEditingContent(true);
  }

  function handleSaveContent() {
    const chiefComplaint = contentForm.chiefComplaint.trim();
    if (!chiefComplaint) {
      setContentError("El motivo de consulta no puede quedar vacío.");
      return;
    }
    setContentError(null);
    startContent(async () => {
      const result = await updateEncounterAction(patientId, {
        encounterId: view.encounterId,
        chiefComplaint,
        preliminaryDiagnosis: contentForm.preliminaryDiagnosis.trim() || undefined,
        observations: contentForm.observations.trim() || undefined,
        indications: contentForm.indications.trim() || undefined,
      });
      if (!result.ok) { setContentError(result.error); return; }
      setEditingContent(false);
      router.refresh();
    });
  }

  // ── Notas clínicas (append-only) ──────────────────────────────────────────
  const [isNotePending, startNote] = useTransition();
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);

  function handleAddNote() {
    const body = noteDraft.trim();
    if (!body) {
      setNoteError("Escribe el contenido de la nota.");
      return;
    }
    setNoteError(null);
    startNote(async () => {
      const result = await addClinicalNoteAction(patientId, { encounterId: view.encounterId, body });
      if (!result.ok) { setNoteError(result.error); return; }
      setNoteDraft("");
      setShowNoteForm(false);
      router.refresh();
    });
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      {/* Navegación */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/pacientes" className="hover:text-foreground transition-colors">Pacientes</Link>
        <span>/</span>
        <Link href={`/pacientes/${patientId}`} className="hover:text-foreground transition-colors">Ficha</Link>
        <span>/</span>
        <span className="text-foreground">Consulta</span>
      </div>

      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{view.chiefComplaint}</h1>
          <p className="text-sm text-muted-foreground mt-1">Creada el {fDate(view.createdAt)}</p>
        </div>
        <EncounterStatusBadge status={view.status} />
      </div>

      {/* Aviso de bloqueo permanente — claridad visual sobre inmutabilidad */}
      {!isEditableStatus && (
        <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          {view.status === "FINALIZED" ? (
            <>Esta consulta fue <span className="font-medium text-foreground">finalizada</span> el {fDatetime(view.finalizedAt)}. Su contenido y notas quedan bloqueados de forma permanente: es un registro clínico inmutable.</>
          ) : (
            <>Esta consulta fue <span className="font-medium text-foreground">cancelada</span> el {fDatetime(view.canceledAt)}. No puede editarse ni reabrirse.</>
          )}
        </div>
      )}

      {/* Barra de acciones de ciclo de vida */}
      {isEditableStatus && (canEdit || canFinalize || canCancel) && !confirmAction && (
        <div className="flex flex-wrap items-center gap-2">
          {view.status === "DRAFT" && canEdit && (
            <Button size="sm" onClick={handleStart} disabled={isLifecyclePending}>
              {isLifecyclePending ? "Iniciando…" : "Iniciar consulta"}
            </Button>
          )}
          {canFinalize && (
            <Button size="sm" variant="outline" onClick={() => setConfirmAction("finalize")} disabled={isLifecyclePending}>
              Finalizar consulta
            </Button>
          )}
          {canCancel && (
            <Button size="sm" variant="ghost" onClick={() => setConfirmAction("cancel")} disabled={isLifecyclePending}>
              Cancelar consulta
            </Button>
          )}
        </div>
      )}

      {/* Confirmación inline — finalizar / cancelar */}
      {confirmAction && (
        <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
          <p className="text-sm font-medium">
            {confirmAction === "finalize"
              ? "¿Finalizar esta consulta? Quedará bloqueada de forma permanente: no podrá editarse ni se podrán agregar más notas."
              : "¿Cancelar esta consulta? Quedará marcada como cancelada de forma permanente y no podrá reabrirse."}
          </p>
          {lifecycleError && <p className="text-sm text-destructive">{lifecycleError}</p>}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={confirmAction === "finalize" ? "default" : "destructive"}
              onClick={handleConfirmLifecycle}
              disabled={isLifecyclePending}
            >
              {isLifecyclePending ? "Guardando…" : confirmAction === "finalize" ? "Sí, finalizar" : "Sí, cancelar"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setConfirmAction(null); setLifecycleError(null); }} disabled={isLifecyclePending}>
              Volver
            </Button>
          </div>
        </div>
      )}

      {/* Datos generales */}
      <SectionCard title="Información de la consulta">
        <Row label="Estado" value={<EncounterStatusBadge status={view.status} />} />
        <Row label="Profesional" value={view.professionalName} />
        <Row label="Motivo de consulta" value={view.chiefComplaint} />
        <Row label="Inicio" value={fDatetime(view.startedAt)} />
        <Row label="Finalización" value={fDatetime(view.finalizedAt)} />
        {view.canceledAt && <Row label="Cancelación" value={fDatetime(view.canceledAt)} />}
        <Row label="Creada" value={fDatetime(view.createdAt)} />
      </SectionCard>

      {/* Contenido clínico — editable mientras DRAFT/IN_PROGRESS */}
      <SectionCard title="Contenido clínico">
        {editingContent ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Motivo de consulta *</label>
              <Input
                value={contentForm.chiefComplaint}
                onChange={(e) => setContentForm((f) => ({ ...f, chiefComplaint: e.target.value }))}
                disabled={isContentPending}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Diagnóstico preliminar</label>
              <textarea
                className={TEXTAREA_CLASS}
                rows={2}
                value={contentForm.preliminaryDiagnosis}
                onChange={(e) => setContentForm((f) => ({ ...f, preliminaryDiagnosis: e.target.value }))}
                disabled={isContentPending}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Observaciones</label>
              <textarea
                className={TEXTAREA_CLASS}
                rows={2}
                value={contentForm.observations}
                onChange={(e) => setContentForm((f) => ({ ...f, observations: e.target.value }))}
                disabled={isContentPending}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Indicaciones</label>
              <textarea
                className={TEXTAREA_CLASS}
                rows={2}
                value={contentForm.indications}
                onChange={(e) => setContentForm((f) => ({ ...f, indications: e.target.value }))}
                disabled={isContentPending}
              />
            </div>
            {contentError && <p className="text-sm text-destructive">{contentError}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveContent} disabled={isContentPending}>
                {isContentPending ? "Guardando…" : "Guardar cambios"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditingContent(false); setContentError(null); }} disabled={isContentPending}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <>
            {view.preliminaryDiagnosis && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Diagnóstico preliminar</p>
                <p className="text-sm whitespace-pre-wrap">{view.preliminaryDiagnosis}</p>
              </div>
            )}
            {view.observations && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Observaciones</p>
                <p className="text-sm whitespace-pre-wrap">{view.observations}</p>
              </div>
            )}
            {view.indications && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Indicaciones</p>
                <p className="text-sm whitespace-pre-wrap">{view.indications}</p>
              </div>
            )}
            {!view.preliminaryDiagnosis && !view.observations && !view.indications && (
              <p className="text-sm text-muted-foreground">Sin contenido clínico registrado.</p>
            )}
            {isEditableStatus && canEdit && (
              <div className="pt-1">
                <Button size="sm" variant="outline" onClick={openEditContent}>
                  Editar contenido
                </Button>
              </div>
            )}
          </>
        )}
      </SectionCard>

      {/* Notas clínicas — append-only: no se editan ni se borran */}
      <SectionCard title="Notas clínicas">
        <ClinicalNotesSummary summary={view.notesSummary} />
        {isEditableStatus && canAddNote && (
          showNoteForm ? (
            <div className="space-y-2 pt-3 border-t">
              <textarea
                className={TEXTAREA_CLASS}
                rows={3}
                maxLength={NOTE_MAX}
                placeholder="Escribe la nota clínica…"
                value={noteDraft}
                onChange={(e) => { setNoteDraft(e.target.value); setNoteError(null); }}
                disabled={isNotePending}
              />
              <p className="text-xs text-muted-foreground">
                {noteDraft.length}/{NOTE_MAX} caracteres — las notas son un registro permanente: no se pueden editar ni eliminar.
              </p>
              {noteError && <p className="text-sm text-destructive">{noteError}</p>}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddNote} disabled={isNotePending}>
                  {isNotePending ? "Guardando…" : "Agregar nota"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowNoteForm(false); setNoteDraft(""); setNoteError(null); }} disabled={isNotePending}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="pt-3 border-t">
              <Button size="sm" variant="outline" onClick={() => setShowNoteForm(true)}>
                + Agregar nota
              </Button>
            </div>
          )
        )}
      </SectionCard>
    </div>
  );
}
