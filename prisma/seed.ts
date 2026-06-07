// NELZZON — Seed Fase 1: prueba mínima del flujo de entrada.
// Usa app_admin para catálogos/orgs/identidad y app_user (forTenantPg) para el dominio.
// Demuestra: mensaje entra → contacto + conversación + mensaje + eventos, SIN paciente ni oportunidad.

import { adminPool, forTenantPg, closePools } from "../tests/harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";
import { planInboundMessage } from "../src/server/domain/conversations/receive-inbound.js";
import { validateEvent } from "../src/server/domain/events/schemas.js";

async function seedCatalog() {
  // Permisos
  for (const p of PERMISSIONS) {
    await adminPool.query(
      `INSERT INTO "permissions"("key","description") VALUES ($1,$2)
       ON CONFLICT ("key") DO NOTHING`,
      [p.key, p.description],
    );
  }
  // Roles + role_permissions
  for (const r of ROLES) {
    const { rows } = await adminPool.query(
      `INSERT INTO "roles"("key","name","scope","assignable") VALUES ($1,$2,$3,$4)
       ON CONFLICT ("key") DO UPDATE SET "name"=EXCLUDED."name" RETURNING "id"`,
      [r.key, r.name, r.scope, r.assignable],
    );
    const roleId = rows[0].id;
    for (const permKey of r.permissions) {
      await adminPool.query(
        `INSERT INTO "role_permissions"("roleId","permissionId")
         SELECT $1, "id" FROM "permissions" WHERE "key"=$2
         ON CONFLICT DO NOTHING`,
        [roleId, permKey],
      );
    }
  }
}

async function createOrgWithOwner(orgName: string, slug: string, email: string) {
  const org = (await adminPool.query(
    `INSERT INTO "organizations"("name","slug") VALUES ($1,$2) RETURNING "id"`,
    [orgName, slug],
  )).rows[0];
  const user = (await adminPool.query(
    `INSERT INTO "users"("email","name","emailVerified") VALUES ($1,$2,true) RETURNING "id"`,
    [email, orgName + " Owner"],
  )).rows[0];
  const member = (await adminPool.query(
    `INSERT INTO "organization_memberships"("organizationId","userId","role")
     VALUES ($1,$2,'owner') RETURNING "id"`,
    [org.id, user.id],
  )).rows[0];
  // Asignar rol fino owner (membership_roles)
  await adminPool.query(
    `INSERT INTO "membership_roles"("memberId","roleId")
     SELECT $1, "id" FROM "roles" WHERE "key"='owner'`,
    [member.id],
  );
  return { orgId: org.id, userId: user.id, memberId: member.id };
}

async function main() {
  console.log("→ Sembrando catálogo RBAC...");
  await seedCatalog();

  console.log("→ Creando organizaciones A y B...");
  const orgA = await createOrgWithOwner("Clínica Dental A", "dental-a", "owner@dental-a.test");
  const orgB = await createOrgWithOwner("Clínica Dental B", "dental-b", "owner@dental-b.test");

  // Canal de entrada para A (sembrado por admin)
  const channelA = (await adminPool.query(
    `INSERT INTO "channels"("organizationId","type","identifier")
     VALUES ($1,'WHATSAPP','+5215555555555') RETURNING "id"`,
    [orgA.orgId],
  )).rows[0];

  console.log("→ Procesando mensaje entrante para A (dominio puro)...");
  const inbound = {
    organizationId: orgA.orgId,
    channelId: channelA.id,
    channelType: "WHATSAPP" as const,
    fromIdentifier: "+5215551112233",
    body: "Hola, ¿tienen cita para limpieza dental?",
  };

  const planned = planInboundMessage(inbound);
  if (!planned.ok) {
    console.error("  Mensaje no procesable:", planned.reason, planned.detail);
    await closePools();
    return;
  }
  const plan = planned.value;

  // Ejecutar el plan como app_user, tenant-scoped por RLS.
  await forTenantPg(orgA.orgId, async (c) => {
    const contact = (await c.query(
      `INSERT INTO "contacts"("organizationId","phone","source","state")
       VALUES ($1,$2,$3,$4) RETURNING "id"`,
      [orgA.orgId, inbound.fromIdentifier, "WHATSAPP", plan.contactState],
    )).rows[0];

    const conv = (await c.query(
      `INSERT INTO "conversations"("organizationId","channelId","contactId","state")
       VALUES ($1,$2,$3,$4) RETURNING "id"`,
      [orgA.orgId, channelA.id, contact.id, plan.conversationState],
    )).rows[0];

    const message = (await c.query(
      `INSERT INTO "messages"("organizationId","conversationId","direction","body")
       VALUES ($1,$2,'INBOUND',$3) RETURNING "id"`,
      [orgA.orgId, conv.id, inbound.body],
    )).rows[0];

    // Emitir eventos TIPADOS (validados por Zod). Si no validan, no se insertan.
    const evContact = validateEvent("contact.created", { contactId: contact.id, source: "WHATSAPP" });
    const evConv = validateEvent("conversation.received", {
      conversationId: conv.id, channelId: channelA.id, channelType: "WHATSAPP",
      contactId: contact.id, messageId: message.id,
    });
    for (const ev of [evContact, evConv]) {
      if (!ev.ok) throw new Error("Evento inválido: " + ev.error);
      await c.query(
        `INSERT INTO "events"("organizationId","type","version","payload")
         VALUES ($1,$2,$3,$4)`,
        [orgA.orgId, ev.event.type, ev.event.version, JSON.stringify(ev.event.payload)],
      );
    }

    // Auditoría (append-only)
    await c.query(
      `INSERT INTO "audit_logs"("organizationId","action","entityType","entityId","metadata")
       VALUES ($1,'conversation.received','conversation',$2,$3)`,
      [orgA.orgId, conv.id, JSON.stringify({ channel: "WHATSAPP" })],
    );

    console.log("  ✓ contacto, conversación, mensaje, 2 eventos y auditoría creados.");
  });

  await closePools();
  console.log("✅ Seed completado.");
}

main().catch((e) => { console.error(e); process.exit(1); });
