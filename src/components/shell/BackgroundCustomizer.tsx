"use client";

// Personalizar > Fondos e imágenes (FASE 1M-D) — estilo, intensidad y blur del
// fondo del Dashboard y de la vista previa, más una imagen propia opcional
// (data URL, <700 KB, solo en este navegador). Todo se aplica de inmediato vía
// data-visual-background* en <html> y --visual-bg-image (globals.css). Sin
// servidor, sin subir archivos.

import { useRef, useState } from "react";
import { ImageIcon, Upload, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useVisualPreferences,
  VISUAL_BACKGROUND_STYLES,
  VISUAL_BACKGROUND_INTENSITIES,
  VISUAL_BACKGROUND_BLURS,
  MAX_BACKGROUND_IMAGE_BYTES,
  BACKGROUND_GALLERY,
  BACKGROUND_GALLERY_CATEGORIES,
  type VisualBackgroundStyle,
  type VisualBackgroundIntensity,
  type VisualBackgroundBlur,
} from "@/lib/visual-preferences";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

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
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
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

export function BackgroundCustomizer() {
  const {
    editorPreferences: preferences,
    setBackgroundStyle,
    setBackgroundIntensity,
    setBackgroundBlur,
    setBackgroundImageDataUrl,
    clearBackgroundImage,
    setBackgroundPresetId,
    resetBackground,
  } = useVisualPreferences();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Formato no soportado — usa PNG, JPEG o WEBP.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_BACKGROUND_IMAGE_BYTES) {
      setError("Imagen demasiado pesada para guardado local");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setError(null);
        setBackgroundImageDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div className="space-y-4">
      <p className="text-[11px] leading-snug text-muted-foreground">
        Elige el estilo, intensidad y blur del fondo de tu Dashboard — o sube tu propia imagen. Todo se
        aplica de inmediato y se guarda en este navegador.
      </p>

      <div className="space-y-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Galería de fondos</p>
        {BACKGROUND_GALLERY_CATEGORIES.map((category) => (
          <div key={category} className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground/70">{category}</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {BACKGROUND_GALLERY.filter((entry) => entry.category === category).map((entry) => {
                const active = preferences.backgroundPresetId === entry.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    title={entry.label}
                    aria-pressed={active}
                    onClick={() => setBackgroundPresetId(entry.id)}
                    className={cn(
                      "group relative flex flex-col gap-1 rounded-lg border p-1 text-left transition-all",
                      active ? "border-brand-accent/50 ring-2 ring-brand-accent/30" : "border-transparent hover:border-foreground/10"
                    )}
                  >
                    <span
                      aria-hidden
                      className="block h-10 w-full rounded-md ring-1 ring-foreground/[0.06]"
                      style={{ backgroundImage: entry.preview, backgroundSize: entry.id.startsWith("patron-") ? "16px 16px" : "cover" }}
                    />
                    <span className="truncate text-[10px] leading-snug text-muted-foreground">{entry.label}</span>
                    {active && (
                      <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-brand-accent text-brand-accent-foreground">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Segmented
        label="Estilo de fondo"
        options={VISUAL_BACKGROUND_STYLES}
        value={preferences.backgroundStyle}
        onChange={(backgroundStyle: VisualBackgroundStyle) => setBackgroundStyle(backgroundStyle)}
      />

      <Segmented
        label="Intensidad"
        options={VISUAL_BACKGROUND_INTENSITIES}
        value={preferences.backgroundIntensity}
        onChange={(backgroundIntensity: VisualBackgroundIntensity) => setBackgroundIntensity(backgroundIntensity)}
      />

      <Segmented
        label="Blur"
        options={VISUAL_BACKGROUND_BLURS}
        value={preferences.backgroundBlur}
        onChange={(backgroundBlur: VisualBackgroundBlur) => setBackgroundBlur(backgroundBlur)}
      />

      <div className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Imagen propia</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors hover:bg-muted"
          >
            <Upload className="h-3 w-3" />
            Subir imagen
          </button>
          {preferences.backgroundImageDataUrl && (
            <button
              type="button"
              onClick={clearBackgroundImage}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3 w-3" />
              Quitar imagen
            </button>
          )}
        </div>
        {error && <p className="text-[11px] text-rose-600 dark:text-rose-400">{error}</p>}
        {preferences.backgroundImageDataUrl ? (
          <div
            aria-hidden
            className="h-16 w-full overflow-hidden rounded-lg border bg-cover bg-center"
            style={{ backgroundImage: `url(${preferences.backgroundImageDataUrl})` }}
          />
        ) : (
          <div className="flex h-16 w-full items-center justify-center gap-2 rounded-lg border border-dashed text-[11px] text-muted-foreground">
            <ImageIcon className="h-3.5 w-3.5" />
            Sin imagen propia
          </div>
        )}
        <p className="text-[11px] leading-snug text-muted-foreground">
          PNG, JPEG o WEBP — máximo 700 KB para guardarse en este navegador.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border bg-background/60 px-4 py-3">
        <p className="text-[11px] leading-snug text-muted-foreground">
          Guardado en este navegador — cada cambio se aplica y se guarda automáticamente.
        </p>
        <button
          type="button"
          onClick={resetBackground}
          className="inline-flex shrink-0 items-center rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors hover:bg-muted"
        >
          Resetear fondo
        </button>
      </div>
    </div>
  );
}
