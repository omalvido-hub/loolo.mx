// NELZZON — Resolver de disponibilidad (Fase 4A). PURO, determinista, testeable sin DB.
// Dado el día (en minutos locales) de un recurso, sus reglas, citas activas y bloqueos,
// devuelve los huecos LIBRES. No consulta BD; la verdad transaccional vive en la operación + EXCLUDE.

export interface Interval { start: number; end: number; } // minutos locales del día [start,end)

export interface ResolveAvailabilityInput {
  rules: Interval[];     // ventanas de atención (availability_rules del weekday)
  busy: Interval[];      // citas activas + bloqueos, ya convertidos a minutos locales del día
  slotMinutes?: number;  // si se especifica, parte los huecos en slots de N minutos
}

function subtract(windows: Interval[], busy: Interval[]): Interval[] {
  const sorted = [...busy].filter((b) => b.end > b.start).sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const w of windows) {
    let cursor = w.start;
    for (const b of sorted) {
      if (b.end <= cursor || b.start >= w.end) continue;
      if (b.start > cursor) out.push({ start: cursor, end: Math.min(b.start, w.end) });
      cursor = Math.max(cursor, Math.min(b.end, w.end));
      if (cursor >= w.end) break;
    }
    if (cursor < w.end) out.push({ start: cursor, end: w.end });
  }
  return out.filter((i) => i.end > i.start);
}

export function resolveAvailability(input: ResolveAvailabilityInput): Interval[] {
  const free = subtract(
    [...input.rules].sort((a, b) => a.start - b.start),
    input.busy,
  );
  if (!input.slotMinutes || input.slotMinutes <= 0) return free;
  const slots: Interval[] = [];
  for (const f of free) {
    for (let s = f.start; s + input.slotMinutes <= f.end; s += input.slotMinutes) {
      slots.push({ start: s, end: s + input.slotMinutes });
    }
  }
  return slots;
}
