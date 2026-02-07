import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { MapPin, Navigation, Link2 } from "lucide-react";
import type { PosterFormData, LocationMode } from "./types";

interface LocationStepProps {
  formData: PosterFormData;
  updateFormData: (key: keyof PosterFormData, value: any) => void;
  locationMode: LocationMode;
  setLocationMode: (mode: LocationMode) => void;
}

export function LocationStep({ formData, updateFormData, locationMode, setLocationMode }: LocationStepProps) {
  const modes = [
    { id: "city" as const, label: "City & Country", icon: MapPin, description: "Enter city name" },
    { id: "coords" as const, label: "Coordinates", icon: Navigation, description: "Use lat/lon" },
    { id: "google" as const, label: "Google Maps", icon: Link2, description: "Paste URL" },
  ];

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <div className="grid grid-cols-3 gap-3">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = locationMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => setLocationMode(mode.id)}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                "hover:border-primary/50",
                isActive ? "border-primary bg-primary/5" : "border-muted"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-sm font-medium", isActive ? "text-foreground" : "text-muted-foreground")}>
                {mode.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* City/Country Input */}
      {locationMode === "city" && (
        <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-200">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              placeholder="e.g., Paris"
              value={formData.city}
              onChange={(e) => updateFormData("city", e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              placeholder="e.g., France"
              value={formData.country}
              onChange={(e) => updateFormData("country", e.target.value)}
              className="h-11"
            />
          </div>
        </div>
      )}

      {/* Coordinates Input */}
      {locationMode === "coords" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lat">Latitude</Label>
              <Input
                id="lat"
                type="number"
                step="0.0001"
                placeholder="e.g., 48.8566"
                value={formData.lat || ""}
                onChange={(e) => updateFormData("lat", e.target.value ? parseFloat(e.target.value) : undefined)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lon">Longitude</Label>
              <Input
                id="lon"
                type="number"
                step="0.0001"
                placeholder="e.g., 2.3522"
                value={formData.lon || ""}
                onChange={(e) => updateFormData("lon", e.target.value ? parseFloat(e.target.value) : undefined)}
                className="h-11"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city-coords">City (for label)</Label>
              <Input
                id="city-coords"
                placeholder="e.g., Paris"
                value={formData.city}
                onChange={(e) => updateFormData("city", e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country-coords">Country (for label)</Label>
              <Input
                id="country-coords"
                placeholder="e.g., France"
                value={formData.country}
                onChange={(e) => updateFormData("country", e.target.value)}
                className="h-11"
              />
            </div>
          </div>
        </div>
      )}

      {/* Google Maps URL Input */}
      {locationMode === "google" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="space-y-2">
            <Label htmlFor="google-url">Google Maps URL</Label>
            <Input
              id="google-url"
              placeholder="https://www.google.com/maps/@48.8566,2.3522,15z"
              value={formData.googleMapsUrl || ""}
              onChange={(e) => updateFormData("googleMapsUrl", e.target.value)}
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              Copy a Google Maps link with coordinates in the URL
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city-google">City (for label)</Label>
              <Input
                id="city-google"
                placeholder="e.g., Paris"
                value={formData.city}
                onChange={(e) => updateFormData("city", e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country-google">Country (for label)</Label>
              <Input
                id="country-google"
                placeholder="e.g., France"
                value={formData.country}
                onChange={(e) => updateFormData("country", e.target.value)}
                className="h-11"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
