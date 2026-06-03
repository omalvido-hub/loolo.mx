// LOOLO — Aplicar plantilla a una organizacion (Fase 2B-1).
// ENFORCEMENT: requiere templates.apply (authorize() antes de escribir nada).
// Idempotente y NO destructivo: solo siembra los modulos faltantes (ON CONFLICT DO NOTHING).
// Emite template.applied (evento operativo) y lo audita. Executor tenant-scoped (RLS).

import { validateEvent } from "../events/schemas.js";
import { recordAudit } from "../audit/record.js";
import { authorize } from "../identity/authorize.js";
import type { Exec, ActorContext } from "../identity/authorize.js";

export interface ApplyTemplateInput {
  templateKey: string;
}

export async function applyTemplateToOrganization(exec: Exec, ctx: ActorContext, input: ApplyTemplateInput) {
  // 0) Enforcement ANTES de cualquier escritura.
  authorize(ctx, "templates.apply");

  const { organizationId, userId } = ctx;
  const { templateKey } = input;

  const tpl = (await exec(`SELECT "id","version" FROM "business_templates" WHERE "key"=$1 AND "status"='active'`, [templateKey]))[0];
  if (!tpl) throw new Error(`Plantilla no encontrada: ${templateKey}`);

  const tms = await exec(
    `SELECT "moduleId","defaultEnabled","defaultVisible","defaultShowInMenu",
            "defaultShowInDock","defaultDashboardAvailable","menuSortOrder","labelOverride","iconKey"
     FROM "template_modules" WHERE "templateId"=$1`,
    [tpl.id],
  );

  let created = 0;
  for (const tm of tms) {
    const inserted = await exec(
      `INSERT INTO "organization_modules"
        ("organizationId","moduleId","templateId","appliedTemplateVersion",
         "enabled","visible","showInMenu","showInDock","dashboardAvailable",
         "menuSortOrder","labelOverride","iconKey","customized","configuredBy","configuredAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,false,$13,now())
       ON CONFLICT ("organizationId","moduleId") DO NOTHING
       RETURNING "id"`,
      [organizationId, tm.moduleId, tpl.id, tpl.version,
        tm.defaultEnabled, tm.defaultVisible, tm.defaultShowInMenu,
        tm.defaultShowInDock, tm.defaultDashboardAvailable,
        tm.menuSortOrder, tm.labelOverride, tm.iconKey, userId],
    );
    if (inserted.length > 0) created++;
  }

  const ev = validateEvent("template.applied", { templateKey, templateVersion: tpl.version, modulesCreated: created });
  if (!ev.ok) throw new Error("Evento template.applied invalido: " + ev.error);
  await exec(
    `INSERT INTO "events"("organizationId","type","version","payload") VALUES ($1,$2,$3,$4)`,
    [organizationId, ev.event.type, ev.event.version, JSON.stringify(ev.event.payload)],
  );
  await recordAudit(exec, {
    organizationId, actorUserId: userId, actorType: "USER",
    action: "template.applied", entityType: "business_template", entityId: tpl.id,
    metadata: { templateKey, modulesCreated: created },
  });

  return { created, templateVersion: tpl.version };
}
