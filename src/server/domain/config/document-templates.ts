// LOOLO — Plantillas de Documentos (Fase 7A). kind ∈ enum cerrado. Variables en allowlist.
// No colisiona con BusinessTemplate/TemplateModule (onboarding de verticales).

import { authorize } from "../identity/authorize.js";
import type { Exec, ActorContext } from "../identity/authorize.js";
import { recordAudit } from "../audit/record.js";
import {
  parseOrThrow, CreateDocumentTemplateInputZ, UpdateDocumentTemplateInputZ,
  type DocumentTemplateKindType,
} from "./schemas.js";

export class DocumentTemplateNotFoundError extends Error {
  constructor(id: string) { super(`Plantilla no encontrada: ${id}`); this.name = "DocumentTemplateNotFoundError"; }
}

export async function createDocumentTemplate(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "catalog.manage");
  const input = parseOrThrow(CreateDocumentTemplateInputZ, raw);
  const { organizationId, userId } = ctx;
  const row = (await exec(
    `INSERT INTO "document_templates"("organizationId","kind","name","body","variables","active")
     VALUES ($1,$2,$3,$4,$5::jsonb,true) RETURNING "id"`,
    [organizationId, input.kind, input.name, input.body, JSON.stringify(input.variables)],
  ))[0];
  await recordAudit(exec, { organizationId, actorUserId: userId, actorType: "USER",
    action: "document_template.created", entityType: "document_templates", entityId: row.id,
    metadata: { kind: input.kind } });
  return { templateId: row.id };
}

export async function updateDocumentTemplate(exec: Exec, ctx: ActorContext, templateId: string, raw: unknown) {
  authorize(ctx, "catalog.manage");
  const input = parseOrThrow(UpdateDocumentTemplateInputZ, raw);
  const { organizationId, userId } = ctx;
  const existing = (await exec(
    `SELECT "id" FROM "document_templates" WHERE "id"=$1 AND "organizationId"=$2`,
    [templateId, organizationId],
  ))[0];
  if (!existing) throw new DocumentTemplateNotFoundError(templateId);
  const updates: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (input.name !== undefined) { updates.push(`"name"=$${i++}`); params.push(input.name); }
  if (input.body !== undefined) { updates.push(`"body"=$${i++}`); params.push(input.body); }
  if (input.variables !== undefined) { updates.push(`"variables"=$${i++}::jsonb`); params.push(JSON.stringify(input.variables)); }
  if (updates.length === 0) return { templateId };
  updates.push(`"updatedAt"=now()`);
  params.push(templateId, organizationId);
  await exec(
    `UPDATE "document_templates" SET ${updates.join(",")} WHERE "id"=$${i++} AND "organizationId"=$${i}`,
    params,
  );
  await recordAudit(exec, { organizationId, actorUserId: userId, actorType: "USER",
    action: "document_template.updated", entityType: "document_templates", entityId: templateId, metadata: {} });
  return { templateId };
}

export async function deactivateDocumentTemplate(exec: Exec, ctx: ActorContext, templateId: string) {
  authorize(ctx, "catalog.manage");
  const { organizationId, userId } = ctx;
  const existing = (await exec(`SELECT "id" FROM "document_templates" WHERE "id"=$1 AND "organizationId"=$2`, [templateId, organizationId]))[0];
  if (!existing) throw new DocumentTemplateNotFoundError(templateId);
  await exec(`UPDATE "document_templates" SET "active"=false,"updatedAt"=now() WHERE "id"=$1 AND "organizationId"=$2`, [templateId, organizationId]);
  await recordAudit(exec, { organizationId, actorUserId: userId, actorType: "USER",
    action: "document_template.deactivated", entityType: "document_templates", entityId: templateId, metadata: {} });
  return { templateId };
}

export async function listDocumentTemplates(exec: Exec, ctx: ActorContext, kind?: DocumentTemplateKindType) {
  authorize(ctx, "config.view");
  const { organizationId } = ctx;
  const rows = kind
    ? await exec(
        `SELECT "id","kind","name","variables","active" FROM "document_templates"
         WHERE "organizationId"=$1 AND "kind"=$2 AND "active"=true ORDER BY "name"`,
        [organizationId, kind],
      )
    : await exec(
        `SELECT "id","kind","name","variables","active" FROM "document_templates"
         WHERE "organizationId"=$1 AND "active"=true ORDER BY "kind","name"`,
        [organizationId],
      );
  return rows.map((r: any) => ({
    id: r.id, kind: r.kind as DocumentTemplateKindType,
    name: r.name, variables: r.variables as string[], active: r.active,
  }));
}
