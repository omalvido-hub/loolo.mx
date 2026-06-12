// NELZZON — Sección "Documentos del paciente" (PATIENT-DOCUMENTS-3A/5A).
// Presentacional puro: consume PatientDocumentSafeItem[] ya resuelto por
// listPatientDocumentsSafeForPatient (dominio 2A/2B). El DTO seguro NUNCA trae
// storageKey, checksum, voidReason, IDs internos de actores ni rutas internas
// — por eso esta vista jamás puede mostrarlos. La descarga (5A) usa el endpoint
// interno /api/patients/[id]/documents/[documentId]/download, sin URLs públicas.

import type { PatientDocumentSafeItem } from "@/server/domain/clinical/patient-documents-views";
import { PatientDocumentUploadForm } from "./PatientDocumentUploadForm";
import { KIND_LABEL, SENSITIVITY_LABEL, RETENTION_LABEL } from "./patient-document-labels";

export { KIND_LABEL, SENSITIVITY_LABEL, RETENTION_LABEL };

const STATUS_LABEL: Record<string, string> = {
  QUARANTINED: "En revisión",
  ACTIVE: "Activo",
  SUPERSEDED: "Reemplazado",
  VOIDED: "Anulado",
};

const STATUS_COLOR: Record<string, string> = {
  QUARANTINED: "bg-amber-100 text-amber-700",
  ACTIVE: "bg-green-100 text-green-700",
  SUPERSEDED: "bg-gray-100 text-gray-600",
  VOIDED: "bg-red-100 text-red-600",
};

const PORTAL_LABEL: Record<string, string> = {
  PRIVATE: "Privado (solo personal)",
  SHARED_TO_PORTAL: "Compartido con el paciente",
  HIDDEN_FROM_PORTAL: "Oculto del portal",
  REVOKED: "Acceso revocado",
};

const LINK_LABEL: Record<string, string> = {
  PATIENT: "Paciente",
  ENCOUNTER: "Consulta",
  ODONTOGRAM_FINDING: "Hallazgo dental",
  TREATMENT_PLAN: "Plan de tratamiento",
  TREATMENT_PLAN_ITEM: "Ítem del plan",
  QUOTE: "Presupuesto",
  PAYMENT: "Pago",
  FUTURE_INVOICE: "Factura",
  PORTAL_UPLOAD: "Subida desde portal",
  FOLLOWUP: "Seguimiento",
};

const FMT_DATETIME = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  dateStyle: "medium",
  timeStyle: "short",
});

function fDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return FMT_DATETIME.format(new Date(iso));
  } catch {
    return "—";
  }
}

function fSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function DocumentRow({
  item,
  patientId,
  canDownload,
}: {
  item: PatientDocumentSafeItem;
  patientId: string;
  canDownload: boolean;
}) {
  const isActive = item.status === "ACTIVE";
  const downloadHref = `/api/patients/${patientId}/documents/${item.documentId}/download`;

  return (
    <div className="border rounded-lg px-3.5 py-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{item.fileName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {KIND_LABEL[item.kind] ?? item.kind} · {fSize(item.sizeBytes)} · {fDateTime(item.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canDownload && isActive && (
            <a
              href={downloadHref}
              download
              className="inline-flex items-center rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted transition-colors"
            >
              Descargar
            </a>
          )}
          <Badge
            label={STATUS_LABEL[item.status] ?? item.status}
            className={STATUS_COLOR[item.status] ?? "bg-gray-100 text-gray-600"}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Badge
          label={RETENTION_LABEL[item.retentionCategory] ?? item.retentionCategory}
          className="bg-slate-100 text-slate-600"
        />
        <Badge
          label={SENSITIVITY_LABEL[item.sensitivityLevel] ?? item.sensitivityLevel}
          className="bg-indigo-50 text-indigo-700"
        />
        <Badge
          label={PORTAL_LABEL[item.portalStatus] ?? item.portalStatus}
          className="bg-sky-50 text-sky-700"
        />
      </div>
      {item.links.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Vinculado a: {item.links.map((l) => LINK_LABEL[l.linkType] ?? l.linkType).join(", ")}
        </p>
      )}
    </div>
  );
}

interface Props {
  items: PatientDocumentSafeItem[];
  patientId: string;
  canUpload: boolean;
  canDownload: boolean;
  storageConfigured: boolean;
}

export function PatientDocumentsSection({ items, patientId, canUpload, canDownload, storageConfigured }: Props) {
  return (
    <div className="rounded-xl border bg-card ring-1 ring-foreground/10 overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30">
        <h2 className="font-medium text-base">Documentos del paciente</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {items.length === 0
            ? "Sin documentos registrados"
            : `${items.length} documento${items.length !== 1 ? "s" : ""} registrado${items.length !== 1 ? "s" : ""}`}
        </p>
      </div>
      <div className="px-4 py-4">
        {items.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Este paciente todavía no tiene documentos registrados.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((item) => (
              <DocumentRow key={item.documentId} item={item} patientId={patientId} canDownload={canDownload} />
            ))}
          </div>
        )}
      </div>
      {canUpload && (
        storageConfigured ? (
          <PatientDocumentUploadForm patientId={patientId} />
        ) : (
          <div className="px-4 pb-4">
            <div className="rounded-lg border border-dashed px-3.5 py-3">
              <p className="text-sm font-medium">Carga de documentos próximamente</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                El almacenamiento seguro aún no está configurado.
              </p>
            </div>
          </div>
        )
      )}
    </div>
  );
}
