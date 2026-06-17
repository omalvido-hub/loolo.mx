"use client";

import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { HexColorPicker } from "react-colorful";
import { cn } from "@/lib/utils";
import styles from "./zip-dashboard-react.module.css";
import {
  GALLERY_BACKGROUNDS,
  MAX_BACKGROUND_IMAGE_BYTES,
  SOLID_BACKGROUNDS,
  isValidHex,
  resetBackgroundPreferences,
  type BackgroundType,
  type DashboardPreferences,
  type GalleryBg,
  type GradientDirection,
} from "./dashboard-preferences";

// ── Accent palette categories (UI only) ──────────────────────────────────────

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

// ── Gallery categories (10) ───────────────────────────────────────────────────

interface GalleryCategory { label: string; items: GalleryBg[]; }

const GALLERY_CAT_DEFS = [
  { label: "Minimal / limpio",    cat: "minimal"    },
  { label: "Pastel / suave",      cat: "pastel"     },
  { label: "Abstracto premium",   cat: "abstracto"  },
  { label: "Ondas / fluidos",     cat: "ondas"      },
  { label: "Glass / moderno",     cat: "glass"      },
  { label: "Oscuro elegante",     cat: "oscuro"     },
  { label: "Creativo / colorido", cat: "creativo"   },
  { label: "Naturaleza suave",    cat: "naturaleza" },
  { label: "Espacios limpios",    cat: "espacios"   },
  { label: "Patrones sutiles",    cat: "patron"     },
];

const GALLERY_CATEGORIES: GalleryCategory[] = GALLERY_CAT_DEFS.map(({ label, cat }) => ({
  label,
  items: GALLERY_BACKGROUNDS.filter((b) => b.category === cat),
}));

// ── Solid background categories (5) ──────────────────────────────────────────

const SOLID_CATEGORIES = [
  { label: "Claros",           keys: ["default","blanco","nieve","perla","marfil","crema"] },
  { label: "Pasteles",         keys: ["azulado","menta-sol","lavanda-sol","durazno-sol","rosa-suave","limon-sol","teal-sol","violeta-sol"] },
  { label: "Neutros",          keys: ["calido","arena","pizarra","piedra","beige","platino"] },
  { label: "Vibrantes suaves", keys: ["cielo-vivo","verde-vivo","violeta-vivo","amber-vivo","rosa-vivo"] },
  { label: "Oscuros",          keys: ["azul-noche","carbon","bosque-n","pizarra-oscura","vino"] },
];

function solidKeyToHex(key: string): string {
  if (isValidHex(key)) return key;
  const opt = SOLID_BACKGROUNDS.find((o) => o.key === key);
  if (!opt) return "#f5f6f8";
  return isValidHex(opt.value) ? opt.value : "#f5f6f8";
}

// ── Gradient presets (UI only) ────────────────────────────────────────────────

interface GradientPreset { label: string; dir: GradientDirection; from: string; to: string; }

const GRADIENT_PRESETS: GradientPreset[] = [
  { label: "Índigo",    dir: "135deg", from: "#4f46e5", to: "#7c3aed" },
  { label: "Océano",    dir: "135deg", from: "#0284c7", to: "#0891b2" },
  { label: "Bosque",    dir: "135deg", from: "#059669", to: "#15803d" },
  { label: "Atardecer", dir: "135deg", from: "#f97316", to: "#ef4444" },
  { label: "Fresa",     dir: "135deg", from: "#ec4899", to: "#e11d48" },
  { label: "Lavanda",   dir: "135deg", from: "#8b5cf6", to: "#ec4899" },
  { label: "Neón",      dir: "135deg", from: "#14b8a6", to: "#3b82f6" },
  { label: "Dorado",    dir: "135deg", from: "#f59e0b", to: "#d97706" },
  { label: "Noche",     dir: "135deg", from: "#1e1b4b", to: "#312e81" },
  { label: "Amanecer",  dir: "90deg",  from: "#fce7f3", to: "#ede9fe" },
  { label: "Menta",     dir: "135deg", from: "#d1fae5", to: "#a7f3d0" },
  { label: "Humo",      dir: "180deg", from: "#f8fafc", to: "#e2e8f0" },
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
  patron:  "pat-1",
  manual:  "",
  imagen:  "",
};

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ColorFondsSectionProps {
  prefs:           DashboardPreferences;
  setPrefs:        React.Dispatch<React.SetStateAction<DashboardPreferences>>;
  activeAccentHex: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ColorFondsSection({ prefs, setPrefs, activeAccentHex }: ColorFondsSectionProps) {
  const [hexDraft,      setHexDraft]      = useState(() => activeAccentHex);
  const [solidHexDraft, setSolidHexDraft] = useState(() => solidKeyToHex(
    prefs.backgroundType === "solido" ? prefs.backgroundValue : "default"
  ));
  const [gradFromDraft, setGradFromDraft] = useState(() => prefs.gradientFrom);
  const [gradToDraft,   setGradToDraft]   = useState(() => prefs.gradientTo);
  const [uploadError,   setUploadError]   = useState<string | null>(null);
  const fileInputRef   = useRef<HTMLInputElement | null>(null);
  const recentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recentAccents    = prefs.recentAccents ?? [];
  const isGaleriaActive  = prefs.backgroundType === "galeria" || prefs.backgroundType === "patron";
  const activeGalleryKey = isGaleriaActive && prefs.backgroundType === "galeria"
    ? prefs.backgroundValue
    : "";

  // ── Accent handlers ──────────────────────────────────────────────────────────

  function applyAccentColor(hex: string) {
    if (!isValidHex(hex)) return;
    setPrefs((p) => {
      const recent = [hex, ...(p.recentAccents ?? []).filter((c) => c !== hex)].slice(0, 8);
      return { ...p, accent: "personalizado", customAccentColor: hex, recentAccents: recent };
    });
    setHexDraft(hex);
  }

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

  // ── Solid background handlers ─────────────────────────────────────────────────

  function handleSolidPickerChange(hex: string) {
    setSolidHexDraft(hex);
    setPrefs((p) => ({ ...p, backgroundType: "solido", backgroundValue: hex }));
  }

  function handleSolidChipClick(key: string) {
    setPrefs((p) => ({ ...p, backgroundType: "solido", backgroundValue: key }));
    setSolidHexDraft(solidKeyToHex(key));
  }

  // ── Gradient handlers ────────────────────────────────────────────────────────

  function applyGradientPreset(preset: GradientPreset) {
    setPrefs((p) => ({
      ...p,
      gradientDirection: preset.dir,
      gradientFrom: preset.from,
      gradientTo: preset.to,
    }));
    setGradFromDraft(preset.from);
    setGradToDraft(preset.to);
  }

  // ── Image handler ─────────────────────────────────────────────────────────────

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
    setSolidHexDraft("#f5f6f8");
    setGradFromDraft(reset.gradientFrom);
    setGradToDraft(reset.gradientTo);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ═══ COLOR DE ACENTO ═══ */}
      <div className={styles.ctlLabel} style={{ marginTop: 4 }}>Color de acento</div>

      <div className={styles.pickerWrap}>
        <HexColorPicker
          color={isValidHex(activeAccentHex) ? activeAccentHex : "#4f46e5"}
          onChange={handlePickerChange}
        />
      </div>

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

      {/* ═══ FONDO ═══ */}
      <div className={styles.ctlLabel} style={{ marginTop: 20 }}>Fondo</div>

      {/* 4 tabs — fuente más pequeña para que "Imagen propia" quepa */}
      <div className={cn(styles.seg, styles.segSm)}>
        <button
          type="button"
          className={cn(prefs.backgroundType === "solido" && styles.segOn)}
          onClick={() => setPrefs((p) => ({ ...p, backgroundType: "solido", backgroundValue: BG_TYPE_DEFAULT.solido }))}
        >
          Color
        </button>
        <button
          type="button"
          className={cn(prefs.backgroundType === "manual" && styles.segOn)}
          onClick={() => setPrefs((p) => ({ ...p, backgroundType: "manual", backgroundValue: BG_TYPE_DEFAULT.manual }))}
        >
          Degradado
        </button>
        <button
          type="button"
          className={cn(isGaleriaActive && styles.segOn)}
          onClick={() => setPrefs((p) => ({ ...p, backgroundType: "galeria", backgroundValue: BG_TYPE_DEFAULT.galeria }))}
        >
          Galería
        </button>
        <button
          type="button"
          className={cn(prefs.backgroundType === "imagen" && styles.segOn)}
          onClick={() => setPrefs((p) => ({ ...p, backgroundType: "imagen", backgroundValue: BG_TYPE_DEFAULT.imagen }))}
        >
          Imagen propia
        </button>
      </div>

      {/* ── Tab: Color sólido — picker + HEX + colores rápidos ── */}
      {prefs.backgroundType === "solido" && (
        <>
          <div className={styles.pickerWrap} style={{ marginTop: 10 }}>
            <HexColorPicker
              color={isValidHex(solidHexDraft) ? solidHexDraft : "#f5f6f8"}
              onChange={handleSolidPickerChange}
            />
          </div>

          <div className={styles.hexInputRow} style={{ marginTop: 8 }}>
            <span
              className={styles.hexPreview}
              style={{ background: isValidHex(solidHexDraft) ? solidHexDraft : "#f5f6f8" }}
            />
            <input
              type="text"
              className={cn(
                styles.hexInput,
                solidHexDraft.length >= 4 && !isValidHex(solidHexDraft) && styles.hexInputError,
              )}
              value={solidHexDraft}
              placeholder="#f5f6f8"
              maxLength={7}
              spellCheck={false}
              onChange={(e) => {
                const val = e.target.value;
                setSolidHexDraft(val);
                if (isValidHex(val)) handleSolidPickerChange(val);
              }}
            />
            {solidHexDraft.length >= 4 && !isValidHex(solidHexDraft) && (
              <span className={styles.hexInputErrorMsg}>HEX inválido</span>
            )}
          </div>

          <div className={styles.ctlLabel} style={{ marginTop: 12 }}>Colores rápidos</div>
          {SOLID_CATEGORIES.map((cat) => (
            <div key={cat.label}>
              <div className={styles.galleryCatLabel}>{cat.label}</div>
              <div className={styles.colorChipGrid}>
                {cat.keys.map((k) => {
                  const opt = SOLID_BACKGROUNDS.find((s) => s.key === k);
                  if (!opt) return null;
                  const isActive = prefs.backgroundValue === k;
                  return (
                    <span
                      key={k}
                      title={opt.label}
                      className={cn(styles.colorChip, isActive && styles.colorChipOn)}
                      style={{ background: opt.value === "transparent" ? "#f5f6f8" : opt.value }}
                      onClick={() => handleSolidChipClick(k)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── Tab: Degradado ── */}
      {prefs.backgroundType === "manual" && (
        <>
          <div className={styles.galleryCatLabel} style={{ marginTop: 10 }}>Presets</div>
          <div className={styles.gradPresets}>
            {GRADIENT_PRESETS.map((preset) => {
              const isActive =
                prefs.gradientFrom      === preset.from &&
                prefs.gradientTo        === preset.to &&
                prefs.gradientDirection === preset.dir;
              return (
                <span
                  key={preset.label}
                  title={preset.label}
                  className={cn(styles.gradPreset, isActive && styles.gradPresetOn)}
                  style={{ background: `linear-gradient(${preset.dir},${preset.from},${preset.to})` }}
                  onClick={() => applyGradientPreset(preset)}
                />
              );
            })}
          </div>

          <div className={styles.galleryCatLabel} style={{ marginTop: 14 }}>Personalizar</div>
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

      {/* ── Tab: Galería (catálogo visual premium) ── */}
      {isGaleriaActive && GALLERY_CATEGORIES.map((cat) => (
        <div key={cat.label}>
          <div className={styles.galleryCatLabel}>{cat.label}</div>
          <div className={styles.galleryCatalog}>
            {cat.items.map((bg) => (
              <div key={bg.key} className={styles.galleryCell}>
                <span
                  className={cn(styles.galleryThumb, activeGalleryKey === bg.key && styles.galleryThumbOn)}
                  style={{ background: bg.css }}
                  onClick={() =>
                    setPrefs((p) => ({ ...p, backgroundType: "galeria", backgroundValue: bg.key }))
                  }
                />
                <span className={styles.galleryThumbLabel}>{bg.label}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* ── Tab: Imagen propia ── */}
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
            <label className={styles.uploadImgArea}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleImageUpload}
              />
              <i className="ti ti-photo-up" />
              <span>Subir imagen propia</span>
              <span className={styles.uploadImgHint}>JPG · PNG · WEBP · máx. 200 KB</span>
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
