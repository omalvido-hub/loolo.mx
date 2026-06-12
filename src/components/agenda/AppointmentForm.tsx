"use client";

// NELZZON — Formulario "Agendar cita" (FASE 1K-C). Llama a
// createAppointmentAction (src/server/actions/agenda.ts, FASE 1K-B) — sin
// lógica de negocio propia. Fecha/hora se convierten a startAt/endAt ISO con
// offset fijo -06:00 (America/Mexico_City no tiene horario de verano desde
// 2022). Nunca muestra IDs crudos: los selects de recurso solo listan name.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAppointmentAction } from "@/server/actions/agenda";
import type { ResourceListResult } from "@/server/domain/agenda/queries";

const SELECT_CLASS =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

const DURATIONS = [30, 45, 60] as const;

interface AppointmentFormProps {
  resources: ResourceListResult | null;
  patientId?: string;
  defaultDate?: string;
}

function todayMx(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
}

export function AppointmentForm({ resources, patientId, defaultDate }: AppointmentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState(defaultDate ?? todayMx());
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState<number>(30);
  const [reason, setReason] = useState("");
  const [professionalResourceId, setProfessionalResourceId] = useState("");
  const [chairResourceId, setChairResourceId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const professionals = (resources?.items ?? []).filter((r) => r.kind === "PROFESSIONAL" && r.active);
  const chairs = (resources?.items ?? []).filter((r) => r.kind === "CHAIR" && r.active);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!date || !time) {
      setError("Indica fecha y hora.");
      return;
    }

    const startAt = new Date(`${date}T${time}:00-06:00`);
    if (isNaN(startAt.getTime())) {
      setError("Revisa la fecha y hora.");
      return;
    }
    const endAt = new Date(startAt.getTime() + duration * 60_000);

    startTransition(async () => {
      const result = await createAppointmentAction({
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        reason: reason.trim() ? reason.trim() : undefined,
        professionalResourceId: professionalResourceId || undefined,
        chairResourceId: chairResourceId || undefined,
        patientId: patientId || undefined,
      });

      if (result.ok) {
        setSuccess("Cita agendada correctamente.");
        setReason("");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="rounded-xl border overflow-hidden mb-6">
      <div className="px-4 py-3 bg-muted/50 border-b">
        <h2 className="font-medium text-sm">Agendar cita</h2>
      </div>
      <form onSubmit={handleSubmit} className="px-4 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label htmlFor="appt-date">Fecha</Label>
          <Input
            id="appt-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="appt-time">Hora</Label>
          <Input
            id="appt-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="appt-duration">Duración</Label>
          <select
            id="appt-duration"
            className={SELECT_CLASS}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            {DURATIONS.map((d) => (
              <option key={d} value={d}>{d} min</option>
            ))}
          </select>
        </div>
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <Label htmlFor="appt-reason">Motivo</Label>
          <Input
            id="appt-reason"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej. Revisión"
            maxLength={500}
          />
        </div>

        {professionals.length > 0 && (
          <div className="space-y-1 col-span-2 sm:col-span-2">
            <Label htmlFor="appt-professional">Profesional</Label>
            <select
              id="appt-professional"
              className={SELECT_CLASS}
              value={professionalResourceId}
              onChange={(e) => setProfessionalResourceId(e.target.value)}
            >
              <option value="">Sin asignar</option>
              {professionals.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        )}

        {chairs.length > 0 && (
          <div className="space-y-1 col-span-2 sm:col-span-2">
            <Label htmlFor="appt-chair">Sillón</Label>
            <select
              id="appt-chair"
              className={SELECT_CLASS}
              value={chairResourceId}
              onChange={(e) => setChairResourceId(e.target.value)}
            >
              <option value="">Sin asignar</option>
              {chairs.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="col-span-2 sm:col-span-4 flex flex-wrap items-center gap-3 pt-1">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Guardando…" : "Guardar cita"}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600 dark:text-green-500">{success}</p>}
        </div>
      </form>
    </div>
  );
}
