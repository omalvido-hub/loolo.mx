// NELZZON — Pruebas Fase 1H-C (Historial clínico en la ficha del paciente).
// Estructurales sobre el código fuente (mismo patrón que phase-ui5.test.ts):
// - Sección "Historial clínico" presente.
// - Eventos de tratamiento construidos por ÍTEM, no por plan.
// - Origen del hallazgo vinculado (1G-B) presente, con fallback seguro.
// - Documentos clínicos incluidos en el historial.
// - Presupuestos/pagos/cobros NO forman parte del historial clínico.
// - Sin referencia a .body de notas clínicas (texto clínico libre).

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const timelinePath = resolve("src/components/patients/PatientTimeline.tsx");
const timelineContent = readFileSync(timelinePath, "utf-8");

const pagePath = resolve("src/app/(app)/pacientes/[id]/page.tsx");
const pageContent = readFileSync(pagePath, "utf-8");

describe("1H-C — Historial clínico", () => {
  it('PatientTimeline contiene la sección "Historial clínico"', () => {
    expect(timelineContent).toContain("Historial clínico");
  });

  it("construye eventos de tratamiento por ítem (plans[].items), no por plan", () => {
    expect(timelineContent).toContain("for (const it of p.items)");
    expect(timelineContent).toContain('category: "treatment_item"');
    expect(timelineContent).not.toContain('category: "treatment_plan"');
  });

  it("ítem con linkedFindingId muestra 'Origen: Odontograma · ...' y fallback 'Origen: Odontograma'", () => {
    expect(timelineContent).toContain('`Origen: Odontograma · ${findingLabel(f)}`');
    expect(timelineContent).toContain('"Origen: Odontograma"');
  });

  it("incluye documentos clínicos en el historial (categoría document)", () => {
    expect(timelineContent).toContain("PatientDocumentSafeItem");
    expect(timelineContent).toContain('category: "document"');
    expect(timelineContent).toContain("documents: PatientDocumentSafeItem[]");
  });

  it("presupuestos/pagos/cobros NO forman parte del historial clínico", () => {
    expect(timelineContent).not.toContain("QuoteView");
    expect(timelineContent).not.toContain("quotes");
    expect(timelineContent).not.toContain('"quote"');
    expect(timelineContent).not.toContain('"payment"');
    expect(timelineContent).not.toContain('"Presupuesto"');
    expect(timelineContent).not.toContain('"Cobro"');
    expect(timelineContent).not.toContain("totalCents");
    expect(timelineContent).not.toContain("fCents");
  });

  it("no accede a .body de notas clínicas en código", () => {
    expect(timelineContent).not.toContain("n.body");
    expect(timelineContent).not.toContain("note.body");
    expect(timelineContent).not.toContain("notesSummary");
  });

  it("página pacientes/[id] pasa documents a PatientTimeline (no quotes)", () => {
    const match = pageContent.match(/<PatientTimeline[\s\S]*?\/>/);
    expect(match, "PatientTimeline debe estar en la página").not.toBeNull();
    const block = match![0];
    expect(block).toContain("documents={documentsResult.ok ? documentsResult.value.items : []}");
    expect(block).not.toContain("quotes=");
  });
});
