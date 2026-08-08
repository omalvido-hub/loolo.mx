"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, CalendarDays, UserCircle, ClipboardList, CreditCard, BarChart3, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission: string;
  available: boolean;
}

// Mismo patrón que AppSidebar: los ítems sin ruta real hoy (Tratamientos,
// Reportes) se muestran deshabilitados y marcados "Próximamente" en vez de
// llevar a un 404.
const NAV_ITEMS: NavItem[] = [
  { label: "Panel",         href: "/dashboard",    icon: LayoutGrid,    permission: "dashboard.view",   available: true },
  { label: "Agenda",        href: "/agenda",       icon: CalendarDays,  permission: "appointments.view", available: true },
  { label: "Pacientes",     href: "/pacientes",    icon: UserCircle,    permission: "patients.view",     available: true },
  { label: "Tratamientos",  href: "/tratamiento",  icon: ClipboardList, permission: "treatment.view",    available: false },
  { label: "Cobros",        href: "/cobros",       icon: CreditCard,    permission: "payment.view",      available: true },
  { label: "Reportes",      href: "/reportes",     icon: BarChart3,     permission: "dashboard.view",    available: false },
];

interface SinapsisNavProps {
  permissions: string[];
  userName: string;
  open: boolean;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Rail de íconos por debajo de lg (evita que el sidebar de 200px se coma la
// pantalla en ventanas angostas); a partir de lg se despliegan las etiquetas.
// `open` lo esconde del todo (ancho 0) para que el dashboard use toda la
// pantalla — con transición suave de 300ms.
export function SinapsisNav({ permissions, userName, open }: SinapsisNavProps) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const items = NAV_ITEMS.filter((item) => permissions.includes(item.permission));

  return (
    <nav
      className={cn(
        "relative flex shrink-0 flex-col gap-[3px] overflow-hidden border-r bg-[#040908]/60 py-6 transition-[width,padding,opacity,border-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        open ? "w-16 border-[#3FE9B4]/10 px-2 opacity-100 lg:w-[200px] lg:px-3" : "w-0 border-transparent px-0 opacity-0",
      )}
      style={{ fontFamily: "var(--sn-mono)" }}
    >
      {items.map((item) => {
        const Icon = item.icon;

        if (!item.available) {
          return (
            <span
              key={item.href}
              title={`${item.label} — próximamente`}
              aria-disabled="true"
              className="flex items-center justify-center gap-3 rounded-[10px] px-2 py-2.5 text-[10.5px] tracking-[0.14em] text-white/20 lg:justify-start lg:px-3.5"
            >
              <Icon className="size-[15px] shrink-0" strokeWidth={1.6} />
              <span className="hidden lg:inline">{item.label.toUpperCase()}</span>
            </span>
          );
        }

        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={cn(
              "relative flex items-center justify-center gap-3 rounded-[10px] px-2 py-2.5 text-[10.5px] tracking-[0.14em] transition-colors lg:justify-start lg:px-3.5",
              active
                ? "border border-[#3FE9B4]/30 bg-[#3FE9B4]/[0.09] text-[#3FE9B4]"
                : "border border-transparent text-white/42 hover:bg-[#3FE9B4]/5 hover:text-white/70",
            )}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3FE9B4] shadow-[0_0_10px_#3FE9B4] lg:-left-3 lg:translate-x-0" />
            )}
            <Icon className="size-[15px] shrink-0" strokeWidth={1.6} />
            <span className="hidden lg:inline">{item.label.toUpperCase()}</span>
          </Link>
        );
      })}

      <div className="mt-auto flex items-center justify-center gap-3 px-2 py-2.5 lg:justify-start lg:px-3.5">
        <span
          className="flex size-[26px] shrink-0 items-center justify-center rounded-full border border-[#E5A165]/40 text-[9.5px] font-medium text-[#E5A165]"
          style={{ background: "linear-gradient(150deg,#5A3B2A,#241812)" }}
        >
          {initials(userName)}
        </span>
        <span className="hidden truncate text-[10.5px] tracking-normal text-white/50 lg:inline" style={{ fontFamily: "var(--sn-sans)" }}>
          {userName}
        </span>
      </div>
    </nav>
  );
}
