// LOOLO — Seed Fase 2B-2: catalogo minimo de widgets (placeholders, sin datos reales).
// Idempotente (ON CONFLICT por key). Ejecutado por app_admin.

import { adminPool, closePools } from "../tests/harness.js";

export interface WidgetSeed {
  key: string; name: string; description: string;
  sourceModuleKey: string; widgetType: "SUMMARY" | "LIST" | "CALENDAR" | "METRIC" | "PLACEHOLDER";
  requiredPermissions: string[]; configSchemaKey: string;
}

export const SEED_WIDGETS: WidgetSeed[] = [
  { key: "executive_summary_placeholder", name: "Resumen ejecutivo", description: "Placeholder; sin KPIs reales", sourceModuleKey: "reports_dashboard", widgetType: "SUMMARY", requiredPermissions: ["audit.view"], configSchemaKey: "placeholder" },
  { key: "pending_followups_placeholder", name: "Seguimientos pendientes", description: "Placeholder; sin datos reales", sourceModuleKey: "followup_tasks", widgetType: "LIST", requiredPermissions: ["dashboard.view"], configSchemaKey: "placeholder" },
  { key: "upcoming_appointments_placeholder", name: "Próximas citas", description: "Placeholder; sin datos reales", sourceModuleKey: "agenda", widgetType: "CALENDAR", requiredPermissions: ["dashboard.view"], configSchemaKey: "placeholder" },
];

export async function seedDashboardWidgets(pool = adminPool) {
  for (const w of SEED_WIDGETS) {
    await pool.query(
      `INSERT INTO "dashboard_widget_catalog"
        ("key","name","description","sourceModuleKey","widgetType","requiredPermissions","configSchemaKey","functionalStatus")
       VALUES ($1,$2,$3,$4,$5,$6,$7,'prepared_for_later')
       ON CONFLICT ("key") DO UPDATE SET
         "name"=EXCLUDED."name", "description"=EXCLUDED."description",
         "sourceModuleKey"=EXCLUDED."sourceModuleKey", "widgetType"=EXCLUDED."widgetType",
         "requiredPermissions"=EXCLUDED."requiredPermissions", "configSchemaKey"=EXCLUDED."configSchemaKey",
         "functionalStatus"='prepared_for_later', "updatedAt"=now()`,
      [w.key, w.name, w.description, w.sourceModuleKey, w.widgetType, w.requiredPermissions, w.configSchemaKey],
    );
  }
  return { widgets: SEED_WIDGETS.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedDashboardWidgets().then((r) => { console.log("✅ Seed widgets:", r); return closePools(); })
    .catch((e) => { console.error(e); process.exit(1); });
}
