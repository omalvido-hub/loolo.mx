// Accesos rápidos a módulos — Dashboard Control Center (Fase 1).
// Simples atajos de navegación, deliberadamente separados de los KPIs de
// arriba (que comunican dato + significado + acción). Solo enlaza rutas
// que existen hoy; lo demás se muestra deshabilitado como "Próximamente".

import Link from "next/link";
import { Users, CalendarCheck, FileText, Wallet, ListChecks, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAccessItem {
  key: string;
  label: string;
  icon: React.ElementType;
  accent: string;
  href: string | null;
}

const QUICK_ACCESS: QuickAccessItem[] = [
  { key: "patients",     label: "Pacientes",     icon: Users,        accent: "bg-blue-500/10 text-blue-600",    href: "/pacientes" },
  { key: "agenda",       label: "Agenda",        icon: CalendarCheck, accent: "bg-emerald-500/10 text-emerald-600", href: "/agenda" },
  { key: "quotes",       label: "Presupuestos",  icon: FileText,     accent: "bg-violet-500/10 text-violet-600", href: "/presupuestos" },
  { key: "billing",      label: "Cobros",        icon: Wallet,       accent: "bg-amber-500/10 text-amber-600",  href: "/cobros" },
  { key: "follow-up",    label: "Seguimiento",   icon: ListChecks,   accent: "bg-cyan-500/10 text-cyan-600",    href: null },
  { key: "documents",    label: "Documentos",    icon: FolderOpen,   accent: "bg-rose-500/10 text-rose-600",    href: null },
];

export function DashboardQuickAccess() {
  return (
    <div>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        Accesos rápidos
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {QUICK_ACCESS.map((item) => {
          const Icon = item.icon;
          const content = (
            <>
              <span className={cn("flex items-center justify-center size-9 rounded-xl", item.accent)}>
                <Icon className="h-[16px] w-[16px]" />
              </span>
              <p className="mt-3 text-sm font-medium tracking-tight">{item.label}</p>
              {!item.href && (
                <span className="mt-1.5 inline-flex items-center rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground">
                  Próximamente
                </span>
              )}
            </>
          );

          if (!item.href) {
            return (
              <div
                key={item.key}
                className="rounded-2xl border bg-card p-3.5 opacity-60 ring-1 ring-foreground/[0.04]"
              >
                {content}
              </div>
            );
          }

          return (
            <Link
              key={item.key}
              href={item.href}
              className="group rounded-2xl border bg-card p-3.5 ring-1 ring-foreground/[0.04] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-16px_rgba(0,0,0,0.16)] hover:ring-foreground/10 cursor-pointer"
            >
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
