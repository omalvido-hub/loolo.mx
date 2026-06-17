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
  type GradientDirection,
} from "./dashboard-preferences";

// ── Accent palette ─────────────────────────────────────────────────────────────

interface PaletteSwatch   { value: string; label: string; }
interface PaletteCategory { label: string; swatches: PaletteSwatch[]; }

const PALETTE_CATEGORIES: PaletteCategory[] = [
  { label: "Marca", swatches: [
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
  { label: "Glass / suave", swatches: [
    { value: "#bfdbfe", label: "Cielo pálido" },
    { value: "#ddd6fe", label: "Lavanda pálida" },
    { value: "#bbf7d0", label: "Menta pálida" },
    { value: "#fde68a", label: "Ámbar pálido" },
    { value: "#fecdd3", label: "Rosa pálido" },
  ]},
];

// ── Solid categories ──────────────────────────────────────────────────────────

const SOLID_CATEGORIES = [
  { label: "Recomendados", keys: ["default", "nieve", "carbon"] },
  { label: "Claros",       keys: ["blanco", "perla", "crema"] },
  { label: "Oscuros",      keys: ["azul-noche", "pizarra-oscura", "vino"] },
  { label: "Glass",        keys: ["cielo-vivo", "lavanda-sol", "teal-sol"] },
];

function solidKeyToHex(key: string): string {
  if (isValidHex(key)) return key;
  const opt = SOLID_BACKGROUNDS.find((o) => o.key === key);
  if (!opt) return "#f5f6f8";
  return isValidHex(opt.value) ? opt.value : "#f5f6f8";
}

// ── Gradient presets ──────────────────────────────────────────────────────────

interface GradientPreset { label: string; dir: GradientDirection; from: string; to: string; }

const GRADIENT_PRESETS: GradientPreset[] = [
  { label: "Índigo",    dir: "135deg", from: "#4f46e5", to: "#7c3aed" },
  { label: "Océano",    dir: "135deg", from: "#0284c7", to: "#0891b2" },
  { label: "Atardecer", dir: "135deg", from: "#f97316", to: "#ef4444" },
  { label: "Lavanda",   dir: "135deg", from: "#8b5cf6", to: "#ec4899" },
  { label: "Noche",     dir: "135deg", from: "#1e1b4b", to: "#312e81" },
  { label: "Amanecer",  dir: "90deg",  from: "#fce7f3", to: "#ede9fe" },
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

const FIRST_GALLERY_KEY = GALLERY_BACKGROUNDS[0]?.key ?? "min-1";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ColorFondsSectionProps {
  prefs:           DashboardPreferences;
  setPrefs:        React.Dispatch<React.SetStateAction<DashboardPreferences>>;
  activeAccentHex: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ColorFondsSection({ prefs, setPrefs, activeAccentHex }: ColorFondsSectionProps) {
  // Accent
  const [hexDraft,      setHexDraft]      = useState(() => activeAccentHex);
  // Solid background
  const [solidHexDraft, setSolidHexDraft] = useState(() =>
    solidKeyToHex(prefs.backgroundType === "solido" ? prefs.backgroundValue : "default")
  );
  // Gradient
  const [gradFromDraft,   setGradFromDraft]   = useState(() => prefs.gradientFrom);
  const [gradToDraft,     setGradToDraft]     = useState(() => prefs.gradientTo);
  const [gradActiveSlot,  setGradActiveSlot]  = useState<"from" | "to">("from");
  const [gradCustomOpen,  setGradCustomOpen]  = useState(false);
  const [solidCustomOpen, setSolidCustomOpen] = useState(false);
  // Upload
  const [uploadError,   setUploadError]   = useState<string | null>(null);

  const fileInputRef   = useRef<HTMLInputElement | null>(null);
  const recentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recentAccents = prefs.recentAccents ?? [];

  // Galería tab is active for: galeria, patron (legacy), imagen
  const isGaleriaActive = (
    prefs.backgroundType === "galeria" ||
    prefs.backgroundType === "patron"  ||
    prefs.backgroundType === "imagen"
  );

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
      backgroundType:    "manual",
      gradientDirection: preset.dir,
      gradientFrom:      preset.from,
      gradientTo:        preset.to,
    }));
    setGradFromDraft(preset.from);
    setGradToDraft(preset.to);
  }

  function handleGradFromPicker(hex: string) {
    setGradFromDraft(hex);
    setPrefs((p) => ({ ...p, gradientFrom: hex }));
  }

  function handleGradToPicker(hex: string) {
    setGradToDraft(hex);
    setPrefs((p) => ({ ...p, gradientTo: hex }));
  }

  // ── Image handlers ────────────────────────────────────────────────────────────

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
      if (typeof result === "string")
        setPrefs((p) => ({ ...p, backgroundType: "imagen", backgroundImage: result }));
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveImage() {
    setPrefs((p) => ({
      ...p,
      backgroundImage: null,
      backgroundType:  "galeria",
      backgroundValue: FIRST_GALLERY_KEY,
    }));
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Reset ─────────────────────────────────────────────────────────────────────

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
      {/* ══════════ COLOR DE ACENTO ══════════ */}
      <div className={styles.ctlLabel} style={{ marginTop: 4 }}>Color de acento</div>

      <div className={styles.pickerWrap}>
        <HexColorPicker
          color={isValidHex(activeAccentHex) ? activeAccentHex : "#4f46e5"}
          onChange={handlePickerChange}
        />
      </div>

      <div className={styles.hexInputRow} style={{ marginTop: 8 }}>
        <span className={styles.hexPreview} style={{ background: isValidHex(hexDraft) ? hexDraft : activeAccentHex }} />
        <input
          type="text"
          className={cn(styles.hexInput, hexDraft.length >= 4 && !isValidHex(hexDraft) && styles.hexInputError)}
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
              <span key={hex} title={hex}
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
              <span key={sw.value} title={sw.label}
                className={cn(styles.sw, activeAccentHex === sw.value && styles.swOn)}
                style={{ background: sw.value }}
                onClick={() => applyAccentColor(sw.value)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* ══════════ FONDO — 3 tabs ══════════ */}
      <div className={styles.ctlLabel} style={{ marginTop: 20 }}>Fondo</div>

      <div className={styles.seg}>
        <button type="button"
          className={cn(prefs.backgroundType === "solido" && styles.segOn)}
          onClick={() => setPrefs((p) => ({ ...p, backgroundType: "solido", backgroundValue: BG_TYPE_DEFAULT.solido }))}
        >
          Color
        </button>
        <button type="button"
          className={cn(prefs.backgroundType === "manual" && styles.segOn)}
          onClick={() => setPrefs((p) => ({ ...p, backgroundType: "manual", backgroundValue: BG_TYPE_DEFAULT.manual }))}
        >
          Degradado
        </button>
        <button type="button"
          className={cn(isGaleriaActive && styles.segOn)}
          onClick={() => setPrefs((p) => ({ ...p, backgroundType: "galeria", backgroundValue: BG_TYPE_DEFAULT.galeria }))}
        >
          Imagen
        </button>
      </div>

      {/* ── Tab: Color sólido ── */}
      {prefs.backgroundType === "solido" && (
        <>
          {SOLID_CATEGORIES.map((cat) => (
            <div key={cat.label}>
              <div className={styles.galleryCatLabel}>{cat.label}</div>
              <div className={styles.swatchesWrap}>
                {cat.keys.map((k) => {
                  const opt = SOLID_BACKGROUNDS.find((s) => s.key === k);
                  if (!opt) return null;
                  return (
                    <span key={k} title={opt.label}
                      className={cn(styles.sw, prefs.backgroundValue === k && styles.swOn)}
                      style={{ background: opt.value === "transparent" ? "#f5f6f8" : opt.value }}
                      onClick={() => handleSolidChipClick(k)}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* Color personalizado — picker oculto hasta abrir */}
          <button type="button"
            className={cn(styles.gradCustomBtn, solidCustomOpen && styles.gradCustomBtnOn)}
            onClick={() => setSolidCustomOpen((v) => !v)}
          >
            <i className="ti ti-palette" />
            Color personalizado
          </button>

          {solidCustomOpen && (
            <>
              <div className={styles.pickerWrap} style={{ marginTop: 10 }}>
                <HexColorPicker
                  color={isValidHex(solidHexDraft) ? solidHexDraft : "#f5f6f8"}
                  onChange={handleSolidPickerChange}
                />
              </div>
              <div className={styles.hexInputRow} style={{ marginTop: 8 }}>
                <span className={styles.hexPreview}
                  style={{ background: isValidHex(solidHexDraft) ? solidHexDraft : "#f5f6f8" }}
                />
                <input type="text"
                  className={cn(styles.hexInput,
                    solidHexDraft.length >= 4 && !isValidHex(solidHexDraft) && styles.hexInputError)}
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
            </>
          )}
        </>
      )}

      {/* ── Tab: Degradado ── */}
      {prefs.backgroundType === "manual" && (
        <>
          {/* Presets */}
          <div className={styles.galleryCatLabel} style={{ marginTop: 10 }}>Presets</div>
          <div className={styles.gradPresets}>
            {GRADIENT_PRESETS.map((preset) => {
              const isActive =
                prefs.gradientFrom      === preset.from &&
                prefs.gradientTo        === preset.to   &&
                prefs.gradientDirection === preset.dir;
              return (
                <span key={preset.label} title={preset.label}
                  className={cn(styles.gradPreset, isActive && styles.gradPresetOn)}
                  style={{ background: `linear-gradient(${preset.dir},${preset.from},${preset.to})` }}
                  onClick={() => applyGradientPreset(preset)}
                />
              );
            })}
          </div>

          {/* Dirección */}
          <div className={styles.galleryCatLabel} style={{ marginTop: 12 }}>Dirección</div>
          <div className={styles.seg}>
            {(["135deg","90deg","180deg","45deg"] as GradientDirection[]).map((dir) => (
              <button key={dir} type="button"
                className={cn(prefs.gradientDirection === dir && styles.segOn)}
                onClick={() => setPrefs((p) => ({ ...p, gradientDirection: dir }))}
              >
                {GRADIENT_DIR_LABELS[dir]}
              </button>
            ))}
          </div>

          {/* Personalizar degradado — picker oculto hasta abrir */}
          <button type="button"
            className={cn(styles.gradCustomBtn, gradCustomOpen && styles.gradCustomBtnOn)}
            onClick={() => setGradCustomOpen((v) => !v)}
          >
            <i className="ti ti-sliders" />
            Personalizar degradado
          </button>

          {gradCustomOpen && (
            <>
              <div className={styles.gradSlotToggle}>
                <button type="button"
                  className={cn(styles.gradSlotBtn, gradActiveSlot === "from" && styles.gradSlotBtnOn)}
                  onClick={() => setGradActiveSlot("from")}
                >
                  <span className={styles.gradSlotSwatch}
                    style={{ background: isValidHex(gradFromDraft) ? gradFromDraft : prefs.gradientFrom }}
                  />
                  Desde
                </button>
                <button type="button"
                  className={cn(styles.gradSlotBtn, gradActiveSlot === "to" && styles.gradSlotBtnOn)}
                  onClick={() => setGradActiveSlot("to")}
                >
                  <span className={styles.gradSlotSwatch}
                    style={{ background: isValidHex(gradToDraft) ? gradToDraft : prefs.gradientTo }}
                  />
                  Hasta
                </button>
              </div>

              <div className={styles.pickerWrap} style={{ marginTop: 10 }}>
                <HexColorPicker
                  color={gradActiveSlot === "from"
                    ? (isValidHex(gradFromDraft) ? gradFromDraft : prefs.gradientFrom)
                    : (isValidHex(gradToDraft)   ? gradToDraft   : prefs.gradientTo)}
                  onChange={gradActiveSlot === "from" ? handleGradFromPicker : handleGradToPicker}
                />
              </div>

              <div className={styles.hexInputRow} style={{ marginTop: 8 }}>
                <span className={styles.hexPreview}
                  style={{ background: gradActiveSlot === "from"
                    ? (isValidHex(gradFromDraft) ? gradFromDraft : prefs.gradientFrom)
                    : (isValidHex(gradToDraft)   ? gradToDraft   : prefs.gradientTo)
                  }}
                />
                {gradActiveSlot === "from" ? (
                  <input type="text"
                    className={cn(styles.hexInput,
                      gradFromDraft.length >= 4 && !isValidHex(gradFromDraft) && styles.hexInputError)}
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
                ) : (
                  <input type="text"
                    className={cn(styles.hexInput,
                      gradToDraft.length >= 4 && !isValidHex(gradToDraft) && styles.hexInputError)}
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
                )}
                {gradActiveSlot === "from" && gradFromDraft.length >= 4 && !isValidHex(gradFromDraft) && (
                  <span className={styles.hexInputErrorMsg}>HEX inválido</span>
                )}
                {gradActiveSlot === "to" && gradToDraft.length >= 4 && !isValidHex(gradToDraft) && (
                  <span className={styles.hexInputErrorMsg}>HEX inválido</span>
                )}
              </div>
            </>
          )}

          {/* Preview rect */}
          <div className={styles.gradientPreviewRect}
            style={{ background: `linear-gradient(${prefs.gradientDirection},${prefs.gradientFrom},${prefs.gradientTo})` }}
          />
        </>
      )}

      {/* ── Tab: Imagen (placeholders + imagen propia) ── */}
      {isGaleriaActive && (
        <>
          {[
            { group: "Fondos reales",      items: ["Montaña","Bosque","Cielo","Agua"] },
            { group: "Abstractos premium", items: ["Orbes","Glass","Fluido","Blobs"] },
          ].map(({ group, items }) => (
            <div key={group}>
              <div className={styles.galleryCatLabel}>{group}</div>
              <div className={styles.galleryCatalog}>
                {items.map((label) => (
                  <div key={label} className={styles.galleryCell}>
                    <div className={styles.imgPlaceholder}>
                      <i className="ti ti-photo" />
                    </div>
                    <span className={styles.galleryThumbLabel}>{label}</span>
                    <span className={styles.imgPlaceholderSoon}>Próximamente</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Separador + sección "Tu imagen" */}
          <div className={styles.gallerySep} />
          <div className={styles.galleryCatLabel}>Tu imagen</div>

          {prefs.backgroundImage ? (
            <div className={styles.galleryImgPreviewRow}>
              <div
                className={cn(styles.galleryImgThumb, prefs.backgroundType === "imagen" && styles.galleryThumbOn)}
                style={{
                  backgroundImage:    `url(${prefs.backgroundImage})`,
                  backgroundSize:     "cover",
                  backgroundPosition: "center",
                }}
                onClick={() => setPrefs((p) => ({ ...p, backgroundType: "imagen" }))}
                title="Aplicar esta imagen"
              />
              <button type="button" className={styles.removeImgBtn} onClick={handleRemoveImage}>
                <i className="ti ti-trash" />
                Quitar imagen
              </button>
            </div>
          ) : (
            <label className={styles.uploadImgArea}>
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />
              <i className="ti ti-photo-up" />
              <span>Subir imagen propia</span>
              <span className={styles.uploadImgHint}>JPG · PNG · WEBP · máx. 200 KB</span>
            </label>
          )}
          {uploadError && <p className={styles.uploadError}>{uploadError}</p>}
        </>
      )}

      {/* Quitar fondo */}
      <button type="button" className={styles.bgResetBtn} onClick={handleResetBackground}>
        <i className="ti ti-rotate" style={{ verticalAlign: -2 }} />
        Quitar fondo / Volver al original
      </button>
    </>
  );
}
