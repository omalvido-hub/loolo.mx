"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Stethoscope,
  ClipboardList,
  Wallet,
  FileText,
  BarChart3,
  Settings,
  Menu,
  Sun,
  Search,
  Sparkles,
  X,
  ChevronDown,
  Palette,
  LayoutGrid,
  Info,
  TrendingUp,
  Receipt,
  Target,
  Scale,
  Heart,
  Clock,
  CheckCircle2,
  Smile,
  type LucideIcon,
} from "lucide-react";
import {
  PALETTE_TOKENS,
  TYPOGRAPHY_SAMPLES,
  SPACING_TOKENS,
  ICON_SAMPLES,
  KPI_CARDS,
  SECONDARY_CARDS_ROW1,
  SECONDARY_CARDS_ROW2,
  BADGE_SAMPLES,
  SIDEBAR_NAV,
  DRAWER_SECTIONS,
  type IconName,
  type TileColor,
  type BadgeVariant,
  type KpiCard,
} from "./fixtures";

const ICONS: Record<IconName, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  users: Users,
  calendar: Calendar,
  stethoscope: Stethoscope,
  "clipboard-list": ClipboardList,
  wallet: Wallet,
  "file-text": FileText,
  "bar-chart": BarChart3,
  settings: Settings,
  menu: Menu,
  sun: Sun,
  search: Search,
  sparkles: Sparkles,
  x: X,
  "chevron-down": ChevronDown,
  palette: Palette,
  "layout-grid": LayoutGrid,
  info: Info,
  "trending-up": TrendingUp,
  receipt: Receipt,
  target: Target,
  scale: Scale,
  heart: Heart,
  clock: Clock,
  "check-circle": CheckCircle2,
  smile: Smile,
};

function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  const Cmp = ICONS[name];
  return <Cmp size={size} className={className} />;
}

const TILE_COLORS: Record<TileColor, { bg: string; fg: string }> = {
  sky: { bg: "#eff8ff", fg: "#0284c7" },
  green: { bg: "#ecfdf5", fg: "#059669" },
  violet: { bg: "#f5f3ff", fg: "#7c3aed" },
  amber: { bg: "#fff7ed", fg: "#d97706" },
  rose: { bg: "#fff1f3", fg: "#e11d48" },
  accent: { bg: "#eef2ff", fg: "#4f46e5" },
};

const BADGE_COLORS: Record<BadgeVariant, { bg: string; fg: string }> = {
  green: { bg: "#ecfdf5", fg: "#059669" },
  amber: { bg: "#fff7ed", fg: "#d97706" },
  sky: { bg: "#eff8ff", fg: "#0284c7" },
  gray: { bg: "#f5f6f8", fg: "#6b7280" },
};

const SHADOW = "0 1px 2px rgba(16,24,40,.04), 0 4px 16px rgba(16,24,40,.05)";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-[18px] font-bold tracking-[-0.02em] text-[#161a23]">{title}</h2>
      {children}
    </section>
  );
}

function Badge({ variant, icon, text }: { variant: BadgeVariant; icon?: IconName; text: string }) {
  const c = BADGE_COLORS[variant];
  return (
    <span
      className="mt-3 inline-flex items-center gap-1.5 rounded-[8px] px-[11px] py-[4px] text-[12px] font-semibold"
      style={{ background: c.bg, color: c.fg }}
    >
      {icon ? <Icon name={icon} size={14} /> : null}
      {text}
    </span>
  );
}

function Card({ card }: { card: KpiCard }) {
  const tile = TILE_COLORS[card.tile];
  return (
    <div
      className="rounded-[16px] border border-[#ecedf1] bg-white p-5 transition-transform hover:-translate-y-0.5"
      style={{ boxShadow: SHADOW }}
    >
      <div className="mb-3.5 flex items-start justify-between">
        <div
          className="flex h-[46px] w-[46px] items-center justify-center rounded-[13px]"
          style={{ background: tile.bg, color: tile.fg }}
        >
          <Icon name={card.icon} size={23} />
        </div>
        <Icon name="info" size={17} className="text-[#9aa1ad]" />
      </div>
      <div className="mb-1.5 text-[12.5px] font-semibold uppercase tracking-[0.02em] text-[#9aa1ad]">
        {card.label}
      </div>
      <div className="text-[30px] font-bold tracking-[-0.02em] text-[#161a23]">
        {card.value}
        {card.suffix ? <small className="ml-1 text-[14px] font-semibold text-[#6b7280]">{card.suffix}</small> : null}
      </div>
      {card.progress != null ? (
        <div className="my-3.5 h-[9px] overflow-hidden rounded-[6px] bg-[#f5f6f8]">
          <div className="h-full rounded-[6px] bg-[#4f46e5]" style={{ width: `${card.progress}%` }} />
        </div>
      ) : null}
      <div className="mt-2 text-[13px] text-[#6b7280]">
        {card.delta ? <span className="font-semibold text-[#059669]">{card.delta} </span> : null}
        {card.sub}
      </div>
      {card.badge ? <Badge variant={card.badge.variant} icon={card.badge.icon} text={card.badge.text} /> : null}
    </div>
  );
}

function SidebarDemo() {
  return (
    <div
      className="flex w-[248px] flex-none flex-col rounded-[16px] border border-[#ecedf1] bg-white p-3.5"
      style={{ boxShadow: SHADOW }}
    >
      <div className="flex items-center gap-2.5 px-2 pb-4 pt-1.5">
        <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[#4f46e5] text-[18px] font-bold text-white">
          N
        </div>
        <b className="text-[18px] font-bold tracking-[-0.02em] text-[#161a23]">nelzzon</b>
      </div>
      <nav className="mt-1 flex flex-col gap-0.5">
        {SIDEBAR_NAV.map((item, i) =>
          item.sep ? (
            <div key={i} className="mx-2 my-2.5 h-px bg-[#ecedf1]" />
          ) : (
            <span
              key={i}
              className={
                "flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-[14.5px] " +
                (item.active
                  ? "bg-[#eef2ff] font-semibold text-[#4f46e5]"
                  : "font-medium text-[#6b7280]")
              }
            >
              {item.icon ? <Icon name={item.icon} size={20} /> : null}
              {item.label}
            </span>
          ),
        )}
      </nav>
      <div className="mt-auto rounded-[12px] bg-[#f5f6f8] p-2.5 text-[12.5px] leading-relaxed text-[#6b7280]">
        Clínica de ejemplo · Plan demo
        <br />
        Datos de muestra — no reales
      </div>
    </div>
  );
}

function TopbarDemo() {
  return (
    <div
      className="flex items-center gap-3.5 rounded-[16px] border border-[#ecedf1] bg-white px-[26px] py-3.5"
      style={{ boxShadow: SHADOW }}
    >
      <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-[#e3e5ea] text-[#6b7280]">
        <Icon name="menu" size={19} />
      </span>
      <span className="flex items-center gap-2">
        <Icon name="sun" size={21} className="text-[#d97706]" />
        <b className="text-[16px] font-semibold text-[#161a23]">Buenos días, Usuario</b>
      </span>
      <div className="relative max-w-[420px] flex-1">
        <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9aa1ad]" />
        <input
          readOnly
          placeholder="Buscar pacientes, citas, tratamientos…"
          className="h-[42px] w-full rounded-[12px] border border-[#e3e5ea] bg-[#f5f6f8] pl-[42px] pr-4 text-[14.5px] text-[#161a23] outline-none placeholder:text-[#9aa1ad]"
        />
      </div>
      <div className="ml-auto flex items-center gap-2.5">
        <button
          type="button"
          className="flex h-[40px] items-center gap-2 rounded-[11px] bg-[#4f46e5] px-4 text-[14px] font-semibold text-white"
          style={{ boxShadow: "0 1px 2px rgba(79,70,229,.25)" }}
        >
          <Sparkles size={18} />
          Personalizar
        </button>
        <div className="flex items-center gap-2.5 pl-1.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef2ff] text-[14px] font-bold text-[#4f46e5]">
            EJ
          </div>
          <div className="leading-tight">
            <b className="block text-[14px] font-semibold text-[#161a23]">Usuario Ejemplo</b>
            <span className="text-[12.5px] text-[#4f46e5]">Rol de ejemplo</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DrawerDemo() {
  const [open, setOpen] = useState(true);
  const [sections, setSections] = useState<boolean[]>(() => DRAWER_SECTIONS.map((s) => s.defaultOpen));

  return (
    <div className="flex items-start gap-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-[40px] items-center gap-2 rounded-[11px] bg-[#4f46e5] px-4 text-[14px] font-semibold text-white"
        style={{ boxShadow: "0 1px 2px rgba(79,70,229,.25)" }}
      >
        <Sparkles size={18} />
        {open ? "Cerrar drawer de ejemplo" : "Abrir drawer de ejemplo"}
      </button>

      {open ? (
        <div
          className="w-[336px] flex-none overflow-hidden rounded-[16px] border border-[#ecedf1] bg-white"
          style={{ boxShadow: SHADOW }}
        >
          <div className="flex items-center justify-between border-b border-[#ecedf1] px-5 py-[18px]">
            <b className="flex items-center gap-2 text-[16px] font-bold text-[#161a23]">
              <Sparkles size={19} className="text-[#4f46e5]" />
              Personalizar (ejemplo)
            </b>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-[#e3e5ea] text-[#6b7280]"
            >
              <X size={17} />
            </button>
          </div>

          <div className="px-5 py-[18px]">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-[8px] bg-[#ecfdf5] px-2.5 py-1 text-[12px] font-semibold text-[#059669]">
              <span className="inline-block h-[7px] w-[7px] animate-pulse rounded-full bg-[#059669]" />
              En vivo · ejemplo visual
            </span>

            {DRAWER_SECTIONS.map((section, i) => (
              <div key={section.title} className="mb-3 overflow-hidden rounded-[13px] border border-[#ecedf1]">
                <button
                  type="button"
                  onClick={() =>
                    setSections((prev) => prev.map((v, idx) => (idx === i ? !v : v)))
                  }
                  className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[#eef2ff] text-[#4f46e5]">
                    <Icon name={section.icon} size={17} />
                  </span>
                  <span className="flex-1">
                    <b className="block text-[13.5px] font-semibold text-[#161a23]">{section.title}</b>
                    <span className="text-[12px] text-[#6b7280]">{section.subtitle}</span>
                  </span>
                  <ChevronDown
                    size={18}
                    className={"text-[#9aa1ad] transition-transform " + (sections[i] ? "rotate-180" : "")}
                  />
                </button>
                {sections[i] ? (
                  <div className="px-3.5 pb-4 text-[12.5px] text-[#6b7280]">
                    Contenido de ejemplo — solo demuestra el patrón visual de sección colapsable.
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="flex gap-2.5 border-t border-[#ecedf1] px-5 py-3.5">
            <button
              type="button"
              className="h-[42px] flex-1 rounded-[11px] border border-[#e3e5ea] bg-white text-[13.5px] font-semibold text-[#6b7280]"
            >
              Cancelar
            </button>
            <button type="button" className="h-[42px] flex-1 rounded-[11px] bg-[#4f46e5] text-[13.5px] font-semibold text-white">
              Guardar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function StyleguideClient() {
  return (
    <div
      className="min-h-screen bg-[#f5f6f8] p-7 text-[#161a23]"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-8 rounded-[13px] border border-[#fde68a] bg-[#fff7ed] px-4 py-3 text-[13px] font-semibold text-[#d97706]">
          Página interna de estilo — uso exclusivo de desarrollo. Todos los datos son de ejemplo, no
          representan información real de ninguna organización.
        </div>

        <h1 className="mb-1 text-[26px] font-bold tracking-[-0.02em]">Nelzzon — Style Guide (interno)</h1>
        <p className="mb-8 text-[13px] text-[#6b7280]">
          Basado en docs/NELZZON_STYLE_GUIDE.md (secciones 3 a 12), tomadas de
          docs/visual-references/nelzzon-dashboard.html.
        </p>

        <Section title="3. Paleta de colores">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {PALETTE_TOKENS.map((t) => (
              <div key={t.token} className="rounded-[13px] border border-[#ecedf1] bg-white p-3">
                <div className="mb-2 h-10 rounded-[9px] border border-[#e3e5ea]" style={{ background: t.value }} />
                <div className="text-[12.5px] font-semibold text-[#161a23]">{t.token}</div>
                <div className="text-[12px] text-[#6b7280]">{t.value}</div>
                <div className="mt-1 text-[12px] text-[#9aa1ad]">{t.use}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="4. Tipografía">
          <div className="flex flex-col gap-3">
            {TYPOGRAPHY_SAMPLES.map((t) => (
              <div key={t.label} className="rounded-[13px] border border-[#ecedf1] bg-white p-4">
                <div className="mb-1 text-[12px] font-semibold uppercase tracking-[0.02em] text-[#9aa1ad]">
                  {t.label} — {t.spec}
                </div>
                <div className={t.className}>{t.sample}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="5. Espaciado y radios">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SPACING_TOKENS.map((s) => (
              <div key={s.token} className="rounded-[13px] border border-[#ecedf1] bg-white p-4">
                <div className="text-[13px] font-semibold text-[#161a23]">{s.token}</div>
                <div className="text-[12.5px] text-[#6b7280]">{s.value} — {s.use}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="6. Iconografía">
          <div className="flex flex-wrap gap-4">
            {ICON_SAMPLES.map((s) => (
              <div
                key={s.label}
                className="flex min-w-[160px] flex-col items-center gap-2 rounded-[13px] border border-[#ecedf1] bg-white p-4"
              >
                <Icon name={s.name} size={s.size} className="text-[#4f46e5]" />
                <div className="text-center text-[12px] text-[#6b7280]">{s.label}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="7. Tarjetas / KPI">
          <div className="mb-4 grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
            {KPI_CARDS.map((c) => (
              <Card key={c.label} card={c} />
            ))}
          </div>
          <div className="mb-4 grid grid-cols-1 gap-[18px] md:grid-cols-2" style={{ gridTemplateColumns: "1.7fr 1fr" }}>
            {SECONDARY_CARDS_ROW1.map((c) => (
              <Card key={c.label} card={c} />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2" style={{ gridTemplateColumns: "1.7fr 1fr" }}>
            {SECONDARY_CARDS_ROW2.map((c) => (
              <Card key={c.label} card={c} />
            ))}
          </div>
        </Section>

        <Section title="8. Badges de estado">
          <div className="flex flex-wrap gap-3">
            {BADGE_SAMPLES.map((b) => (
              <Badge key={b.text} variant={b.variant} icon={b.icon} text={b.text} />
            ))}
          </div>
        </Section>

        <Section title="9. Botones">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="flex h-[40px] items-center gap-2 rounded-[11px] bg-[#4f46e5] px-4 text-[14px] font-semibold text-white"
              style={{ boxShadow: "0 1px 2px rgba(79,70,229,.25)" }}
            >
              <Sparkles size={18} />
              Botón primario
            </button>
            <button
              type="button"
              aria-label="Botón icono"
              className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-[#e3e5ea] bg-white text-[#6b7280]"
            >
              <Menu size={19} />
            </button>
            <button
              type="button"
              className="h-[42px] rounded-[11px] border border-[#e3e5ea] bg-white px-5 text-[13.5px] font-semibold text-[#6b7280]"
            >
              Botón ghost (Cancelar)
            </button>
            <button type="button" className="h-[42px] rounded-[11px] bg-[#4f46e5] px-5 text-[13.5px] font-semibold text-white">
              Botón solid (Guardar)
            </button>
          </div>
        </Section>

        <Section title="10. Sidebar (demo visual)">
          <SidebarDemo />
        </Section>

        <Section title="11. Topbar (demo visual)">
          <TopbarDemo />
        </Section>

        <Section title="12. Drawer lateral (demo visual)">
          <DrawerDemo />
        </Section>
      </div>
    </div>
  );
}
