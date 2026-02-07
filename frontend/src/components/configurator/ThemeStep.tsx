import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { PosterFormData } from "./types";
import { THEMES, DISTANCE_OPTIONS } from "./types";
import { FontSelector } from "./FontSelector";

interface ThemeStepProps {
  formData: PosterFormData;
  updateFormData: (key: keyof PosterFormData, value: any) => void;
}

// Theme color previews
const THEME_COLORS: Record<string, { bg: string; road: string; accent: string }> = {
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

export function ThemeStep({ formData, updateFormData }: ThemeStepProps) {
  return (
    <div className="space-y-8">
      {/* Theme Selection */}
      <div className="space-y-3">
        <Label className="text-base">Theme</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {THEMES.map((theme) => {
            const colors = THEME_COLORS[theme.value] || THEME_COLORS.feature_based;
            const isSelected = formData.theme === theme.value;
            return (
              <button
                key={theme.value}
                type="button"
                onClick={() => updateFormData("theme", theme.value)}
                className={cn(
                  "relative flex flex-col gap-2 p-3 rounded-lg border-2 transition-all text-left",
                  "hover:border-primary/50",
                  isSelected ? "border-primary ring-1 ring-primary" : "border-muted"
                )}
              >
                {/* Theme Preview */}
                <div
                  className="w-full aspect-[3/4] rounded-md overflow-hidden relative"
                  style={{ backgroundColor: colors.bg }}
                >
                  {/* Simulated road network */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 130">
                    <line x1="20" y1="0" x2="20" y2="130" stroke={colors.road} strokeWidth="1" />
                    <line x1="50" y1="0" x2="50" y2="130" stroke={colors.road} strokeWidth="2" />
                    <line x1="80" y1="0" x2="80" y2="130" stroke={colors.road} strokeWidth="1" />
                    <line x1="0" y1="30" x2="100" y2="30" stroke={colors.road} strokeWidth="1" />
                    <line x1="0" y1="65" x2="100" y2="65" stroke={colors.road} strokeWidth="2" />
                    <line x1="0" y1="100" x2="100" y2="100" stroke={colors.road} strokeWidth="1" />
                    <circle cx="50" cy="65" r="8" fill={colors.accent} opacity="0.3" />
                  </svg>
                </div>
                <div>
                  <span className="text-xs font-medium block truncate">{theme.label}</span>
                </div>
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Map Coverage */}
      <div className="space-y-3">
        <Label className="text-base">Map Coverage</Label>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {DISTANCE_OPTIONS.map((opt) => {
            const isSelected = formData.distance === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateFormData("distance", opt.value)}
                className={cn(
                  "flex flex-col items-center py-3 px-2 rounded-lg border-2 transition-all",
                  "hover:border-primary/50",
                  isSelected ? "border-primary bg-primary/5" : "border-muted"
                )}
              >
                <span className={cn("text-sm font-bold", isSelected ? "text-primary" : "text-foreground")}>
                  {opt.label}
                </span>
                <span className="text-[10px] text-muted-foreground hidden sm:block">{opt.description}</span>
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
