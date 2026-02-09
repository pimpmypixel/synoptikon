import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Star, Moon } from "lucide-react";
import type { PosterFormData } from "./types";

interface PosterType {
  id: "map" | "night-sky";
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  features: string[];
}

const POSTER_TYPES: PosterType[] = [
  {
    id: "map",
    label: "Map Poster",
    description: "Create beautiful maps from any location",
    icon: MapPin,
    features: ["OpenStreetMap data", "Custom themes", "Geographic accuracy"]
  },
  {
    id: "night-sky",
    label: "Night Sky Poster",
    description: "Capture the beauty of the night sky",
    icon: Star,
    features: ["Real-time astronomy", "Celestial objects", "Starry constellations"]
  }
];

interface PosterTypeSelectorProps {
  value: PosterFormData["type"];
  onChange: (type: PosterFormData["type"]) => void;
}

export function PosterTypeSelector({ value, onChange }: PosterTypeSelectorProps) {
  const selectedType = POSTER_TYPES.find(type => type.id === value);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Choose Poster Type</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {POSTER_TYPES.map((type) => (
              <Button
                key={type.id}
                variant={value === type.id ? "default" : "outline"}
                className="h-24 p-4 flex flex-col items-center space-y-2 text-left border-2 border-border rounded-lg transition-all hover:shadow-md"
                onClick={() => onChange(type.id)}
              >
                <type.icon className="h-8 w-8 mb-2" />
                <h3 className="font-semibold text-lg">{type.label}</h3>
                <p className="text-sm text-muted-foreground text-center">{type.description}</p>
                
                {value === type.id && (
                  <div className="mt-4 space-y-1">
                    {type.features.map((feature, index) => (
                      <div key={index} className="flex items-center text-xs text-muted-foreground">
                        <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
                        {feature}
                      </div>
                    ))}
                  </div>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}