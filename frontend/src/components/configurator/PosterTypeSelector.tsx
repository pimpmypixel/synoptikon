import { cn } from "@/lib/utils";
import { MapPin, Star, Check } from "lucide-react";
import type { PosterFormData } from "./types";

interface PosterType {
  id: "map" | "your-sky";
  label: string;
  description: string;
  icon: React.ComponentType<any>;
}

const POSTER_TYPES: PosterType[] = [
  {
    id: "map",
    label: "Map Poster",
    description: "Street maps from any location",
    icon: MapPin,
  },
  {
    id: "your-sky",
    label: "Your Sky",
    description: "Star chart of the sky above",
    icon: Star,
  },
];

interface PosterTypeSelectorProps {
  value: PosterFormData["type"];
  onChange: (type: PosterFormData["type"]) => void;
}

export function PosterTypeSelector({ value, onChange }: PosterTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      {POSTER_TYPES.map((type) => {
        const Icon = type.icon;
        const isSelected = value === type.id;
        return (
          <button
            key={type.id}
            type="button"
            onClick={() => onChange(type.id)}
            className={cn(
              "relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
              "hover:border-primary/50 hover:shadow-sm",
              isSelected
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-muted bg-card"
            )}
          >
            <div
              className={cn(
                "flex items-center justify-center w-12 h-12 rounded-lg",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <div className={cn("font-semibold", isSelected && "text-primary")}>
                {type.label}
              </div>
              <div className="text-sm text-muted-foreground">{type.description}</div>
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
  );
}
