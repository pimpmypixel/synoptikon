import { useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { THEME_COLORS } from "./theme-colors";
import type { PosterFormData } from "./types";
import { PAPER_SIZES } from "./types";
import { MapPin } from "lucide-react";

interface PosterPreviewProps {
  formData: PosterFormData;
  locationMode?: "city" | "coords" | "google";
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

// OpenStreetMap embed for real location preview
function MapEmbed({ lat, lon, zoom = 14 }: { lat: number; lon: number; zoom?: number }) {
  // Use OpenStreetMap static tiles
  const tileUrl = `https://tile.openstreetmap.org/${zoom}/${Math.floor((lon + 180) / 360 * Math.pow(2, zoom))}/${Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))}.png`;

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

export function PosterPreview({ formData, locationMode }: PosterPreviewProps) {
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
    if (formData.lat !== undefined && formData.lon !== undefined) {
      return { lat: formData.lat, lon: formData.lon };
    }
    return null;
  }, [formData.googleMapsUrl, formData.lat, formData.lon]);

  const showRealMap = coordinates && (locationMode === "google" || locationMode === "coords");

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

          {/* Map area */}
          <div className="relative w-full h-full overflow-hidden">
            {showRealMap && coordinates ? (
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
