// LOOLO — Follow: planificación del mensaje entrante (núcleo del flujo de entrada).
// Función PURA: decide QUÉ escribir, no escribe. El adaptador (Prisma/pg) ejecuta el plan.
// Reglas:
//   8  — toda conversación/mensaje se guarda.
//   7  — un contacto NO se convierte en paciente automáticamente.
//   9  — ningún mensaje crea tarea/oportunidad por sí solo.
//   13 — si falta un dato crítico (sin canal), se marca y se detiene.

import { RecordState } from "../shared/status.js";
import type { Result } from "../shared/status.js";
import { ok, fail } from "../shared/status.js";

export type ChannelType = "WHATSAPP" | "INSTAGRAM" | "FACEBOOK" | "TIKTOK" | "WEB";

export interface InboundMessage {
  organizationId: string;
  channelId: string | null; // si falta → MISSING_DATA (regla 13)
  channelType: ChannelType | null;
  fromIdentifier: string | null; // teléfono / handle
  body: string;
}

/** Plan de escritura que el adaptador ejecutará dentro de UNA transacción tenant-scoped. */
export interface InboundPlan {
  createContact: boolean;
  contactState: RecordState;
  conversationState: RecordState;
  // Lo que LOOLO explícitamente NO hace de forma automática:
  createsPatient: false; // regla 7
  createsOpportunity: false; // regla 9
  emitEvents: ("conversation.received" | "contact.created")[];
}

export function planInboundMessage(msg: InboundMessage): Result<InboundPlan> {
  // Regla 13: sin canal no podemos ubicar el mensaje. No inventamos: marcamos y paramos.
  if (!msg.channelId || !msg.channelType) {
    return fail(RecordState.MISSING_DATA, "Mensaje sin canal identificable.");
  }
  if (!msg.body || msg.body.trim().length === 0) {
    return fail(RecordState.MISSING_DATA, "Mensaje sin contenido.");
  }

  // Si no hay identificador del remitente, el contacto queda incompleto pero la
  // conversación se guarda igual (regla 8). El contacto se marca MISSING_DATA.
  const hasIdentifier = !!msg.fromIdentifier && msg.fromIdentifier.trim().length > 0;

  const plan: InboundPlan = {
    createContact: true,
    contactState: hasIdentifier ? RecordState.OK : RecordState.MISSING_DATA,
    // Conversación entrante nueva → disponible para Follow, sin acción automática.
    conversationState: RecordState.OK,
    createsPatient: false,
    createsOpportunity: false,
    emitEvents: ["contact.created", "conversation.received"],
  };

  return ok(plan);
}
