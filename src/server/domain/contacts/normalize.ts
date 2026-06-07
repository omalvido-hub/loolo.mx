// NELZZON — Normalización de identificadores de contacto (Fase 3A).
// Teléfono → E.164 con libphonenumber-js (MX default ahora; preparado para defaultCountry futuro).
// Falla cerrado: si no valida, devuelve null y NO se crea identificador inválido.

import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export type IdentifierKind = "PHONE" | "EMAIL" | "WHATSAPP" | "INSTAGRAM" | "FACEBOOK" | "TIKTOK" | "OTHER";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizePhone(raw: string, defaultCountry: CountryCode = "MX"): string | null {
  if (!raw) return null;
  const p = parsePhoneNumberFromString(raw, defaultCountry);
  return p && p.isValid() ? p.number : null; // E.164 o null
}

export function normalizeEmail(raw: string): string | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  return EMAIL_RE.test(v) ? v : null;
}

export function normalizeHandle(raw: string): string | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase().replace(/^@+/, "");
  return v.length > 0 ? v : null;
}

/**
 * Normaliza según el tipo. WhatsApp usa número telefónico → E.164.
 * Devuelve null si no valida (fail-closed).
 */
export function normalizeIdentifier(
  kind: IdentifierKind,
  raw: string,
  defaultCountry: CountryCode = "MX",
): string | null {
  switch (kind) {
    case "PHONE":
    case "WHATSAPP":
      return normalizePhone(raw, defaultCountry);
    case "EMAIL":
      return normalizeEmail(raw);
    case "INSTAGRAM":
    case "FACEBOOK":
    case "TIKTOK":
    case "OTHER":
      return normalizeHandle(raw);
  }
}
