"use client";

// NELZZON — Formulario "Subir documento" (PATIENT-DOCUMENTS-4B).
// Solo se renderiza si el actor tiene patient_documents.upload (decide el padre).
// Sube SOLO desde staff interno: sin portal, sin compartir, sin reemplazar/anular,
// sin botón de descarga — esas acciones llegan en fases posteriores con sus
// propios permisos. Tipos aceptados: PDF, JPG, PNG, WEBP — máx. 25 MB.

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { uploadPatientDocumentAction } from "@/server/actions/patient-documents";
import {
  UPLOAD_DOCUMENT_KINDS,
  UPLOAD_SENSITIVITY_LEVELS,
  UPLOAD_RETENTION_CATEGORIES,
} from "@/server/domain/clinical/patient-documents-write-schemas";
import { KIND_LABEL, SENSITIVITY_LABEL, RETENTION_LABEL } from "./patient-document-labels";

const MAX_SIZE_LABEL = "25 MB";
const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  labels,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  labels: Record<string, string>;
  disabled: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {labels[opt] ?? opt}
          </option>
        ))}
      </select>
    </div>
  );
}

interface Props {
  patientId: string;
}

export function PatientDocumentUploadForm({ patientId }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<string>(UPLOAD_DOCUMENT_KINDS[0]);
  const [sensitivityLevel, setSensitivityLevel] = useState<string>(UPLOAD_SENSITIVITY_LEVELS[0]);
  const [retentionCategory, setRetentionCategory] = useState<string>(UPLOAD_RETENTION_CATEGORIES[0]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setKind(UPLOAD_DOCUMENT_KINDS[0]);
    setSensitivityLevel(UPLOAD_SENSITIVITY_LEVELS[0]);
    setRetentionCategory(UPLOAD_RETENTION_CATEGORIES[0]);
    setFileName(null);
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Selecciona un archivo para subir.");
      return;
    }

    const formData = new FormData();
    formData.set("file", file);
    formData.set("kind", kind);
    formData.set("sensitivityLevel", sensitivityLevel);
    formData.set("retentionCategory", retentionCategory);

    startTransition(async () => {
      const result = await uploadPatientDocumentAction(patientId, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess("Documento subido correctamente.");
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <div className="px-4 pb-4">
        <Button size="sm" variant="outline" onClick={() => { setOpen(true); setSuccess(null); }}>
          Subir documento
        </Button>
        {success && <p className="mt-2 text-xs text-green-700">{success}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-3 border-t pt-3">
      <div className="space-y-1">
        <Label htmlFor="patient-document-file" className="text-xs">Archivo</Label>
        <input
          ref={fileInputRef}
          id="patient-document-file"
          type="file"
          accept={ACCEPT}
          disabled={isPending}
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm"
        />
        <p className="text-[11px] text-muted-foreground">
          Formatos permitidos: PDF, JPG, PNG, WEBP — tamaño máximo {MAX_SIZE_LABEL}.
          {fileName && <> Seleccionado: <span className="font-medium">{fileName}</span>.</>}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SelectField
          id="patient-document-kind"
          label="Tipo de documento"
          value={kind}
          onChange={setKind}
          options={UPLOAD_DOCUMENT_KINDS}
          labels={KIND_LABEL}
          disabled={isPending}
        />
        <SelectField
          id="patient-document-sensitivity"
          label="Sensibilidad"
          value={sensitivityLevel}
          onChange={setSensitivityLevel}
          options={UPLOAD_SENSITIVITY_LEVELS}
          labels={SENSITIVITY_LABEL}
          disabled={isPending}
        />
        <SelectField
          id="patient-document-retention"
          label="Categoría de conservación"
          value={retentionCategory}
          onChange={setRetentionCategory}
          options={UPLOAD_RETENTION_CATEGORIES}
          labels={RETENTION_LABEL}
          disabled={isPending}
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Subiendo…" : "Guardar documento"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => { reset(); setOpen(false); }}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
