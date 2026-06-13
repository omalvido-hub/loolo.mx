"use client";

// FASE 1M-F — "Cambiar estilo completo": flujo simple de 3 pasos, sin
// palabras técnicas. Reutiliza el motor existente (plantillas de negocio +
// estilos + galería de fondos de visual-preferences.tsx); aquí solo se eligen
// nombres y se ve una vista previa grande que se actualiza al instante.

import { useState } from "react";
import { ChevronLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PersonalizationPreviewCanvas } from "@/components/shell/PersonalizationPreviewCanvas";
import {
  useVisualPreferences,
  BUSINESS_TYPE_GROUPS,
  STYLE_OPTIONS,
  BUSINESS_VISUAL_TEMPLATES,
  BUSINESS_TEMPLATE_KEYS,
  BACKGROUND_GALLERY,
  type BusinessTemplateId,
  type SimpleStyleId,
} from "@/lib/visual-preferences";

type WizardStep = 1 | 2 | 3;

export function StyleWizard() {
  const { preferences, applyBusinessTemplate, resetBusinessTemplate, applyStyleOption } = useVisualPreferences();
  const [step, setStep] = useState<WizardStep>(1);
  const [selectedStyle, setSelectedStyle] = useState<SimpleStyleId | null>(null);

  function goBack() {
    setStep((s) => (s > 1 ? ((s - 1) as WizardStep) : s));
  }

  return (
    <div className="space-y-4">
      <PersonalizationPreviewCanvas />

      {step > 1 && (
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="h-3 w-3" />
          Atrás
        </button>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">¿Qué tipo de negocio tienes?</h3>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Elige el que más se parezca al tuyo — puedes cambiarlo cuando quieras.
              </p>
            </div>
            <button
              type="button"
              onClick={resetBusinessTemplate}
              className="shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Restaurar estilo base
            </button>
          </div>
          {BUSINESS_TYPE_GROUPS.map((group) => (
            <div key={group.key} className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{group.label}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {group.options.map((option) => {
                  const active = preferences.businessTemplateId === option.templateId;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        applyBusinessTemplate(option.templateId);
                        setStep(2);
                      }}
                      className={cn(
                        "rounded-xl border px-3 py-3 text-left text-xs font-medium transition-all",
                        active ? "border-brand-accent/50 ring-2 ring-brand-accent/30 bg-brand-accent-soft text-brand-accent" : "border-transparent bg-background/60 hover:border-foreground/10"
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">¿Qué estilo te gusta?</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Elige el que más te guste — lo verás reflejado arriba al instante.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {STYLE_OPTIONS.map((style) => {
              const active = selectedStyle === style.key;
              return (
                <button
                  key={style.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setSelectedStyle(style.key);
                    applyStyleOption(style.key);
                    setStep(3);
                  }}
                  className={cn(
                    "flex flex-col gap-1 rounded-xl border p-3 text-left transition-all",
                    active ? "border-brand-accent/50 ring-2 ring-brand-accent/30" : "border-transparent bg-background/60 hover:border-foreground/10"
                  )}
                >
                  <span className="text-xs font-semibold">{style.label}</span>
                  <span className="text-[10px] leading-snug text-muted-foreground">{style.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Elige cómo se vería tu nelzzon</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Estas son algunas variantes con tu estilo elegido — toca &quot;Aplicar este estilo&quot; en la que más te guste.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {BUSINESS_TEMPLATE_KEYS.map((key) => (
              <TemplateGalleryCard
                key={key}
                templateId={key}
                active={preferences.businessTemplateId === key}
                onApply={() => {
                  applyBusinessTemplate(key);
                  if (selectedStyle) applyStyleOption(selectedStyle);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateGalleryCard({
  templateId,
  active,
  onApply,
}: {
  templateId: BusinessTemplateId;
  active: boolean;
  onApply: () => void;
}) {
  const tpl = BUSINESS_VISUAL_TEMPLATES[templateId];
  const bg = BACKGROUND_GALLERY.find((entry) => entry.id === tpl.backgroundPreset);

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-2xl border p-3 transition-all",
        active ? "border-brand-accent/50 ring-2 ring-brand-accent/30" : "border-transparent bg-background/60"
      )}
    >
      <div
        aria-hidden
        className="overflow-hidden rounded-lg ring-1 ring-foreground/[0.06]"
        style={{ backgroundImage: bg?.preview }}
      >
        <div className="grid grid-cols-3 gap-1 p-2">
          <span className="col-span-2 row-span-2 h-8 rounded-md bg-card/70 ring-1 ring-foreground/[0.05]" />
          <span className="h-3.5 rounded-md bg-card/60 ring-1 ring-foreground/[0.05]" />
          <span className="h-3.5 rounded-md bg-card/60 ring-1 ring-foreground/[0.05]" />
          <span className="col-span-2 h-3.5 rounded-md bg-card/50 ring-1 ring-foreground/[0.05]" />
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold">{tpl.label}</p>
        <p className="text-[10px] leading-snug text-muted-foreground">{tpl.usage}</p>
      </div>
      <button
        type="button"
        onClick={onApply}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors",
          active ? "bg-brand-accent-soft text-brand-accent" : "bg-primary text-primary-foreground hover:bg-primary/80"
        )}
      >
        {active && <Check className="h-3 w-3" />}
        Aplicar este estilo
      </button>
    </div>
  );
}
