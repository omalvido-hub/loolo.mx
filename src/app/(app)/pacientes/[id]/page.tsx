import { notFound, redirect } from "next/navigation";
import { requireOrganization, UnauthorizedError, NoOrganizationError } from "@/server/auth/session";
import { getActorContext } from "@/server/auth/context";
import { makeTenantRunner } from "@/server/db/tenant";
import { resolvePatientLiveRecord } from "@/server/domain/patient-record/resolver";
import { listEncountersSafeForPatient } from "@/server/domain/clinical/encounter-views";
import { getOdontogramMasterView } from "@/server/domain/clinical/odontogram-views";
import { getTreatmentPlansSafeView } from "@/server/domain/clinical/treatment-views";
import { getQuotesSafeView } from "@/server/domain/billing/billing-views";
import { listPatientDocumentsSafeForPatient } from "@/server/domain/clinical/patient-documents-views";
import { can } from "@/server/domain/identity/permissions";
import { PatientLiveRecordView, GroupHeading } from "@/components/patients/PatientLiveRecordView";
import { OdontogramMasterSection } from "@/components/odontogram/OdontogramMasterSection";
import { OdontogramNoPermission } from "@/components/odontogram/OdontogramNoPermission";
import { TreatmentPlansSection } from "@/components/treatment/TreatmentPlansSection";
import { TreatmentNoPermission } from "@/components/treatment/TreatmentNoPermission";
import { QuotesSectionClient } from "@/components/billing/QuotesSectionClient";
import { BillingNoPermission } from "@/components/billing/BillingNoPermission";
import { PatientTimeline } from "@/components/patients/PatientTimeline";
import { PatientDocumentsSection } from "@/components/patients/PatientDocumentsSection";
import { PatientDocumentsNoPermission } from "@/components/patients/PatientDocumentsNoPermission";
import { isDocumentStorageConfigured } from "@/server/storage/document-storage";
import type { EncounterListItem } from "@/server/domain/clinical/encounter-views";

export default async function PacienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let organizationId: string;
  let userId: string;

  try {
    const org = await requireOrganization();
    organizationId = org.organizationId;
    userId = org.user.id;
  } catch (e) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      redirect("/login");
    }
    throw e;
  }

  const ctx = await getActorContext(userId, organizationId);
  const run = makeTenantRunner(organizationId);
  const result = await resolvePatientLiveRecord(run, ctx, id);

  if (!result.ok) {
    if (result.reason === "NOT_FOUND" || result.reason === "ARCHIVED") {
      notFound();
    }
    if (result.reason === "FORBIDDEN") {
      return (
        <div className="p-8">
          <p className="text-muted-foreground">Sin acceso a este paciente.</p>
        </div>
      );
    }
    notFound();
  }

  // Permisos FVO para formularios administrativos (UI-7A)
  const fvoPermissions = {
    canEditDemographics: can(ctx.permissions, "patient.demographics.edit"),
    canAddGuardian: can(ctx.permissions, "patient.guardian.edit"),
    canAddEmergencyContact: can(ctx.permissions, "patient.emergency_contact.edit"),
    canManageConsent: can(ctx.permissions, "patient.consent.manage"),
  };

  // Cargar historial de consultas cuando el actor tiene clinical.view
  // (resolver ya lo confirmó si la sección clínica está presente en el resultado).
  let encounters: EncounterListItem[] = [];
  if (result.value.clinical !== undefined) {
    const encResult = await listEncountersSafeForPatient(run, ctx, id);
    if (encResult.ok) {
      encounters = encResult.value.items;
    }
  }

  const canCreateEncounter = can(ctx.permissions, "clinical.create");

  const canVoid = can(ctx.permissions, "odontogram.void");
  const canActOnFindings = can(ctx.permissions, "odontogram.record");

  // Odontograma vigente — UI-4 solo lectura.
  const odoResult = await getOdontogramMasterView(run, ctx, id);

  // Planes de tratamiento — UI-5 solo lectura.
  const treatmentResult = await getTreatmentPlansSafeView(run, ctx, id);

  // Presupuestos y cobros — UI-6.
  const quotesResult = await getQuotesSafeView(run, ctx, id);

  // Documentos del paciente — PATIENT-DOCUMENTS-3A, solo lectura.
  const documentsResult = await listPatientDocumentsSafeForPatient(run, ctx, id);

  // Plan activo + sus ítems (para crear presupuesto desde él).
  const activePlanForBilling =
    treatmentResult.ok && treatmentResult.value.activePlan
      ? {
          id: treatmentResult.value.activePlan.id,
          title: treatmentResult.value.activePlan.title,
          items: treatmentResult.value.activePlan.items,
        }
      : null;

  const activeEncounterId =
    encounters.find((e) => e.status === "IN_PROGRESS" || e.status === "DRAFT")
      ?.encounterId ?? null;

  const odontogramSection = odoResult.ok ? (
    <OdontogramMasterSection
      view={odoResult.value}
      patientId={id}
      activeEncounterId={activeEncounterId}
      canVoid={canVoid}
      canActOnFindings={canActOnFindings}
    />
  ) : odoResult.reason === "FORBIDDEN" ? (
    <OdontogramNoPermission />
  ) : null;

  return (
    <div>
      <PatientLiveRecordView
        record={result.value}
        encounters={encounters}
        patientId={id}
        fvoPermissions={fvoPermissions}
        odontogramSection={odontogramSection}
        canCreateEncounter={canCreateEncounter}
      />
      <div className="px-8 pb-10 max-w-4xl mx-auto space-y-6">
        <div className="pt-2 border-t">
          <GroupHeading
            title="Detalle completo"
            subtitle="Historial cronológico cruzado y módulos extendidos — aquí están las acciones, líneas y registros completos detrás de los resúmenes de arriba."
          />
        </div>
        <PatientTimeline
          encounters={encounters}
          findings={odoResult.ok ? odoResult.value.findingsPanel : []}
          treatmentPlans={treatmentResult.ok ? treatmentResult.value.plans : []}
          quotes={quotesResult.ok ? quotesResult.value.quotes : []}
        />
        {treatmentResult.ok ? (
          <TreatmentPlansSection view={treatmentResult.value} />
        ) : treatmentResult.reason === "FORBIDDEN" ? (
          <TreatmentNoPermission />
        ) : null}
        {quotesResult.ok ? (
          <QuotesSectionClient
            view={quotesResult.value}
            patientId={id}
            activePlan={activePlanForBilling}
            canCreate={can(ctx.permissions, "quote.create")}
            canEdit={can(ctx.permissions, "quote.edit")}
            canPropose={can(ctx.permissions, "quote.propose")}
            canAccept={can(ctx.permissions, "quote.accept")}
            canCancel={can(ctx.permissions, "quote.cancel")}
            canRecordPayment={can(ctx.permissions, "payment.record")}
            canViewPayments={can(ctx.permissions, "payment.view")}
            canReverse={can(ctx.permissions, "payment.reverse")}
          />
        ) : quotesResult.reason === "FORBIDDEN" ? (
          <BillingNoPermission />
        ) : null}
        {documentsResult.ok ? (
          <PatientDocumentsSection
            items={documentsResult.value.items}
            patientId={id}
            canUpload={can(ctx.permissions, "patient_documents.upload")}
            canDownload={can(ctx.permissions, "patient_documents.download")}
            storageConfigured={isDocumentStorageConfigured()}
          />
        ) : documentsResult.reason === "FORBIDDEN" ? (
          <PatientDocumentsNoPermission />
        ) : null}
      </div>
    </div>
  );
}
