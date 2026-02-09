import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Moon, Telescope } from "lucide-react";
import type { PosterFormData } from "./types";

interface NightSkyStepProps {
  value: Omit<PosterFormData, "type"> & { type: "night-sky" };
  onChange: (updates: Partial<Omit<PosterFormData, "type"> & { type: "night-sky" }>) => void;
}

export function NightSkyStep({ value, onChange }: NightSkyStepProps) {
  const handleCelestialObjectsChange = (key: string, isChecked: boolean) => {
    onChange({
      celestialObjects: {
        ...value.celestialObjects,
        [key]: isChecked
      }
    });
  };

  const handleProjectionChange = (key: string, field: any) => {
    onChange({
      projection: {
        ...value.projection,
        [key]: field
      } as any
    });
  };

  const handleStylingChange = (key: string, field: any) => {
    onChange({
      styling: {
        ...value.styling,
        [key]: field
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Telescope className="h-5 w-5" />
            Night Sky Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Celestial Objects */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Star className="h-4 w-4" />
              Celestial Objects
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { key: "stars", label: "Stars", icon: "✨" },
                { key: "planets", label: "Planets", icon: "🪐" },
                { key: "moon", label: "Moon", icon: "🌙" },
                { key: "constellations", label: "Constellations", icon: "⭐" },
                { key: "deepSkyObjects", label: "Deep Sky Objects", icon: "🌌" }
              ].map(({ key, label, icon }) => (
                <label key={key} className="flex items-center space-x-2 cursor-pointer hover:bg-accent rounded p-2 transition-colors">
                  <input
                    type="checkbox"
                    checked={value.celestialObjects?.[key as keyof typeof value.celestialObjects] || false}
                    onChange={(e) => handleCelestialObjectsChange(key, (e.target as HTMLInputElement).checked)}
                    className="mr-2"
                  />
                  <span className="text-sm">{icon}</span>
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Projection */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Moon className="h-4 w-4" />
              Projection Settings
            </h4>
            <div className="space-y-3">
              <div>
                <label className="flex items-center space-x-2">
                  <span className="text-sm w-24">Field of View</span>
                  <input
                    type="number"
                    value={value.projection?.fov || 180}
                    onChange={(e) => handleProjectionChange("fov", (e.target as HTMLInputElement).value)}
                    className="w-20 px-2 py-1 border rounded"
                    min="30"
                    max="360"
                  />
                  <span className="text-sm text-muted-foreground">degrees</span>
                </label>
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={value.projection?.northUp !== false}
                    onChange={(e) => handleProjectionChange("northUp", (e.target as HTMLInputElement).checked)}
                    className="mr-2"
                  />
                  <span className="text-sm">North at top</span>
                </label>
              </div>
            </div>
          </div>

          {/* Styling */}
          <div>
            <h4 className="font-medium mb-3">Visual Styling</h4>
            <div className="space-y-3">
              <div>
                <label className="flex items-center space-x-2">
                  <span className="text-sm w-32">Star Colors</span>
                  <select
                    value={value.styling?.starColors || "realistic"}
                    onChange={(e) => handleStylingChange("starColors", (e.target as HTMLSelectElement).value)}
                    className="px-2 py-1 border rounded"
                  >
                    <option value="realistic">Realistic</option>
                    <option value="temperature">Temperature</option>
                    <option value="monochrome">Monochrome</option>
                  </select>
                </label>
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={value.styling?.constellationLines !== false}
                    onChange={(e) => handleStylingChange("constellationLines", (e.target as HTMLInputElement).checked)}
                    className="mr-2"
                  />
                  <span className="text-sm">Constellation Lines</span>
                </label>
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={value.styling?.constellationLabels !== false}
                    onChange={(e) => handleStylingChange("constellationLabels", (e.target as HTMLInputElement).checked)}
                    className="mr-2"
                  />
                  <span className="text-sm">Constellation Labels</span>
                </label>
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={value.styling?.gridLines !== false}
                    onChange={(e) => handleStylingChange("gridLines", (e.target as HTMLInputElement).checked)}
                    className="mr-2"
                  />
                  <span className="text-sm">Grid Lines</span>
                </label>
              </div>
            </div>
          </div>

          {/* Timestamp */}
          <div>
            <h4 className="font-medium mb-3">Observation Time</h4>
            <div>
              <label className="flex items-center space-x-2">
                <span className="text-sm w-24">Date & Time</span>
                <input
                  type="datetime-local"
                  value={value.timestamp || ""}
                  onChange={(e) => onChange({ timestamp: (e.target as HTMLInputElement).value })}
                  className="px-2 py-1 border rounded"
                />
              </label>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}