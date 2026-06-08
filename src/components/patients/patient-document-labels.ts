// NELZZON — Etiquetas compartidas de documentos del paciente (PATIENT-DOCUMENTS-4B).
// Extraídas a un módulo propio para que la sección de solo lectura y el
// formulario de carga compartan las mismas etiquetas sin import circular
// entre PatientDocumentsSection.tsx y PatientDocumentUploadForm.tsx.

export const KIND_LABEL: Record<string, string> = {
  CLINICAL: "Clínico",
  RADIOGRAPH: "Radiografía",
  INTRAORAL_IMAGE: "Imagen intraoral",
  EXTERNAL_STUDY: "Estudio externo",
  CLINICAL_EVIDENCE: "Evidencia clínica",
  ADMINISTRATIVE: "Administrativo",
  CONSENT: "Consentimiento",
  PRESCRIPTION: "Receta / indicación",
  FINANCIAL: "Financiero",
  GENERATED: "Generado por el sistema",
  OTHER: "Otro",
};

export const SENSITIVITY_LABEL: Record<string, string> = {
  NORMAL: "Normal",
  SENSITIVE_CLINICAL: "Clínico sensible",
  SENSITIVE_FINANCIAL: "Financiero sensible",
  SENSITIVE_PERSONAL: "Personal sensible",
};

export const RETENTION_LABEL: Record<string, string> = {
  CLINICAL_RECORD: "Expediente clínico",
  FINANCIAL_RECORD: "Registro financiero",
  ADMINISTRATIVE: "Administrativo",
  CONSENT: "Consentimiento",
  TEMPORARY: "Temporal",
};
