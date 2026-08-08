const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isValidHexColor(value: string | null | undefined): value is string {
  return typeof value === "string" && HEX_RE.test(value.trim());
}

/** Negro o blanco, el que tenga mejor contraste sobre `hex` (WCAG relative luminance). */
export function readableForeground(hex: string): "#0a0a0a" | "#ffffff" {
  const normalized = hex.trim().replace("#", "");
  const full = normalized.length === 3
    ? normalized.split("").map((c) => c + c).join("")
    : normalized;

  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;

  const linear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

  return luminance > 0.45 ? "#0a0a0a" : "#ffffff";
}
