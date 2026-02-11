import { useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { THEME_COLORS } from "./theme-colors";
import type { PosterFormData } from "./types";
import { PAPER_SIZES } from "./types";
import { MapPin } from "lucide-react";

interface PosterPreviewProps {
  formData: PosterFormData;
}

// Load Google Font dynamically
function useGoogleFont(fontFamily: string | undefined) {
  useEffect(() => {
    if (!fontFamily) return;

    const linkId = `google-font-${fontFamily.replace(/\s+/g, "-")}`;
    if (document.getElementById(linkId)) return;

    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@300;400;500;600;700&display=swap`;
    document.head.appendChild(link);
  }, [fontFamily]);
}

// Parse Google Maps URL to extract coordinates
function parseGoogleMapsUrl(url: string): { lat: number; lon: number; zoom?: number } | null {
  if (!url) return null;

  // Format: https://www.google.com/maps/@48.8566,2.3522,15z
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*),(\d+\.?\d*)?z?/);
  if (atMatch) {
    return {
      lat: parseFloat(atMatch[1]),
      lon: parseFloat(atMatch[2]),
      zoom: atMatch[3] ? parseFloat(atMatch[3]) : undefined,
    };
  }

  // Format: https://www.google.com/maps/place/.../@48.8566,2.3522,15z
  const placeMatch = url.match(/place\/[^@]*@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (placeMatch) {
    return {
      lat: parseFloat(placeMatch[1]),
      lon: parseFloat(placeMatch[2]),
    };
  }

  // Format with !3d and !4d: ...!3d48.8566!4d2.3522
  const dMatch = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (dMatch) {
    return {
      lat: parseFloat(dMatch[1]),
      lon: parseFloat(dMatch[2]),
    };
  }

  return null;
}

// Simulated map SVG with roads, water, and parks
function SimulatedMap({ theme, rotation = 0 }: { theme: string; rotation?: number }) {
  const colors = THEME_COLORS[theme] || THEME_COLORS.feature_based;

  return (
    <svg
      viewBox="0 0 200 200"
      className="w-full h-full"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      {/* Background */}
      <rect width="200" height="200" fill={colors.bg} />

      {/* Water body (river/lake) */}
      <path
        d="M 0 80 Q 50 60 100 85 Q 150 110 200 90 L 200 130 Q 150 150 100 125 Q 50 100 0 120 Z"
        fill={colors.water}
        opacity="0.8"
      />

      {/* Parks */}
      <ellipse cx="40" cy="50" rx="25" ry="20" fill={colors.parks} opacity="0.7" />
      <ellipse cx="160" cy="160" rx="30" ry="25" fill={colors.parks} opacity="0.7" />
      <ellipse cx="80" cy="170" rx="20" ry="15" fill={colors.parks} opacity="0.7" />

      {/* Primary roads */}
      <line x1="0" y1="40" x2="200" y2="40" stroke={colors.roadPrimary} strokeWidth="3" />
      <line x1="100" y1="0" x2="100" y2="200" stroke={colors.roadPrimary} strokeWidth="3" />

      {/* Secondary roads */}
      <line x1="0" y1="150" x2="200" y2="150" stroke={colors.roadSecondary} strokeWidth="2" />
      <line x1="50" y1="0" x2="50" y2="200" stroke={colors.roadSecondary} strokeWidth="2" />
      <line x1="150" y1="0" x2="150" y2="200" stroke={colors.roadSecondary} strokeWidth="2" />

      {/* Tertiary roads */}
      <line x1="0" y1="20" x2="200" y2="20" stroke={colors.roadTertiary} strokeWidth="1" />
      <line x1="0" y1="70" x2="200" y2="70" stroke={colors.roadTertiary} strokeWidth="1" />
      <line x1="0" y1="180" x2="200" y2="180" stroke={colors.roadTertiary} strokeWidth="1" />
      <line x1="25" y1="0" x2="25" y2="200" stroke={colors.roadTertiary} strokeWidth="1" />
      <line x1="75" y1="0" x2="75" y2="200" stroke={colors.roadTertiary} strokeWidth="1" />
      <line x1="125" y1="0" x2="125" y2="200" stroke={colors.roadTertiary} strokeWidth="1" />
      <line x1="175" y1="0" x2="175" y2="200" stroke={colors.roadTertiary} strokeWidth="1" />

      {/* Diagonal roads */}
      <line x1="0" y1="0" x2="200" y2="200" stroke={colors.roadTertiary} strokeWidth="1" opacity="0.5" />
      <line x1="200" y1="0" x2="0" y2="200" stroke={colors.roadTertiary} strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

// Sky theme colors for preview
const SKY_PREVIEW_COLORS: Record<string, { bg: string; bgEnd: string; stars: string; accent: string; moon: string }> = {
  starry_night:  { bg: "#0B1026", bgEnd: "#1A2040", stars: "#FFFFFF", accent: "#4682B4", moon: "#F0F0F0" },
  cosmic_purple: { bg: "#1A0A2E", bgEnd: "#2D1450", stars: "#E8D5F5", accent: "#7B2FBE", moon: "#E8D5F5" },
  aurora_green:  { bg: "#0A1F0A", bgEnd: "#153015", stars: "#FFFFFF", accent: "#4ADE80", moon: "#E0FFE0" },
  lunar_gray:    { bg: "#1A1A1A", bgEnd: "#2A2A2A", stars: "#D4D4D4", accent: "#666666", moon: "#D4D4D4" },
  solar_orange:  { bg: "#1A0F05", bgEnd: "#2A1A08", stars: "#FFD4A0", accent: "#FF8C00", moon: "#FFD4A0" },
  nebula_pink:   { bg: "#1A0515", bgEnd: "#2A0A25", stars: "#FFD0E8", accent: "#FF69B4", moon: "#FFD0E8" },
  classic_ivory: { bg: "#FAF6F0", bgEnd: "#F0EBE0", stars: "#1A2744", accent: "#B8960A", moon: "#1A2744" },
  arctic_blue:   { bg: "#EDF3F8", bgEnd: "#DDE8F0", stars: "#1C2D3F", accent: "#4A7AAA", moon: "#1C2D3F" },
  dawn_rose:     { bg: "#F8EEF0", bgEnd: "#F0E0E4", stars: "#3A1A24", accent: "#B07A7A", moon: "#3A1A24" },
};

// Simulated sky preview with stars, constellation lines, and crescent moon
function SimulatedSky({ theme }: { theme: string }) {
  const c = SKY_PREVIEW_COLORS[theme] || SKY_PREVIEW_COLORS.starry_night;
  // Deterministic "random" star positions
  const stars = [
    { cx: 30, cy: 25, r: 2.2 }, { cx: 70, cy: 18, r: 1.8 }, { cx: 50, cy: 40, r: 2.5 },
    { cx: 20, cy: 55, r: 1.2 }, { cx: 80, cy: 50, r: 1.5 }, { cx: 45, cy: 70, r: 2.0 },
    { cx: 65, cy: 65, r: 1.0 }, { cx: 35, cy: 85, r: 1.8 }, { cx: 85, cy: 80, r: 1.3 },
    { cx: 15, cy: 35, r: 1.6 }, { cx: 55, cy: 55, r: 0.8 }, { cx: 90, cy: 30, r: 1.1 },
    { cx: 10, cy: 75, r: 1.4 }, { cx: 75, cy: 40, r: 0.9 }, { cx: 40, cy: 15, r: 1.7 },
    { cx: 60, cy: 90, r: 1.0 }, { cx: 25, cy: 95, r: 0.7 }, { cx: 88, cy: 65, r: 1.2 },
  ];

  return (
    <svg className="w-full h-full" viewBox="0 0 100 130">
      <defs>
        <radialGradient id="sky-preview-bg" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={c.bg} />
          <stop offset="100%" stopColor={c.bgEnd} />
        </radialGradient>
        <filter id="prev-glow">
          <feGaussianBlur stdDeviation="1" />
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="100" height="130" fill="url(#sky-preview-bg)" />
      {/* Horizon circle */}
      <circle cx="50" cy="55" r="45" fill="none" stroke={c.accent} strokeWidth="0.5" opacity={0.3} />
      {/* Constellation lines */}
      <polyline points="30,25 50,40 70,18" fill="none" stroke={c.accent} strokeWidth="0.4" opacity={0.4} />
      <polyline points="50,40 45,70 65,65" fill="none" stroke={c.accent} strokeWidth="0.4" opacity={0.4} />
      <polyline points="80,50 85,80 60,90" fill="none" stroke={c.accent} strokeWidth="0.4" opacity={0.4} />
      {/* Stars */}
      {stars.map((s, i) => (
        <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={c.stars}
          opacity={s.r > 1.5 ? 0.95 : 0.6} filter={s.r > 2 ? "url(#prev-glow)" : undefined} />
      ))}
      {/* Moon crescent */}
      <circle cx="78" cy="28" r="5" fill={c.bgEnd} stroke={c.moon} strokeWidth="0.3" />
      <path d="M 78,23 A 5,5 0 0,1 78,33 A 3,5 0 0,0 78,23" fill={c.moon} opacity={0.9} />
    </svg>
  );
}

// OpenStreetMap embed for real location preview
function MapEmbed({ lat, lon }: { lat: number; lon: number; zoom?: number }) {
  return (
    <div className="w-full h-full relative bg-muted overflow-hidden">
      <iframe
        title="Map Preview"
        width="100%"
        height="100%"
        frameBorder="0"
        scrolling="no"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.02}%2C${lat - 0.015}%2C${lon + 0.02}%2C${lat + 0.015}&layer=mapnik&marker=${lat}%2C${lon}`}
        style={{ border: 0 }}
      />
      <div className="absolute bottom-1 right-1 text-[8px] bg-white/80 px-1 rounded">
        OSM
      </div>
    </div>
  );
}

export function PosterPreview({ formData }: PosterPreviewProps) {
  useGoogleFont(formData.titleFont);
  useGoogleFont(formData.subtitleFont);

  const colors = THEME_COLORS[formData.theme] || THEME_COLORS.feature_based;
  const borderPercent = formData.border ?? 5;
  const isLandscape = formData.landscape;
  const rotation = formData.rotation ?? 0;

  // Get paper size dimensions
  const paperSize = PAPER_SIZES.find((p) => p.id === formData.paperSize) || PAPER_SIZES[0];
  const isCustom = formData.paperSize === "custom";

  // Calculate dimensions based on paper size and orientation
  let width: number, height: number;
  if (isCustom) {
    width = formData.widthCm || 21;
    height = formData.heightCm || 29.7;
  } else if (isLandscape) {
    width = paperSize.height;
    height = paperSize.width;
  } else {
    width = paperSize.width;
    height = paperSize.height;
  }

  const aspectRatio = `${width}/${height}`;

  const cityName = formData.city || "City Name";
  const countryName = formData.country || "Country";

  const titleFontFamily = formData.titleFont || "Roboto";
  const subtitleFontFamily = formData.subtitleFont || "Roboto";

  // Parse coordinates from Google Maps URL or use direct coordinates
  const coordinates = useMemo(() => {
    if (formData.googleMapsUrl) {
      return parseGoogleMapsUrl(formData.googleMapsUrl);
    }
    if (formData.lat != null && formData.lon != null) {
      return { lat: formData.lat, lon: formData.lon };
    }
    return null;
  }, [formData.googleMapsUrl, formData.lat, formData.lon]);

  const showRealMap = !!coordinates;

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">Live Preview</h3>

      <div className="flex-1 flex items-center justify-center p-4 bg-muted/30 rounded-lg min-h-[280px]">
        <div
          className={cn(
            "relative shadow-xl transition-all duration-300",
            "max-w-full max-h-full"
          )}
          style={{
            aspectRatio,
            width: isLandscape ? "100%" : "auto",
            height: isLandscape ? "auto" : "100%",
            maxWidth: isLandscape ? "100%" : "200px",
            maxHeight: isLandscape ? "150px" : "280px",
            backgroundColor: colors.bg,
            padding: `${borderPercent}%`,
          }}
        >
          {/* Border frame */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              border: borderPercent > 0 ? `1px solid ${colors.text}30` : "none",
            }}
          />

          {/* Map/Sky area */}
          <div className="relative w-full h-full overflow-hidden">
            {formData.type === "your-sky" ? (
              <SimulatedSky theme={formData.theme} />
            ) : showRealMap && coordinates ? (
              <div
                className="w-full h-full"
                style={{ transform: `rotate(${rotation}deg)` }}
              >
                <MapEmbed lat={coordinates.lat} lon={coordinates.lon} />
              </div>
            ) : (
              <SimulatedMap theme={formData.theme} rotation={rotation} />
            )}

            {/* Title overlay at bottom */}
            <div
              className="absolute bottom-0 left-0 right-0 p-2 text-center"
              style={{
                background: `linear-gradient(to top, ${colors.bg}CC, ${colors.bg}00)`,
              }}
            >
              <h2
                className="font-semibold text-sm leading-tight truncate"
                style={{
                  fontFamily: `"${titleFontFamily}", sans-serif`,
                  color: colors.text,
                }}
              >
                {cityName.toUpperCase()}
              </h2>
              <p
                className="text-[10px] opacity-70 truncate"
                style={{
                  fontFamily: `"${subtitleFontFamily}", sans-serif`,
                  color: colors.text,
                }}
              >
                {countryName}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Location indicator */}
      {coordinates && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span>{coordinates.lat.toFixed(4)}, {coordinates.lon.toFixed(4)}</span>
        </div>
      )}

      {/* Preview info */}
      <div className="mt-3 text-xs text-muted-foreground space-y-1">
        <div className="flex justify-between">
          <span>Size:</span>
          <span>{isCustom ? "Custom" : formData.paperSize} ({width}×{height}cm)</span>
        </div>
        <div className="flex justify-between">
          <span>Theme:</span>
          <span className="capitalize">{formData.theme.replace(/_/g, " ")}</span>
        </div>
        <div className="flex justify-between">
          <span>Rotation:</span>
          <span>{rotation}°</span>
        </div>
        <div className="flex justify-between">
          <span>Border:</span>
          <span>{borderPercent}%</span>
        </div>
        <div className="flex justify-between">
          <span>Title:</span>
          <span>{titleFontFamily}</span>
        </div>
        <div className="flex justify-between">
          <span>Subtitle:</span>
          <span>{subtitleFontFamily}</span>
        </div>
      </div>
    </div>
  );
}
