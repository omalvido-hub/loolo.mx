// NELZZON — Validadores Zod de dashboard/preferencias (Fase 2B-2).
// preferenceValueJson: set CERRADO de claves. configJson: por configSchemaKey/widgetType.
// Falla cerrado: clave/forma desconocida o inválida → NO se persiste.

import { z } from "zod";

// ── Preferencias personales: set MÍNIMO CERRADO ────────────────────
const preferenceSchemas = {
  "ui.density": z.object({ value: z.enum(["comfortable", "compact", "spacious"]) }),
  "nav.left_sidebar_collapsed": z.object({ value: z.boolean() }),
  "dock.collapsed": z.object({ value: z.boolean() }),
  "dashboard.personal_hidden_widgets": z.object({ value: z.array(z.string()) }),
  "dashboard.personal_widget_order": z.object({ value: z.array(z.string()) }),
} as const;

export type PreferenceKey = keyof typeof preferenceSchemas;
export const PREFERENCE_KEYS = Object.keys(preferenceSchemas) as PreferenceKey[];

export function validatePreference(
  key: string,
  value: unknown,
): { ok: true; key: PreferenceKey; value: unknown } | { ok: false; error: string } {
  const schema = (preferenceSchemas as Record<string, z.ZodTypeAny>)[key];
  if (!schema) return { ok: false, error: `preferenceKey desconocida: ${key}` };
  const parsed = schema.safeParse(value);
  if (!parsed.success) return { ok: false, error: `Valor inválido para ${key}: ${parsed.error.message}` };
  return { ok: true, key: key as PreferenceKey, value: parsed.data };
}

// ── Config de widget por configSchemaKey ───────────────────────────
const widgetConfigSchemas = {
  // placeholder: sin datos reales; admite solo un título opcional, nada más (strict).
  placeholder: z.object({ title: z.string().max(120).optional() }).strict(),
} as const;

export function validateWidgetConfig(
  configSchemaKey: string,
  config: unknown,
): { ok: true; value: unknown } | { ok: false; error: string } {
  const schema = (widgetConfigSchemas as Record<string, z.ZodTypeAny>)[configSchemaKey];
  if (!schema) return { ok: false, error: `configSchemaKey desconocido: ${configSchemaKey}` };
  const parsed = schema.safeParse(config ?? {});
  if (!parsed.success) return { ok: false, error: `configJson inválido: ${parsed.error.message}` };
  return { ok: true, value: parsed.data };
}
