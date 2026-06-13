"use client";

// Personalizar > Módulos (FASE 1M-C) — identidad visual de cada módulo, KPI y
// widget de nelzzon: tipo (emoji / icono / iniciales / badge), estilo, color,
// forma y visibilidad, con reset individual y global. Hoy se aplica de verdad
// a los 8 widgets del Dashboard (vía ModuleIcon); los módulos del sistema
// quedan con su identidad lista para cuando tengan su propio encabezado. Todo
// vive en localStorage (nelzzon.moduleIdentity.v1) — sin DB, sin servidor.

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModuleIcon } from "@/components/ui/module-icon";
import {
  useModuleIdentities,
  MODULE_ICON_LIBRARY,
  MODULE_EMOJI_LIBRARY,
  MODULE_ICON_CATEGORIES,
  MODULE_ICON_STYLES,
  MODULE_ACCENT_COLORS,
  MODULE_SHAPES,
  MODULE_ICON_POSITIONS,
  MODULE_ICON_SIZES,
  MODULE_CONTENT_ALIGNS,
  MODULE_CARD_APPEARANCES,
  MODULE_CARD_BACKGROUNDS,
  MODULE_CARD_BORDERS,
  MODULE_CARD_SHADOWS,
  type ModuleIdentityDefinition,
  type ModuleIdentityType,
  type ModuleAccentColor,
  type ModuleIconStyle,
  type ModuleShape,
  type ModuleIconPosition,
  type ModuleIconSize,
  type ModuleContentAlign,
  type ModuleCardAppearance,
  type ModuleCardBackground,
  type ModuleCardBorder,
  type ModuleCardShadow,
} from "@/lib/module-identity";
import { useVisualPreferences, MODULE_TILE_STYLES, type ModuleTileStyle } from "@/lib/visual-preferences";

const TYPE_OPTIONS: { key: ModuleIdentityType; label: string }[] = [
  { key: "icon", label: "Icono" },
  { key: "emoji", label: "Emoji" },
  { key: "initials", label: "Iniciales" },
  { key: "badge", label: "Badge" },
];

const ACCENT_SWATCH_CLASS: Record<ModuleAccentColor, string> = {
  teal: "bg-sky-500",
  violet: "bg-violet-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  slate: "bg-slate-500",
  blue: "bg-blue-500",
  cyan: "bg-cyan-500",
  neutral: "bg-foreground/60",
};

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={label}>
        {options.map((opt) => {
          const active = opt.key === value;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              role="radio"
              aria-checked={active}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                active ? "border-brand-accent/40 bg-brand-accent-soft text-brand-accent" : "border-transparent bg-muted/40 text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function VisibilitySwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-brand-accent" : "bg-muted")}
    >
      <span
        className={cn(
          "absolute top-0.5 size-4 rounded-full bg-background shadow-sm transition-transform",
          checked ? "translate-x-[1.125rem]" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

function ModuleIdentityEditor({ def }: { def: ModuleIdentityDefinition }) {
  const { getIdentity, setIdentity, resetIdentity } = useModuleIdentities();
  const [open, setOpen] = useState(false);
  const view = getIdentity(def.id);

  return (
    <li className="rounded-xl border bg-background/60">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <ModuleIcon id={def.id} />
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className="truncate text-xs font-medium">{def.label}</span>
          <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
        <VisibilitySwitch checked={!view.hidden} onChange={(v) => setIdentity(def.id, { hidden: !v })} />
      </div>

      {open && (
        <div className="space-y-3 border-t px-3 py-3">
          <Segmented label="Tipo" options={TYPE_OPTIONS} value={view.type} onChange={(type) => setIdentity(def.id, { type })} />

          {view.type === "icon" && (
            <div className="space-y-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Icono profesional</p>
              {MODULE_ICON_CATEGORIES.map((cat) => (
                <div key={cat.key} className="space-y-1">
                  <p className="text-[10px] text-muted-foreground/70">{cat.label}</p>
                  <div className="flex flex-wrap gap-1">
                    {MODULE_ICON_LIBRARY.filter((entry) => entry.category === cat.key).map((entry) => {
                      const Icon = entry.Icon;
                      const active = view.iconKey === entry.key;
                      return (
                        <button
                          key={entry.key}
                          type="button"
                          title={entry.label}
                          aria-pressed={active}
                          onClick={() => setIdentity(def.id, { iconKey: entry.key, type: "icon" })}
                          className={cn(
                            "flex size-7 items-center justify-center rounded-lg border transition-colors",
                            active ? "border-brand-accent/40 bg-brand-accent-soft text-brand-accent" : "border-transparent bg-muted/40 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {view.type === "emoji" && (
            <div className="space-y-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Emoji</p>
              <input
                type="text"
                value={view.emoji}
                maxLength={4}
                onChange={(e) => setIdentity(def.id, { emoji: e.target.value, type: "emoji" })}
                placeholder="Escribe un emoji"
                className="w-28 rounded-lg border bg-muted/30 px-2.5 py-1.5 text-sm focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {MODULE_ICON_CATEGORIES.map((cat) => (
                <div key={cat.key} className="space-y-1">
                  <p className="text-[10px] text-muted-foreground/70">{cat.label}</p>
                  <div className="flex flex-wrap gap-1">
                    {MODULE_EMOJI_LIBRARY.filter((entry) => entry.category === cat.key).map((entry) => {
                      const active = view.emoji === entry.value;
                      return (
                        <button
                          key={entry.value + entry.label}
                          type="button"
                          title={entry.label}
                          aria-pressed={active}
                          onClick={() => setIdentity(def.id, { emoji: entry.value, type: "emoji" })}
                          className={cn(
                            "flex size-7 items-center justify-center rounded-lg border text-sm transition-colors",
                            active ? "border-brand-accent/40 bg-brand-accent-soft" : "border-transparent bg-muted/40 hover:bg-muted"
                          )}
                        >
                          {entry.value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {view.type === "initials" && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Iniciales</p>
              <input
                type="text"
                value={view.initials}
                maxLength={2}
                onChange={(e) => setIdentity(def.id, { initials: e.target.value.toUpperCase(), type: "initials" })}
                placeholder="Ej. AG"
                className="w-20 rounded-lg border bg-muted/30 px-2.5 py-1.5 text-center text-sm font-semibold uppercase tracking-wide focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          )}

          {view.type === "badge" && (
            <p className="text-[11px] leading-snug text-muted-foreground">
              Un badge de color, sin icono ni texto — define su forma y color abajo.
            </p>
          )}

          <Segmented label="Estilo" options={MODULE_ICON_STYLES} value={view.style} onChange={(style: ModuleIconStyle) => setIdentity(def.id, { style })} />

          <div className="space-y-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Color</p>
            <div className="flex flex-wrap gap-2">
              {MODULE_ACCENT_COLORS.map((accent) => {
                const active = view.color === accent.key;
                return (
                  <button
                    key={accent.key}
                    type="button"
                    title={accent.label}
                    aria-pressed={active}
                    onClick={() => setIdentity(def.id, { color: accent.key })}
                    className={cn("flex size-6 items-center justify-center rounded-full ring-2 transition-all", active ? "ring-foreground/60" : "ring-transparent hover:ring-foreground/20")}
                  >
                    <span className={cn("size-4 rounded-full", ACCENT_SWATCH_CLASS[accent.key])} />
                  </button>
                );
              })}
            </div>
          </div>

          <Segmented label="Forma" options={MODULE_SHAPES} value={view.shape} onChange={(shape: ModuleShape) => setIdentity(def.id, { shape })} />

          {def.section === "module" && (
            <p className="text-[11px] leading-snug text-muted-foreground">
              Esta identidad se aplicará cuando este módulo tenga su propio encabezado visual.
            </p>
          )}

          {def.section === "dashboard-widget" && (
            <div className="space-y-3 border-t pt-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Tarjeta avanzada</p>
              <Segmented
                label="Posición del icono"
                options={MODULE_ICON_POSITIONS}
                value={view.iconPosition}
                onChange={(iconPosition: ModuleIconPosition) => setIdentity(def.id, { iconPosition })}
              />
              <Segmented
                label="Tamaño del icono"
                options={MODULE_ICON_SIZES}
                value={view.iconSize}
                onChange={(iconSize: ModuleIconSize) => setIdentity(def.id, { iconSize })}
              />
              <Segmented
                label="Alineación del contenido"
                options={MODULE_CONTENT_ALIGNS}
                value={view.contentAlign}
                onChange={(contentAlign: ModuleContentAlign) => setIdentity(def.id, { contentAlign })}
              />
              <Segmented
                label="Apariencia de la tarjeta"
                options={MODULE_CARD_APPEARANCES}
                value={view.cardAppearance}
                onChange={(cardAppearance: ModuleCardAppearance) => setIdentity(def.id, { cardAppearance })}
              />
              <Segmented
                label="Fondo de la tarjeta"
                options={MODULE_CARD_BACKGROUNDS}
                value={view.cardBackground}
                onChange={(cardBackground: ModuleCardBackground) => setIdentity(def.id, { cardBackground })}
              />
              <Segmented
                label="Borde de la tarjeta"
                options={MODULE_CARD_BORDERS}
                value={view.cardBorder}
                onChange={(cardBorder: ModuleCardBorder) => setIdentity(def.id, { cardBorder })}
              />
              <Segmented
                label="Sombra de la tarjeta"
                options={MODULE_CARD_SHADOWS}
                value={view.cardShadow}
                onChange={(cardShadow: ModuleCardShadow) => setIdentity(def.id, { cardShadow })}
              />
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => resetIdentity(def.id)}
              className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Restaurar este módulo
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export function ModuleIdentityCustomizer() {
  const { registry, resetAllIcons, resetAllIdentities } = useModuleIdentities();
  const { preferences, setModuleTileStyle } = useVisualPreferences();
  const [showAllModules, setShowAllModules] = useState(false);

  const dashboardWidgets = registry.filter((def) => def.section === "dashboard-widget");
  const systemModules = registry.filter((def) => def.section === "module");

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium">Estoy personalizando mis módulos</p>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          Elige el icono, emoji, iniciales o badge de cada módulo, su color, estilo y forma — y muestra u
          oculta widgets del Dashboard. Todo se guarda en este navegador.
        </p>
      </div>

      <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Estilo de módulos</p>
        <p className="text-[11px] leading-snug text-muted-foreground">
          Define la forma y textura de las tarjetas de módulo en todo nelzzon.
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {MODULE_TILE_STYLES.map((opt) => {
            const active = preferences.moduleTileStyle === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                aria-pressed={active}
                title={opt.description}
                onClick={() => setModuleTileStyle(opt.key as ModuleTileStyle)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-all",
                  active ? "border-brand-accent/50 ring-2 ring-brand-accent/30 bg-brand-accent-soft" : "border-transparent bg-background/60 hover:border-foreground/10"
                )}
              >
                <span aria-hidden className="block h-6 w-full rounded-md bg-foreground/10" />
                <span className="truncate text-[10px] font-medium">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={resetAllIcons}
          className="inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors hover:bg-muted"
        >
          Resetear todos los iconos
        </button>
        <button
          type="button"
          onClick={resetAllIdentities}
          className="inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors hover:bg-muted"
        >
          Resetear toda la identidad de módulos
        </button>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Widgets del Dashboard</p>
        <ul className="space-y-1.5">
          {dashboardWidgets.map((def) => (
            <ModuleIdentityEditor key={def.id} def={def} />
          ))}
        </ul>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowAllModules((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl border bg-muted/20 px-3 py-2 text-left"
        >
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Módulos del sistema ({systemModules.length})
          </span>
          <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", showAllModules && "rotate-180")} />
        </button>
        {showAllModules && (
          <ul className="mt-2 space-y-1.5">
            {systemModules.map((def) => (
              <ModuleIdentityEditor key={def.id} def={def} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
