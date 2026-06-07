"use client";

// Lista de consultas del historial clínico + creación de nueva consulta
// (NELZZON-ENCOUNTERS-1B-UI). Si ya hay una consulta DRAFT/IN_PROGRESS,
// guía a continuarla en lugar de permitir duplicados desde la UI.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EncounterRow } from "./EncounterRow";
import { EncounterStatusBadge } from "./EncounterStatusBadge";
import { EncountersEmpty } from "./EncountersEmpty";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createEncounterAction } from "@/server/actions/encounters";
import type { EncounterListItem } from "@/server/domain/clinical/encounter-views";

const ACTIVE_STATUSES = new Set(["DRAFT", "IN_PROGRESS"]);

interface Props {
  items: EncounterListItem[];
  patientId: string;
  canCreate?: boolean;
}

export function EncounterList({ items, patientId, canCreate = false }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [error, setError] = useState<string | null>(null);

  const active = items.find((i) => ACTIVE_STATUSES.has(i.status)) ?? null;

  function handleCreate() {
    const trimmed = chiefComplaint.trim();
    if (!trimmed) {
      setError("Escribe el motivo de la consulta.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createEncounterAction(patientId, { chiefComplaint: trimmed });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/pacientes/${patientId}/consultas/${result.data.encounterId}`);
    });
  }

  return (
    <div className="space-y-3">
      {canCreate && (
        active ? (
          <Link
            href={`/pacientes/${patientId}/consultas/${active.encounterId}`}
            className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm hover:bg-blue-100 transition-colors"
          >
            <span className="font-medium text-blue-800">Consulta en curso → continuar</span>
            <EncounterStatusBadge status={active.status} />
          </Link>
        ) : showForm ? (
          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-medium">Nueva consulta</p>
            <div className="space-y-1">
              <label className="text-xs font-medium">Motivo de la consulta</label>
              <Input
                value={chiefComplaint}
                onChange={(e) => { setChiefComplaint(e.target.value); setError(null); }}
                placeholder="Ej. Dolor en muela inferior derecha"
                disabled={isPending}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={isPending}>
                {isPending ? "Creando…" : "Crear y comenzar"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setShowForm(false); setChiefComplaint(""); setError(null); }}
                disabled={isPending}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" onClick={() => setShowForm(true)}>
            + Nueva consulta
          </Button>
        )
      )}
      {items.length === 0 ? (
        <EncountersEmpty />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <EncounterRow key={item.encounterId} item={item} patientId={patientId} />
          ))}
        </div>
      )}
    </div>
  );
}
