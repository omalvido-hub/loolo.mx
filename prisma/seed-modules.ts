// LOOLO — Seed Fase 2B-1: catálogo de módulos + plantilla Odontología general.
// Idempotente (ON CONFLICT por key). Ejecutado por app_admin.

import { adminPool, closePools } from "../tests/harness.js";
import { ALL_MODULES } from "../src/server/domain/modules/catalog-data.js";
import { ODONTOLOGIA_TEMPLATE, ODONTOLOGIA_TEMPLATE_MODULES } from "../src/server/domain/modules/template-data.js";

export async function seedModulesAndTemplate(pool = adminPool) {
  // 1) module_catalog
  for (const m of ALL_MODULES) {
    await pool.query(
      `INSERT INTO "module_catalog"
        ("key","name","description","moduleGroup","moduleType","isCore","isTransversal","functionalStatus")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT ("key") DO UPDATE SET
         "name"=EXCLUDED."name", "description"=EXCLUDED."description",
         "moduleGroup"=EXCLUDED."moduleGroup", "moduleType"=EXCLUDED."moduleType",
         "isCore"=EXCLUDED."isCore", "isTransversal"=EXCLUDED."isTransversal",
         "functionalStatus"=EXCLUDED."functionalStatus", "updatedAt"=now()`,
      [m.key, m.name, m.description, m.moduleGroup, m.moduleType, !!m.isCore, !!m.isTransversal, m.functionalStatus],
    );
  }

  // 2) business_templates
  const t = ODONTOLOGIA_TEMPLATE;
  const tplId = (await pool.query(
    `INSERT INTO "business_templates"
      ("key","category","groupName","professionUnit","specialtyService","templateName","phase","detailLevel","version")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT ("key") DO UPDATE SET
       "templateName"=EXCLUDED."templateName", "version"=EXCLUDED."version", "updatedAt"=now()
     RETURNING "id"`,
    [t.key, t.category, t.groupName, t.professionUnit, t.specialtyService, t.templateName, t.phase, t.detailLevel, t.version],
  )).rows[0].id;

  // 3) template_modules (mapeo por key → moduleId)
  for (const tm of ODONTOLOGIA_TEMPLATE_MODULES) {
    await pool.query(
      `INSERT INTO "template_modules"
        ("templateId","moduleId","isRequired","isRecommended","isOptional",
         "defaultEnabled","defaultVisible","defaultShowInMenu","defaultShowInDock","defaultDashboardAvailable",
         "menuSortOrder","labelOverride")
       SELECT $1, mc."id", $3,$4,$5,$6,$7,$8,$9,$10,$11,$12
         FROM "module_catalog" mc WHERE mc."key"=$2
       ON CONFLICT ("templateId","moduleId") DO UPDATE SET
         "isRequired"=EXCLUDED."isRequired", "isRecommended"=EXCLUDED."isRecommended",
         "isOptional"=EXCLUDED."isOptional", "defaultEnabled"=EXCLUDED."defaultEnabled",
         "defaultVisible"=EXCLUDED."defaultVisible", "defaultShowInMenu"=EXCLUDED."defaultShowInMenu",
         "defaultShowInDock"=EXCLUDED."defaultShowInDock", "defaultDashboardAvailable"=EXCLUDED."defaultDashboardAvailable",
         "menuSortOrder"=EXCLUDED."menuSortOrder", "labelOverride"=EXCLUDED."labelOverride", "updatedAt"=now()`,
      [tplId, tm.moduleKey, tm.tier === "required", tm.tier === "recommended", tm.tier === "optional",
        tm.enabled, tm.visible, tm.showInMenu, tm.showInDock, tm.dashboardAvailable,
        tm.menuSortOrder ?? null, tm.labelOverride ?? null],
    );
  }
  return { templateId: tplId, modules: ALL_MODULES.length, templateModules: ODONTOLOGIA_TEMPLATE_MODULES.length };
}

// Ejecutable directo
if (import.meta.url === `file://${process.argv[1]}`) {
  seedModulesAndTemplate()
    .then((r) => { console.log("✅ Seed 2B-1:", r); return closePools(); })
    .catch((e) => { console.error(e); process.exit(1); });
}
