import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { PosterFormData } from "./types";
import { THEMES } from "./types";
import { FontSelector } from "./FontSelector";

interface ThemeStepProps {
  formData: PosterFormData;
  updateFormData: (key: keyof PosterFormData, value: any) => void;
}

// Theme color previews for map themes
const MAP_THEME_COLORS: Record<string, { bg: string; road: string; accent: string }> = {
  feature_based: { bg: "#FFFFFF", road: "#1A1A1A", accent: "#4A90A4" },
  noir: { bg: "#0A0A0A", road: "#FFFFFF", accent: "#333333" },
  warm_beige: { bg: "#F5F0E8", road: "#4A3F35", accent: "#C4A77D" },
  blueprint: { bg: "#1E3A5F", road: "#FFFFFF", accent: "#4A90D9" },
  ocean: { bg: "#1A3A4A", road: "#87CEEB", accent: "#006994" },
  midnight_blue: { bg: "#0F1729", road: "#4A6FA5", accent: "#1E3A5F" },
  pastel_dream: { bg: "#FFF0F5", road: "#DDA0DD", accent: "#87CEEB" },
  japanese_ink: { bg: "#F5F5F0", road: "#2F2F2F", accent: "#8B8B7A" },
  terracotta: { bg: "#E07B53", road: "#3D2B1F", accent: "#CD853F" },
  sunset: { bg: "#FF6B6B", road: "#2D1B4E", accent: "#FFA07A" },
  contrast_zones: { bg: "#FFFFFF", road: "#000000", accent: "#FF4444" },
  copper_patina: { bg: "#2D5A4A", road: "#87CEAB", accent: "#B87333" },
};

// Theme color previews for night sky themes
const SKY_THEME_COLORS: Record<string, { bg: string; stars: string; accent: string }> = {
  starry_night: { bg: "#0B1026", stars: "#FFFFFF", accent: "#4A6FA5" },
  cosmic_purple: { bg: "#1A0A2E", stars: "#E8D5F5", accent: "#7B2FBE" },
  aurora_green: { bg: "#0A1F0A", stars: "#FFFFFF", accent: "#4ADE80" },
  lunar_gray: { bg: "#1A1A1A", stars: "#D4D4D4", accent: "#666666" },
  solar_orange: { bg: "#1A0F05", stars: "#FFD4A0", accent: "#FF8C00" },
  nebula_pink: { bg: "#1A0515", stars: "#FFD0E8", accent: "#FF69B4" },
  classic_ivory: { bg: "#FAF6F0", stars: "#1A2744", accent: "#B8960A" },
  arctic_blue: { bg: "#EDF3F8", stars: "#1C2D3F", accent: "#4A7AAA" },
  dawn_rose: { bg: "#F8EEF0", stars: "#3A1A24", accent: "#B07A7A" },
};

function MapThemePreview({ colors }: { colors: { bg: string; road: string; accent: string } }) {
  return (
    <svg className="w-full h-full" viewBox="0 0 100 130">
      <rect width="100" height="130" fill={colors.bg} />
      <line x1="20" y1="0" x2="20" y2="130" stroke={colors.road} strokeWidth="1.5" />
      <line x1="50" y1="0" x2="50" y2="130" stroke={colors.road} strokeWidth="2.5" />
      <line x1="80" y1="0" x2="80" y2="130" stroke={colors.road} strokeWidth="1.5" />
      <line x1="0" y1="30" x2="100" y2="30" stroke={colors.road} strokeWidth="1.5" />
      <line x1="0" y1="65" x2="100" y2="65" stroke={colors.road} strokeWidth="2.5" />
      <line x1="0" y1="100" x2="100" y2="100" stroke={colors.road} strokeWidth="1.5" />
      <circle cx="50" cy="65" r="10" fill={colors.accent} opacity="0.3" />
    </svg>
  );
}

function SkyThemePreview({ colors }: { colors: { bg: string; stars: string; accent: string } }) {
  return (
    <svg className="w-full h-full" viewBox="0 0 100 130">
      <rect width="100" height="130" fill={colors.bg} />
      {/* Stars */}
      <circle cx="20" cy="25" r="2" fill={colors.stars} />
      <circle cx="45" cy="15" r="1.5" fill={colors.stars} opacity="0.8" />
      <circle cx="70" cy="30" r="2.5" fill={colors.stars} />
      <circle cx="30" cy="55" r="1" fill={colors.stars} opacity="0.6" />
      <circle cx="60" cy="50" r="1.8" fill={colors.stars} />
      <circle cx="85" cy="65" r="1.2" fill={colors.stars} opacity="0.7" />
      <circle cx="15" cy="80" r="2" fill={colors.stars} />
      <circle cx="50" cy="90" r="1.5" fill={colors.stars} opacity="0.8" />
      <circle cx="75" cy="100" r="1" fill={colors.stars} opacity="0.5" />
      <circle cx="40" cy="110" r="2.2" fill={colors.stars} />
      {/* Constellation line */}
      <line x1="20" y1="25" x2="45" y2="15" stroke={colors.accent} strokeWidth="0.5" opacity="0.4" />
      <line x1="45" y1="15" x2="70" y2="30" stroke={colors.accent} strokeWidth="0.5" opacity="0.4" />
      <line x1="70" y1="30" x2="60" y2="50" stroke={colors.accent} strokeWidth="0.5" opacity="0.4" />
      {/* Horizon arc */}
      <ellipse cx="50" cy="130" rx="60" ry="20" fill="none" stroke={colors.accent} strokeWidth="0.5" opacity="0.3" />
    </svg>
  );
}

export function ThemeStep({ formData, updateFormData }: ThemeStepProps) {
  const isMap = formData.type === "map";
  const filteredThemes = THEMES.filter((t) => t.type === formData.type);

  return (
    <div className="space-y-8">
      {/* Theme Selection */}
      <div className="space-y-3">
        <Label className="text-base">Theme</Label>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {filteredThemes.map((theme) => {
            const isSelected = formData.theme === theme.value;
            return (
              <button
                key={theme.value}
                type="button"
                onClick={() => updateFormData("theme", theme.value)}
                className={cn(
                  "relative flex flex-col gap-1 p-2 rounded-lg border-2 transition-all text-left",
                  "hover:border-primary/50",
                  isSelected ? "border-primary ring-1 ring-primary" : "border-muted"
                )}
              >
                <div className="w-full aspect-[3/4] rounded overflow-hidden relative">
                  {isMap ? (
                    <MapThemePreview colors={MAP_THEME_COLORS[theme.value] || MAP_THEME_COLORS.feature_based} />
                  ) : (
                    <SkyThemePreview colors={SKY_THEME_COLORS[theme.value] || SKY_THEME_COLORS.starry_night} />
                  )}
                </div>
                <span className="text-[10px] font-medium block truncate text-center">{theme.label}</span>
                {isSelected && (
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Title Font Selection */}
      <FontSelector
        label="Title Font"
        value={formData.titleFont}
        onChange={(font) => updateFormData("titleFont", font)}
        previewText={formData.city || "City Name"}
      />

      {/* Subtitle Font Selection */}
      <FontSelector
        label="Subtitle Font"
        value={formData.subtitleFont}
        onChange={(font) => updateFormData("subtitleFont", font)}
        previewText={formData.country || "Country"}
      />
    </div>
  );
}
