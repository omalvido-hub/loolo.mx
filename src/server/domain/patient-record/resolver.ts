// NELZZON — Ficha Viva interna del paciente (Fase 7B). SOLO LECTURA.
// Agrega metadatos de tablas existentes. NO crea tablas. NO es fuente de verdad paralela.
// Filtrado por sección según permisos del rol. Audita cada apertura con patient_record.viewed.
// Denegación de patients.view: auditada en transacción propia (patrón guardConfigOperation).
// Reglas: sin body de notas clínicas; montos en centavos enteros; timeline sin audit_logs crudos.

import { can } from "../identity/permissions.js";
import { recordAudit, recordPermissionDenied } from "../audit/record.js";
import type { ActorContext, TenantRunner, Exec } from "../identity/authorize.js";
import { ok, fail } from "../shared/status.js";
import type { Result } from "../shared/status.js";
import { PatientLiveRecordSchema } from "./schemas.js";
import type { PatientLiveRecord } from "./schemas.js";
import {
  fetchDemographicsSection,
  fetchAddressSection,
  fetchGuardianSection,
  fetchEmergencyContactSection,
  fetchCommercialOriginSection,
  fetchConsentSection,
  fetchMedicalAlertFlag,
  fetchClinicalProfileSection,
  fetchTaxSection,
} from "./fvo-sections.js";

function toIso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

function buildTimeline(
  data: {
    appointments: any[];
    encounters: any[];
    plans: any[];
    quotes: any[];
    payments: any[];
    tasks: any[];
  },
  visibleSections: string[],
): Array<{ eventType: string; label: string; entityId?: string; occurredAt: string }> {
  const events: Array<{ eventType: string; label: string; entityId?: string; occurredAt: string }> = [];

  // Appointments: siempre visibles (sección operative incluida siempre)
  for (const a of data.appointments) {
    const createdAt = toIso(a.createdAt);
    if (createdAt) {
      events.push({ eventType: "appointment.scheduled", label: "Cita agendada", entityId: a.id, occurredAt: createdAt });
    }
    if (a.status === "COMPLETED" && a.completedAt) {
      const at = toIso(a.completedAt);
      if (at) events.push({ eventType: "appointment.completed", label: "Cita completada", entityId: a.id, occurredAt: at });
    }
    if (a.status === "CANCELED" && a.canceledAt) {
      const at = toIso(a.canceledAt);
      if (at) events.push({ eventType: "appointment.canceled", label: "Cita cancelada", entityId: a.id, occurredAt: at });
    }
  }

  // Clinical: solo si clinical visible
  if (visibleSections.includes("clinical")) {
    for (const e of data.encounters) {
      if (e.status === "FINALIZED" && e.finalizedAt) {
        const at = toIso(e.finalizedAt);
        if (at) events.push({ eventType: "encounter.finalized", label: "Consulta finalizada", entityId: e.id, occurredAt: at });
      }
    }
  }

  // Treatment: solo si treatment visible
  if (visibleSections.includes("treatment")) {
    for (const p of data.plans) {
      if (p.proposedAt) {
        const at = toIso(p.proposedAt);
        if (at) events.push({ eventType: "treatment.plan_proposed", label: "Plan de tratamiento propuesto", entityId: p.id, occurredAt: at });
      }
      if (p.status === "ACCEPTED" && p.acceptedAt) {
        const at = toIso(p.acceptedAt);
        if (at) events.push({ eventType: "treatment.plan_accepted", label: "Plan de tratamiento aceptado", entityId: p.id, occurredAt: at });
      }
    }
  }

  // Financial: solo si financial visible
  if (visibleSections.includes("financial")) {
    for (const q of data.quotes) {
      if (q.proposedAt) {
        const at = toIso(q.proposedAt);
        if (at) events.push({ eventType: "quote.proposed", label: "Presupuesto propuesto", entityId: q.id, occurredAt: at });
      }
      if (q.status === "ACCEPTED" && q.acceptedAt) {
        const at = toIso(q.acceptedAt);
        if (at) events.push({ eventType: "quote.accepted", label: "Presupuesto aceptado", entityId: q.id, occurredAt: at });
      }
    }
    for (const p of data.payments) {
      const at = toIso(p.paidAt);
      if (at) {
        if (p.entryKind === "PAYMENT") {
          events.push({ eventType: "payment.recorded", label: "Pago registrado", entityId: p.id, occurredAt: at });
        } else if (p.entryKind === "REVERSAL") {
          events.push({ eventType: "payment.reversed", label: "Pago revertido", entityId: p.id, occurredAt: at });
        }
      }
    }
  }

  // Tasks: solo si tasks visible
  if (visibleSections.includes("tasks")) {
    for (const t of data.tasks) {
      if (t.status === "DONE" && t.completedAt) {
        const at = toIso(t.completedAt);
        if (at) events.push({ eventType: "task.completed", label: "Tarea completada", entityId: t.id, occurredAt: at });
      }
    }
  }

  events.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  return events;
}

async function fetchOperative(exec: Exec, patientId: string, contactId: string): Promise<{
  appointments: any[];
  nextAppointment: any | null;
  lastAppointment: any | null;
  openConversationsCount: number;
  openTasksCount: number;
  lastActivityAt: string | null;
}> {
  const now = new Date();

  const allAppts: any[] = await exec(
    `SELECT "id", "startAt", "endAt", "status", "reason", "completedAt", "canceledAt", "createdAt"
     FROM "appointments"
     WHERE "patientId"=$1
     ORDER BY "startAt" ASC`,
    [patientId],
  );

  const futureScheduled = allAppts.filter((a) => a.status === "SCHEDULED" && new Date(a.startAt) >= now);
  const past = allAppts.filter((a) => new Date(a.startAt) < now).sort(
    (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
  );

  const nextAppointment = futureScheduled[0] ?? null;
  const lastAppointment = past[0] ?? null;

  const openConvRow = (await exec(
    `SELECT COUNT(*) as c FROM "conversations" WHERE "contactId"=$1 AND "status"='OPEN'`,
    [contactId],
  ))[0];
  const openConversationsCount = Number(openConvRow?.c ?? 0);

  const openTaskRow = (await exec(
    `SELECT COUNT(*) as c
     FROM "conversation_tasks" ct
     JOIN "conversations" cv ON cv."id"=ct."conversationId"
     WHERE cv."contactId"=$1 AND ct."status"='OPEN'`,
    [contactId],
  ))[0];
  const openTasksCount = Number(openTaskRow?.c ?? 0);

  const lastConvRow = (await exec(
    `SELECT MAX("lastMessageAt") as m FROM "conversations" WHERE "contactId"=$1`,
    [contactId],
  ))[0];
  const lastConvAt = lastConvRow?.m ? new Date(lastConvRow.m) : null;
  const lastApptAt = allAppts.length > 0 ? new Date(allAppts[allAppts.length - 1].startAt) : null;

  let lastActivityDate: Date | null = null;
  for (const d of [lastConvAt, lastApptAt]) {
    if (d && (!lastActivityDate || d > lastActivityDate)) lastActivityDate = d;
  }

  return {
    appointments: allAppts,
    nextAppointment,
    lastAppointment,
    openConversationsCount,
    openTasksCount,
    lastActivityAt: toIso(lastActivityDate),
  };
}

/**
 * Resuelve la Ficha Viva interna del paciente (solo lectura).
 * Requiere patients.view. Filtra secciones por permisos del rol.
 * Audita la apertura con patient_record.viewed.
 * Denegación de patients.view auditada en transacción propia.
 */
export async function resolvePatientLiveRecord(
  run: TenantRunner,
  ctx: ActorContext,
  patientId: string,
): Promise<Result<PatientLiveRecord>> {
  // Fail-closed: permiso de entrada
  if (!can(ctx.permissions, "patients.view")) {
    await run(async (exec) => {
      await recordPermissionDenied(exec, {
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        permission: "patients.view",
        entityType: "patient",
        entityId: patientId,
      });
    });
    return fail<PatientLiveRecord>("FORBIDDEN", "Falta el permiso: patients.view");
  }

  return run(async (exec): Promise<Result<PatientLiveRecord>> => {
    // Cargar paciente + contacto
    const rows = await exec(
      `SELECT p."id", p."contactId", p."status", p."state", p."source", p."archivedAt", p."deletedAt", p."createdAt",
              c."fullName", c."phone", c."email", c."phoneNormalized", c."emailNormalized"
       FROM "patients" p
       JOIN "contacts" c ON c."id"=p."contactId"
       WHERE p."id"=$1`,
      [patientId],
    );

    if (rows.length === 0) return fail<PatientLiveRecord>("NOT_FOUND", "Paciente no encontrado.");

    const patient = rows[0];

    if (patient.state === "ARCHIVED" || patient.archivedAt || patient.deletedAt) {
      return fail<PatientLiveRecord>("ARCHIVED", "Paciente archivado o eliminado.");
    }

    // — identity
    const identity = {
      patientId: patient.id,
      contactId: patient.contactId,
      fullName: patient.fullName ?? null,
      phone: patient.phone ?? null,
      email: patient.email ?? null,
      phoneNormalized: patient.phoneNormalized ?? null,
      emailNormalized: patient.emailNormalized ?? null,
      source: patient.source ?? null,
      patientStatus: patient.status,
      patientState: patient.state,
      archivedAt: toIso(patient.archivedAt),
      createdAt: toIso(patient.createdAt) ?? new Date().toISOString(),
    };

    // — operative
    const op = await fetchOperative(exec, patientId, patient.contactId);
    const operative = {
      nextAppointment: op.nextAppointment
        ? { id: op.nextAppointment.id, startAt: toIso(op.nextAppointment.startAt) ?? "", status: op.nextAppointment.status, reason: op.nextAppointment.reason ?? null }
        : null,
      lastAppointment: op.lastAppointment
        ? { id: op.lastAppointment.id, startAt: toIso(op.lastAppointment.startAt) ?? "", status: op.lastAppointment.status, reason: op.lastAppointment.reason ?? null }
        : null,
      openConversationsCount: op.openConversationsCount,
      openTasksCount: op.openTasksCount,
      lastActivityAt: op.lastActivityAt,
    };

    const visibleSections: string[] = ["identity", "operative"];
    const timelineData = { appointments: op.appointments, encounters: [] as any[], plans: [] as any[], quotes: [] as any[], payments: [] as any[], tasks: [] as any[] };

    // — clinical (requiere clinical.view)
    let clinical: any = undefined;
    if (can(ctx.permissions, "clinical.view")) {
      const encounters: any[] = await exec(
        `SELECT "id", "status", "createdAt", "finalizedAt"
         FROM "clinical_encounters" WHERE "patientId"=$1 ORDER BY "createdAt" DESC`,
        [patientId],
      );
      // Solo metadatos de notas: conteo y fecha. NUNCA body.
      const notesRow = (await exec(
        `SELECT COUNT(*) as c, MAX(n."createdAt") as "lastAt"
         FROM "clinical_notes" n
         JOIN "clinical_encounters" e ON e."id"=n."encounterId"
         WHERE e."patientId"=$1`,
        [patientId],
      ))[0];
      clinical = {
        encountersCount: encounters.length,
        lastEncounterAt: encounters[0] ? toIso(encounters[0].createdAt) : null,
        lastEncounterStatus: encounters[0]?.status ?? null,
        notesCount: Number(notesRow?.c ?? 0),
        lastNoteAt: notesRow?.lastAt ? toIso(notesRow.lastAt) : null,
      };
      visibleSections.push("clinical");
      timelineData.encounters = encounters;
    }

    // — odontogramSummary (requiere odontogram.view)
    let odontogramSummary: any = undefined;
    if (can(ctx.permissions, "odontogram.view")) {
      const findings: any[] = await exec(
        `SELECT "toothStatus", COUNT(*) as c FROM "odontogram_findings" WHERE "patientId"=$1 GROUP BY "toothStatus"`,
        [patientId],
      );
      const findingsByStatus: Record<string, number> = {};
      let totalFindings = 0;
      for (const r of findings) {
        findingsByStatus[r.toothStatus] = Number(r.c);
        totalFindings += Number(r.c);
      }
      odontogramSummary = { totalFindings, findingsByStatus };
      visibleSections.push("odontogramSummary");
    }

    // — treatment (requiere treatment.view)
    let treatment: any = undefined;
    if (can(ctx.permissions, "treatment.view")) {
      const plans: any[] = await exec(
        `SELECT "id", "status", "proposedAt", "acceptedAt", "createdAt"
         FROM "treatment_plans" WHERE "patientId"=$1 ORDER BY "createdAt" DESC`,
        [patientId],
      );
      const activePlan = plans.find((p) => p.status === "ACTIVE") ?? null;
      const itemsByStatus: Record<string, number> = {};
      if (activePlan) {
        const items: any[] = await exec(
          `SELECT "status", COUNT(*) as c FROM "treatment_plan_items" WHERE "planId"=$1 GROUP BY "status"`,
          [activePlan.id],
        );
        for (const r of items) itemsByStatus[r.status] = Number(r.c);
      }
      treatment = {
        activePlanId: activePlan?.id ?? null,
        activePlanStatus: activePlan?.status ?? null,
        plansCount: plans.length,
        itemsByStatus,
      };
      visibleSections.push("treatment");
      timelineData.plans = plans;
    }

    // — financial (requiere quote.view + payment.view)
    let financial: any = undefined;
    if (can(ctx.permissions, "quote.view") && can(ctx.permissions, "payment.view")) {
      const quotes: any[] = await exec(
        `SELECT "id", "status", "totalCents", "proposedAt", "acceptedAt"
         FROM "quotes" WHERE "patientId"=$1`,
        [patientId],
      );
      const payments: any[] = await exec(
        `SELECT "id", "entryKind", "amountCents", "paidAt"
         FROM "payments" WHERE "patientId"=$1 ORDER BY "paidAt" ASC`,
        [patientId],
      );

      let paidCents = 0;
      let hasReversals = false;
      for (const p of payments) {
        const amt = Number(p.amountCents);
        if (p.entryKind === "PAYMENT") paidCents += amt;
        else if (p.entryKind === "REVERSAL") { paidCents -= amt; hasReversals = true; }
      }

      const quotesByStatus: Record<string, number> = {};
      let totalProposedCents = 0;
      let totalAcceptedCents = 0;
      for (const q of quotes) {
        quotesByStatus[q.status] = (quotesByStatus[q.status] ?? 0) + 1;
        const total = Number(q.totalCents);
        if (q.status === "PROPOSED") totalProposedCents += total;
        if (q.status === "ACCEPTED") totalAcceptedCents += total;
      }
      const balanceCents = totalAcceptedCents - paidCents;

      financial = {
        quotesCount: quotes.length,
        quotesByStatus,
        totalProposedCents,
        totalAcceptedCents,
        balanceCents,
        paidCents,
        hasReversals,
      };
      visibleSections.push("financial");
      timelineData.quotes = quotes;
      timelineData.payments = payments;
    }

    // — tasks (requiere tasks.view)
    let tasks: any = undefined;
    if (can(ctx.permissions, "tasks.view")) {
      const taskRows: any[] = await exec(
        `SELECT ct."id", ct."title", ct."status", ct."dueAt", ct."conversationId", ct."completedAt"
         FROM "conversation_tasks" ct
         JOIN "conversations" cv ON cv."id"=ct."conversationId"
         WHERE cv."contactId"=$1
         ORDER BY ct."dueAt" ASC NULLS LAST, ct."createdAt" DESC`,
        [patient.contactId],
      );
      timelineData.tasks = taskRows;
      tasks = taskRows
        .filter((t) => t.status === "OPEN")
        .map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          dueAt: toIso(t.dueAt),
          conversationId: t.conversationId,
        }));
      visibleSections.push("tasks");
    }

    // ── FVO-1: secciones extendidas del perfil del paciente ──

    // Demográficos, domicilio, tutor, contacto emergencia, origen comercial, consentimiento
    // y bandera de alerta médica → patient.demographics.view
    let demographics: any = undefined;
    let address: any = undefined;
    let guardian: any = undefined;
    let emergencyContact: any = undefined;
    let commercialOrigin: any = undefined;
    let consent: any = undefined;
    let medicalAlertFlag: any = undefined;

    if (can(ctx.permissions, "patient.demographics.view")) {
      demographics = await fetchDemographicsSection(exec, patientId);
      address = await fetchAddressSection(exec, patientId);
      guardian = await fetchGuardianSection(exec, patientId);
      emergencyContact = await fetchEmergencyContactSection(exec, patientId);
      commercialOrigin = await fetchCommercialOriginSection(exec, patientId);
      consent = await fetchConsentSection(exec, patientId);
      medicalAlertFlag = await fetchMedicalAlertFlag(exec, patientId);
      visibleSections.push("demographics");
    }

    // Perfil clínico completo + detalle de alertas → patient.clinical_profile.view
    let clinicalProfile: any = undefined;
    if (can(ctx.permissions, "patient.clinical_profile.view")) {
      clinicalProfile = await fetchClinicalProfileSection(exec, patientId);
      visibleSections.push("clinicalProfile");
    }

    // Datos fiscales del paciente → patient.tax.view
    let tax: any = undefined;
    if (can(ctx.permissions, "patient.tax.view")) {
      tax = await fetchTaxSection(exec, patientId);
      visibleSections.push("tax");
    }

    // — timeline (solo eventos de negocio seguros de secciones visibles)
    const timeline = buildTimeline(timelineData, visibleSections);

    // — acciones recomendadas deterministas (sin IA, sin ejecutar)
    const recommendedActions: Array<{ code: string; reason: string }> = [];
    if (!operative.nextAppointment) {
      recommendedActions.push({ code: "schedule_appointment", reason: "El paciente no tiene próxima cita agendada." });
    }
    if (financial) {
      const proposedCount = financial.quotesByStatus["PROPOSED"] ?? 0;
      if (proposedCount > 0) {
        recommendedActions.push({ code: "accept_quote", reason: `Hay ${proposedCount} presupuesto(s) propuesto(s) sin aceptar.` });
      }
      if (financial.balanceCents > 0) {
        recommendedActions.push({ code: "record_payment", reason: `Saldo pendiente: ${financial.balanceCents} centavos.` });
      }
    }

    // — auditar apertura (UNA entrada; sin contenido sensible)
    await recordAudit(exec, {
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      actorType: "USER",
      action: "patient_record.viewed",
      entityType: "patient",
      entityId: patientId,
      metadata: { patientId, visibleSections, timestamp: new Date().toISOString() },
    });

    const record = PatientLiveRecordSchema.parse({
      identity,
      operative,
      clinical,
      odontogramSummary,
      treatment,
      financial,
      tasks,
      timeline,
      recommendedActions,
      _meta: {
        resolvedAt: new Date().toISOString(),
        visibleSections,
        patientState: patient.state,
      },
      // FVO-1: secciones extendidas (undefined cuando no aplica el permiso)
      demographics,
      address: address ?? undefined,
      guardian: guardian ?? undefined,
      emergencyContact: emergencyContact ?? undefined,
      commercialOrigin: commercialOrigin ?? undefined,
      consent: consent ?? undefined,
      medicalAlertFlag,
      clinicalProfile,
      tax: tax ?? undefined,
    });

    return ok(record);
  });
}
