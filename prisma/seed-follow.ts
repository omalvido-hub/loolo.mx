// NELZZON — Seed Fase 3B: catálogo de acciones sugeridas (INERTE, sin efecto automático).
import { adminPool, closePools } from "../tests/harness.js";

export const SEED_ACTIONS = [
  { key: "request_more_info", label: "Pedir más datos", description: "Marcar que se pidió información al contacto", requiredPermission: "suggested_actions.execute", isSensitive: false },
  { key: "mark_followup", label: "Marcar seguimiento", description: "Marcar la conversación para seguimiento", requiredPermission: "suggested_actions.execute", isSensitive: false },
  { key: "escalate_to_owner", label: "Escalar a responsable", description: "Escalar (sensible)", requiredPermission: "conversations.assign", isSensitive: true },
];

export async function seedSuggestedActions(pool = adminPool) {
  for (const a of SEED_ACTIONS) {
    await pool.query(
      `INSERT INTO "suggested_action_catalog"("key","label","description","requiredPermission","isSensitive","status")
       VALUES ($1,$2,$3,$4,$5,'active')
       ON CONFLICT ("key") DO UPDATE SET
         "label"=EXCLUDED."label", "description"=EXCLUDED."description",
         "requiredPermission"=EXCLUDED."requiredPermission", "isSensitive"=EXCLUDED."isSensitive",
         "status"='active', "updatedAt"=now()`,
      [a.key, a.label, a.description, a.requiredPermission, a.isSensitive],
    );
  }
  return { actions: SEED_ACTIONS.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedSuggestedActions().then((r) => { console.log("✅ Seed acciones:", r); return closePools(); }).catch((e) => { console.error(e); process.exit(1); });
}
