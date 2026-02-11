import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LocateFixed, Loader2, Clock } from "lucide-react";
import type { PosterFormData } from "./types";
import { DISTANCE_OPTIONS } from "./types";
import { RotationDial } from "./RotationDial";

interface LocationStepProps {
  formData: PosterFormData;
  updateFormData: (key: keyof PosterFormData, value: any) => void;
}

/** Parse a Google Maps URL to extract lat/lon */
function parseGoogleMapsUrl(url: string): { lat: number; lon: number } | null {
  if (!url) return null;
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lon: parseFloat(atMatch[2]) };
  const placeMatch = url.match(/place\/[^@]*@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (placeMatch) return { lat: parseFloat(placeMatch[1]), lon: parseFloat(placeMatch[2]) };
  const dMatch = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (dMatch) return { lat: parseFloat(dMatch[1]), lon: parseFloat(dMatch[2]) };
  return null;
}

export function LocationStep({ formData, updateFormData }: LocationStepProps) {
  const isMap = formData.type === "map";
  const isYourSky = formData.type === "your-sky";
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const handleGoogleMapsUrlChange = (url: string) => {
    updateFormData("googleMapsUrl", url);
    const coords = parseGoogleMapsUrl(url);
    if (coords) {
      updateFormData("lat", coords.lat);
      updateFormData("lon", coords.lon);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation not supported by your browser");
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateFormData("lat", parseFloat(pos.coords.latitude.toFixed(6)));
        updateFormData("lon", parseFloat(pos.coords.longitude.toFixed(6)));
        setGeoLoading(false);
      },
      (err) => {
        setGeoError(err.message);
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSetNow = () => {
    const now = new Date();
    // Format as datetime-local value: YYYY-MM-DDTHH:MM
    const pad = (n: number) => n.toString().padStart(2, "0");
    const val = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    updateFormData("timestamp", val);
  };

  return (
    <div className="space-y-6">
      {/* Header & Subheader (poster title/subtitle labels) */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">Header</Label>
          <Input
            id="city"
            placeholder="e.g., Paris"
            value={formData.city}
            onChange={(e) => updateFormData("city", e.target.value)}
            className="h-11"
          />
          <p className="text-xs text-muted-foreground">Main title on the poster</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">Subheader</Label>
          <Input
            id="country"
            placeholder="e.g., France"
            value={formData.country}
            onChange={(e) => updateFormData("country", e.target.value)}
            className="h-11"
          />
          <p className="text-xs text-muted-foreground">Subtitle on the poster</p>
        </div>
      </div>

      {/* Google Maps URL */}
      <div className="space-y-2">
        <Label htmlFor="google-url">Google Maps URL</Label>
        <Input
          id="google-url"
          placeholder="https://www.google.com/maps/@48.8566,2.3522,15z"
          value={formData.googleMapsUrl || ""}
          onChange={(e) => handleGoogleMapsUrlChange(e.target.value)}
          className="h-11"
        />
        <p className="text-xs text-muted-foreground">
          Paste a Google Maps link — coordinates will be extracted automatically
        </p>
      </div>

      {/* Latitude / Longitude + Use My Location */}
      <div className="space-y-2">
        <div className="flex items-end gap-3">
          <div className="space-y-2 flex-1">
            <Label htmlFor="lat">Latitude</Label>
            <Input
              id="lat"
              type="number"
              step="0.0001"
              placeholder="e.g., 48.8566"
              value={formData.lat ?? ""}
              onChange={(e) => updateFormData("lat", e.target.value ? parseFloat(e.target.value) : undefined)}
              className="h-11"
            />
          </div>
          <div className="space-y-2 flex-1">
            <Label htmlFor="lon">Longitude</Label>
            <Input
              id="lon"
              type="number"
              step="0.0001"
              placeholder="e.g., 2.3522"
              value={formData.lon ?? ""}
              onChange={(e) => updateFormData("lon", e.target.value ? parseFloat(e.target.value) : undefined)}
              className="h-11"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-11 gap-2 flex-shrink-0"
            onClick={handleUseMyLocation}
            disabled={geoLoading}
          >
            {geoLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LocateFixed className="w-4 h-4" />
            )}
            My Location
          </Button>
        </div>
        {geoError && (
          <p className="text-xs text-destructive">{geoError}</p>
        )}
      </div>

      {/* === Map-specific: Distance & Rotation === */}
      {isMap && (
        <>
          <div className="space-y-3 pt-4 border-t">
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
                      "flex flex-col items-center py-2 px-2 rounded-lg border-2 transition-all",
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

          <div className="space-y-3">
            <Label className="text-base">Map Rotation</Label>
            <RotationDial
              value={formData.rotation || 0}
              onChange={(value) => updateFormData("rotation", value)}
              size={100}
            />
          </div>
        </>
      )}

      {/* === Night sky-specific: Date/Time & Projection === */}
      {isYourSky && (
        <>
          <div className="space-y-3 pt-4 border-t">
            <Label className="text-base">Observation Date & Time</Label>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Input
                  type="datetime-local"
                  value={formData.timestamp || ""}
                  onChange={(e) => updateFormData("timestamp", e.target.value)}
                  className="h-11"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-11 gap-2 flex-shrink-0"
                onClick={handleSetNow}
              >
                <Clock className="w-4 h-4" />
                Now
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The date and time to render the sky for this location
            </p>
          </div>

          <div className="space-y-3">
            <Label className="text-base">Projection</Label>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              {([
                { id: "stereographic" as const, label: "Stereographic", description: "Preserves angles, circular horizon" },
                { id: "polar" as const, label: "Polar", description: "North/south pole centered view" },
              ]).map((proj) => {
                const isSelected = (formData.projection?.type || "stereographic") === proj.id;
                return (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => updateFormData("projection", { ...formData.projection, type: proj.id })}
                    className={cn(
                      "flex flex-col items-start gap-1 p-3 rounded-lg border-2 transition-all text-left",
                      "hover:border-primary/50",
                      isSelected ? "border-primary bg-primary/5" : "border-muted"
                    )}
                  >
                    <span className={cn("text-sm font-semibold", isSelected ? "text-primary" : "text-foreground")}>
                      {proj.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{proj.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Celestial Object Toggles */}
          <div className="space-y-3 pt-4 border-t">
            <Label className="text-base">Celestial Objects</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {([
                { key: "stars" as const, label: "Stars", defaultOn: true },
                { key: "planets" as const, label: "Planets", defaultOn: true },
                { key: "moon" as const, label: "Moon", defaultOn: true },
                { key: "constellations" as const, label: "Constellations", defaultOn: true },
                { key: "zodiac" as const, label: "Zodiac Symbols", defaultOn: false },
                { key: "grid" as const, label: "Grid", defaultOn: false },
              ] as const).map((obj) => {
                const currentObjects = formData.celestialObjects || {};
                const isChecked = currentObjects[obj.key] ?? obj.defaultOn;
                return (
                  <label key={obj.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => updateFormData("celestialObjects", {
                        ...currentObjects,
                        [obj.key]: e.target.checked,
                      })}
                      className="rounded border-muted-foreground"
                    />
                    <span className="text-sm">{obj.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Star Color Mode */}
          <div className="space-y-3">
            <Label className="text-base">Star Color Mode</Label>
            <div className="grid grid-cols-3 gap-3 max-w-md">
              {([
                { id: "realistic" as const, label: "Realistic", description: "Spectral B-V coloring" },
                { id: "temperature" as const, label: "Temperature", description: "Color by temperature" },
                { id: "monochrome" as const, label: "Monochrome", description: "Theme-based colors" },
              ]).map((mode) => {
                const isSelected = (formData.styling?.starColors || "realistic") === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => updateFormData("styling", { ...formData.styling, starColors: mode.id })}
                    className={cn(
                      "flex flex-col items-start gap-0.5 p-2 rounded-lg border-2 transition-all text-left",
                      "hover:border-primary/50",
                      isSelected ? "border-primary bg-primary/5" : "border-muted"
                    )}
                  >
                    <span className={cn("text-xs font-semibold", isSelected ? "text-primary" : "text-foreground")}>
                      {mode.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{mode.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
