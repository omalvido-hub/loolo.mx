"use client";

import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { HexColorPicker } from "react-colorful";
import { cn } from "@/lib/utils";
import styles from "./zip-dashboard-react.module.css";
import {
  GALLERY_BACKGROUNDS,
  MAX_BACKGROUND_IMAGE_BYTES,
  PATTERN_KEYS,
  PATTERN_LABELS,
  SOLID_BACKGROUNDS,
  getPatternBackground,
  isValidHex,
  resetBackgroundPreferences,
  type BackgroundType,
  type DashboardPreferences,
  type GalleryBg,
  type GradientDirection,
  type PatternKey,
} from "./dashboard-preferences";

// ── Palette categories (UI only, not stored) ──────────────────────────────────

interface PaletteSwatch  { value: string; label: string; }
interface PaletteCategory { label: string; swatches: PaletteSwatch[]; }

const PALETTE_CATEGORIES: PaletteCategory[] = [
  { label: "Nelzzon", swatches: [
    { value: "#4f46e5", label: "Índigo" },
    { value: "#0284c7", label: "Azul" },
    { value: "#059669", label: "Verde" },
    { value: "#7c3aed", label: "Violeta" },
    { value: "#0891b2", label: "Aqua" },
  ]},
  { label: "Pasteles", swatches: [
    { value: "#8b5cf6", label: "Lavanda" },
    { value: "#ec4899", label: "Rosa" },
    { value: "#14b8a6", label: "Teal" },
    { value: "#f59e0b", label: "Ámbar" },
    { value: "#84cc16", label: "Lima" },
  ]},
  { label: "Vibrantes", swatches: [
    { value: "#ef4444", label: "Rojo" },
    { value: "#f97316", label: "Naranja" },
    { value: "#eab308", label: "Amarillo" },
    { value: "#22c55e", label: "Verde vivo" },
    { value: "#3b82f6", label: "Azul vivo" },
  ]},
  { label: "Neutros", swatches: [
    { value: "#475569", label: "Pizarra" },
    { value: "#64748b", label: "Gris az." },
    { value: "#6b7280", label: "Gris" },
    { value: "#57534e", label: "Piedra" },
    { value: "#374151", label: "Carbón" },
  ]},
  { label: "Profesionales", swatches: [
    { value: "#1e40af", label: "Marina" },
    { value: "#15803d", label: "Botella" },
    { value: "#7e22ce", label: "Ciruela" },
    { value: "#9f1239", label: "Granate" },
    { value: "#0f766e", label: "Esmeralda" },
  ]},
];

// ── Gallery categories ────────────────────────────────────────────────────────

interface GalleryCategory { label: string; items: GalleryBg[]; }

const GALLERY_CAT_DEFS = [
  { label: "Minimal / limpio",    cat: "minimal"   },
  { label: "Pastel / suave",      cat: "pastel"    },
  { label: "Abstracto / premium", cat: "abstracto" },
  { label: "Ondas / fluidos",     cat: "ondas"     },
  { label: "Glass / moderno",     cat: "glass"     },
  { label: "Oscuro elegante",     cat: "oscuro"    },
  { label: "Creativo / colorido", cat: "creativo"  },
];

const GALLERY_CATEGORIES: GalleryCategory[] = GALLERY_CAT_DEFS.map(({ label, cat }) => ({
  label,
  items: GALLERY_BACKGROUNDS.filter((b) => b.category === cat),
}));

// ── Solid background categories ───────────────────────────────────────────────

const SOLID_CATEGORIES = [
  { label: "Claros",    keys: ["default", "blanco", "nieve", "perla"] },
  { label: "Pasteles",  keys: ["azulado", "menta-sol", "lavanda-sol", "durazno-sol"] },
  { label: "Neutros",   keys: ["calido", "arena", "pizarra", "piedra"] },
  { label: "Oscuros",   keys: ["azul-noche", "carbon", "bosque-n"] },
];

const GRADIENT_DIR_LABELS: Record<GradientDirection, string> = {
  "135deg": "↘ 135°",
  "90deg":  "→ 90°",
  "180deg": "↓ 180°",
  "45deg":  "↗ 45°",
};

const BG_TYPE_DEFAULT: Record<BackgroundType, string> = {
  solido:  "default",
  galeria: GALLERY_BACKGROUNDS[0]?.key ?? "min-1",
  patron:  PATTERN_KEYS[0],
  manual:  "",
  imagen:  "",
};

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ColorFondsSectionProps {
  prefs:          DashboardPreferences;
  setPrefs:       React.Dispatch<React.SetStateAction<DashboardPreferences>>;
  activeAccentHex: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ColorFondsSection({ prefs, setPrefs, activeAccentHex }: ColorFondsSectionProps) {
  const [hexDraft,      setHexDraft]      = useState(() => activeAccentHex);
  const [gradFromDraft, setGradFromDraft] = useState(() => prefs.gradientFrom);
  const [gradToDraft,   setGradToDraft]   = useState(() => prefs.gradientTo);
  const [uploadError,   setUploadError]   = useState<string | null>(null);
  const fileInputRef   = useRef<HTMLInputElement | null>(null);
  const recentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recentAccents = prefs.recentAccents ?? [];

  // Apply a color from swatch or HEX input: updates prefs + adds to recents immediately
  function applyAccentColor(hex: string) {
    if (!isValidHex(hex)) return;
    setPrefs((p) => {
      const recent = [hex, ...(p.recentAccents ?? []).filter((c) => c !== hex)].slice(0, 8);
      return { ...p, accent: "personalizado", customAccentColor: hex, recentAccents: recent };
    });
    setHexDraft(hex);
  }

  // Picker drag: update color live; add to recents 700ms after motion stops
  function handlePickerChange(hex: string) {
    setPrefs((p) => ({ ...p, accent: "personalizado", customAccentColor: hex }));
    setHexDraft(hex);
    if (recentTimerRef.current) clearTimeout(recentTimerRef.current);
    recentTimerRef.current = setTimeout(() => {
      setPrefs((p) => {
        const recent = [hex, ...(p.recentAccents ?? []).filter((c) => c !== hex)].slice(0, 8);
        return { ...p, recentAccents: recent };
      });
    }, 700);
  }

  function handleImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BACKGROUND_IMAGE_BYTES) {
      setUploadError("La imagen debe pesar menos de 200 KB.");
      e.target.value = "";
      return;
    }
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") setPrefs((p) => ({ ...p, backgroundImage: result }));
    };
    reader.readAsDataURL(file);
  }

  function handleResetBackground() {
    const reset = resetBackgroundPreferences(prefs);
    setPrefs(() => reset);
    setGradFromDraft(reset.gradientFrom);
    setGradToDraft(reset.gradientTo);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <>
      {/* ─── Color de acento ─── */}
      <div className={styles.ctlLabel} style={{ marginTop: 4 }}>Color de acento</div>

      {/* HSB + hue picker */}
      <div className={styles.pickerWrap}>
        <HexColorPicker
          color={isValidHex(activeAccentHex) ? activeAccentHex : "#4f46e5"}
          onChange={handlePickerChange}
        />
      </div>

      {/* HEX input + color preview dot */}
      <div className={styles.hexInputRow} style={{ marginTop: 8 }}>
        <span
          className={styles.hexPreview}
          style={{ background: isValidHex(hexDraft) ? hexDraft : activeAccentHex }}
        />
        <input
          type="text"
          className={cn(
            styles.hexInput,
            hexDraft.length >= 4 && !isValidHex(hexDraft) && styles.hexInputError,
          )}
          value={hexDraft}
          placeholder="#4f46e5"
          maxLength={7}
          spellCheck={false}
          onChange={(e) => {
            const val = e.target.value;
            setHexDraft(val);
            if (isValidHex(val)) applyAccentColor(val);
          }}
        />
        {hexDraft.length >= 4 && !isValidHex(hexDraft) && (
          <span className={styles.hexInputErrorMsg}>HEX inválido</span>
        )}
      </div>

      {/* Recientes */}
      {recentAccents.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div className={styles.galleryCatLabel}>Recientes</div>
          <div className={styles.swatchesWrap}>
            {recentAccents.map((hex) => (
              <span
                key={hex}
                title={hex}
                className={cn(styles.sw, activeAccentHex === hex && styles.swOn)}
                style={{ background: hex }}
                onClick={() => applyAccentColor(hex)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Paletas rápidas */}
      {PALETTE_CATEGORIES.map((cat) => (
        <div key={cat.label}>
          <div className={styles.galleryCatLabel}>{cat.label}</div>
          <div className={styles.swatchesWrap}>
            {cat.swatches.map((sw) => (
              <span
                key={sw.value}
                title={sw.label}
                className={cn(styles.sw, activeAccentHex === sw.value && styles.swOn)}
                style={{ background: sw.value }}
                onClick={() => applyAccentColor(sw.value)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* ─── Fondo ─── */}
      <div className={styles.ctlLabel} style={{ marginTop: 18 }}>Fondo</div>
      <div className={styles.seg}>
        {(["solido", "galeria", "patron", "manual", "imagen"] as BackgroundType[]).map((type, i) => (
          <button
            key={type}
            type="button"
            className={cn(prefs.backgroundType === type && styles.segOn)}
            onClick={() =>
              setPrefs((p) => ({ ...p, backgroundType: type, backgroundValue: BG_TYPE_DEFAULT[type] }))
            }
          >
            {["Sólido", "Galería", "Patrón", "Manual", "Imagen"][i]}
          </button>
        ))}
      </div>

      {/* Sólido */}
      {prefs.backgroundType === "solido" && SOLID_CATEGORIES.map((cat) => (
        <div key={cat.label}>
          <div className={styles.galleryCatLabel}>{cat.label}</div>
          <div className={styles.swatchesWrap}>
            {cat.keys.map((k) => {
              const opt = SOLID_BACKGROUNDS.find((s) => s.key === k);
              if (!opt) return null;
              return (
                <span
                  key={k}
                  title={opt.label}
                  className={cn(styles.bgsw, prefs.backgroundValue === k && styles.bgswOn)}
                  style={{ background: opt.value === "transparent" ? "#f5f6f8" : opt.value }}
                  onClick={() => setPrefs((p) => ({ ...p, backgroundValue: k }))}
                />
              );
            })}
          </div>
        </div>
      ))}

      {/* Galería */}
      {prefs.backgroundType === "galeria" && GALLERY_CATEGORIES.map((cat) => (
        <div key={cat.label}>
          <div className={styles.galleryCatLabel}>{cat.label}</div>
          <div className={styles.galleryGrid}>
            {cat.items.map((bg) => (
              <span
                key={bg.key}
                title={bg.label}
                className={cn(styles.galleryItem, prefs.backgroundValue === bg.key && styles.galleryItemOn)}
                style={{ background: bg.css }}
                onClick={() => setPrefs((p) => ({ ...p, backgroundValue: bg.key }))}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Patrón */}
      {prefs.backgroundType === "patron" && (
        <div className={styles.wallpapers} style={{ marginTop: 10 }}>
          {PATTERN_KEYS.map((key) => {
            const pat = getPatternBackground(key);
            return (
              <span
                key={key}
                title={PATTERN_LABELS[key]}
                className={cn(styles.wp, prefs.backgroundValue === key && styles.wpOn)}
                style={{
                  backgroundColor: pat.backgroundColor,
                  backgroundImage: pat.backgroundImage,
                  backgroundSize:  pat.backgroundSize,
                }}
                onClick={() => setPrefs((p) => ({ ...p, backgroundValue: key }))}
              />
            );
          })}
        </div>
      )}

      {/* Degradado manual */}
      {prefs.backgroundType === "manual" && (
        <>
          <div className={styles.ctlLabel} style={{ marginTop: 10 }}>Dirección</div>
          <div className={styles.seg}>
            {(["135deg", "90deg", "180deg", "45deg"] as GradientDirection[]).map((dir) => (
              <button
                key={dir}
                type="button"
                className={cn(prefs.gradientDirection === dir && styles.segOn)}
                onClick={() => setPrefs((p) => ({ ...p, gradientDirection: dir }))}
              >
                {GRADIENT_DIR_LABELS[dir]}
              </button>
            ))}
          </div>
          <div className={styles.gradientPair}>
            <div className={styles.gradientColorItem}>
              <div className={styles.ctlLabel} style={{ margin: "8px 0 5px" }}>Desde</div>
              <div className={styles.hexInputRow}>
                <span
                  className={styles.hexPreview}
                  style={{ background: isValidHex(gradFromDraft) ? gradFromDraft : prefs.gradientFrom }}
                />
                <input
                  type="text"
                  className={cn(
                    styles.hexInput,
                    gradFromDraft.length >= 4 && !isValidHex(gradFromDraft) && styles.hexInputError,
                  )}
                  value={gradFromDraft}
                  placeholder="#eef2ff"
                  maxLength={7}
                  spellCheck={false}
                  onChange={(e) => {
                    const val = e.target.value;
                    setGradFromDraft(val);
                    if (isValidHex(val)) setPrefs((p) => ({ ...p, gradientFrom: val }));
                  }}
                />
              </div>
            </div>
            <div className={styles.gradientColorItem}>
              <div className={styles.ctlLabel} style={{ margin: "8px 0 5px" }}>Hasta</div>
              <div className={styles.hexInputRow}>
                <span
                  className={styles.hexPreview}
                  style={{ background: isValidHex(gradToDraft) ? gradToDraft : prefs.gradientTo }}
                />
                <input
                  type="text"
                  className={cn(
                    styles.hexInput,
                    gradToDraft.length >= 4 && !isValidHex(gradToDraft) && styles.hexInputError,
                  )}
                  value={gradToDraft}
                  placeholder="#f5f3ff"
                  maxLength={7}
                  spellCheck={false}
                  onChange={(e) => {
                    const val = e.target.value;
                    setGradToDraft(val);
                    if (isValidHex(val)) setPrefs((p) => ({ ...p, gradientTo: val }));
                  }}
                />
              </div>
            </div>
          </div>
          <div
            className={styles.gradientPreviewRect}
            style={{
              background: `linear-gradient(${prefs.gradientDirection}, ${prefs.gradientFrom}, ${prefs.gradientTo})`,
            }}
          />
        </>
      )}

      {/* Imagen propia */}
      {prefs.backgroundType === "imagen" && (
        <>
          {prefs.backgroundImage ? (
            <div className={styles.uploadImgRow}>
              <div
                className={styles.uploadImgThumb}
                style={{
                  backgroundImage: `url(${prefs.backgroundImage})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <button
                type="button"
                className={styles.removeImgBtn}
                onClick={() => {
                  setPrefs((p) => ({ ...p, backgroundImage: null }));
                  setUploadError(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                <i className="ti ti-trash" />
                Quitar imagen
              </button>
            </div>
          ) : (
            <label className={styles.upload} style={{ marginTop: 10 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleImageUpload}
              />
              <i className="ti ti-photo-up" />
              Subir tu imagen
            </label>
          )}
          {uploadError && <p className={styles.uploadError}>{uploadError}</p>}
        </>
      )}

      {/* Volver al original */}
      <button type="button" className={styles.bgResetBtn} onClick={handleResetBackground}>
        <i className="ti ti-rotate" style={{ verticalAlign: -2 }} />
        Quitar fondo / Volver al original
      </button>
    </>
  );
}
