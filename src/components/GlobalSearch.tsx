"use client";

// Buscador global de pacientes. Read-only.
// Busca por nombre, teléfono o correo. Máximo 8 resultados.
// Cada resultado navega a /pacientes/[id].

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchPatientsAction } from "@/server/actions/patients";
import type { PatientSearchItem } from "@/server/domain/patient-record/list";

interface GlobalSearchProps {
  placeholder?: string;
  className?: string;
}

export function GlobalSearch({ placeholder = "Buscar pacientes…", className }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientSearchItem[]>([]);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Búsqueda con debounce de 200ms al cambiar el query.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(() => {
      startTransition(async () => {
        const res = await searchPatientsAction(q);
        if (res.ok) {
          setResults(res.items);
          setOpen(true);
        } else {
          setResults([]);
          setOpen(false);
        }
      });
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  // Cerrar dropdown al hacer clic fuera.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(id: string) {
    setQuery("");
    setResults([]);
    setOpen(false);
    router.push(`/pacientes/${id}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="Buscar paciente por nombre, teléfono o correo"
          autoComplete="off"
        />
        {isPending && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin rounded-full border-2 border-muted border-t-foreground" />
        )}
      </div>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-md border bg-popover shadow-md overflow-hidden">
          {results.length > 0 ? (
            results.map((r) => (
              <button
                key={r.id}
                type="button"
                onMouseDown={() => handleSelect(r.id)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex flex-col gap-0.5"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="font-medium text-foreground truncate">
                    {r.fullName ?? "Sin nombre"}
                  </span>
                  <span className="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Paciente
                  </span>
                </span>
                {(r.phone || r.email) && (
                  <span className="text-xs text-muted-foreground truncate">{r.phone || r.email}</span>
                )}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</p>
          )}
        </div>
      )}
    </div>
  );
}
