import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { RectangleVertical, RectangleHorizontal, Image, FileText, FileCode, Check } from "lucide-react";
import type { PosterFormData } from "./types";

interface DimensionsStepProps {
  formData: PosterFormData;
  updateFormData: (key: keyof PosterFormData, value: any) => void;
}

export function DimensionsStep({ formData, updateFormData }: DimensionsStepProps) {
  const orientations = [
    { id: false, label: "Portrait", icon: RectangleVertical, ratio: "3:4" },
    { id: true, label: "Landscape", icon: RectangleHorizontal, ratio: "4:3" },
  ];

  const formats = [
    { id: "png" as const, label: "PNG", icon: Image, description: "300 DPI raster" },
    { id: "svg" as const, label: "SVG", icon: FileCode, description: "Scalable vector" },
    { id: "pdf" as const, label: "PDF", icon: FileText, description: "Print-ready" },
  ];

  return (
    <div className="space-y-8">
      {/* Orientation */}
      <div className="space-y-3">
        <Label className="text-base">Orientation</Label>
        <div className="grid grid-cols-2 gap-4 max-w-md">
          {orientations.map((orientation) => {
            const Icon = orientation.icon;
            const isSelected = formData.landscape === orientation.id;
            return (
              <button
                key={String(orientation.id)}
                type="button"
                onClick={() => updateFormData("landscape", orientation.id)}
                className={cn(
                  "relative flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all",
                  "hover:border-primary/50",
                  isSelected ? "border-primary bg-primary/5" : "border-muted"
                )}
              >
                <Icon className={cn("h-12 w-12", isSelected ? "text-primary" : "text-muted-foreground")} />
                <div className="text-center">
                  <span className={cn("text-sm font-medium block", isSelected ? "text-foreground" : "text-muted-foreground")}>
                    {orientation.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{orientation.ratio}</span>
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

      {/* Output Format */}
      <div className="space-y-3">
        <Label className="text-base">Output Format</Label>
        <div className="grid grid-cols-3 gap-3 max-w-lg">
          {formats.map((format) => {
            const Icon = format.icon;
            const isSelected = formData.format === format.id;
            return (
              <button
                key={format.id}
                type="button"
                onClick={() => updateFormData("format", format.id)}
                className={cn(
                  "relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                  "hover:border-primary/50",
                  isSelected ? "border-primary bg-primary/5" : "border-muted"
                )}
              >
                <Icon className={cn("h-6 w-6", isSelected ? "text-primary" : "text-muted-foreground")} />
                <div className="text-center">
                  <span className={cn("text-sm font-bold block", isSelected ? "text-primary" : "text-foreground")}>
                    {format.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{format.description}</span>
                </div>
                {isSelected && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Dimensions (Optional) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-base">Custom Dimensions</Label>
          <span className="text-xs text-muted-foreground">(optional)</span>
        </div>
        <div className="grid grid-cols-2 gap-4 max-w-xs">
          <div className="space-y-2">
            <Label htmlFor="width" className="text-xs text-muted-foreground">Width (cm)</Label>
            <Input
              id="width"
              type="number"
              step="0.1"
              min="10"
              max="200"
              placeholder="e.g., 50"
              value={formData.widthCm || ""}
              onChange={(e) => updateFormData("widthCm", e.target.value ? parseFloat(e.target.value) : undefined)}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height" className="text-xs text-muted-foreground">Height (cm)</Label>
            <Input
              id="height"
              type="number"
              step="0.1"
              min="10"
              max="200"
              placeholder="e.g., 70"
              value={formData.heightCm || ""}
              onChange={(e) => updateFormData("heightCm", e.target.value ? parseFloat(e.target.value) : undefined)}
              className="h-11"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Leave empty to use standard A-format dimensions
        </p>
      </div>

      {/* Border (Optional) */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="border" className="text-base">Border Width</Label>
          <span className="text-xs text-muted-foreground">(optional)</span>
        </div>
        <div className="max-w-[120px]">
          <Input
            id="border"
            type="number"
            min={0}
            max={20}
            placeholder="0"
            value={formData.border || ""}
            onChange={(e) => updateFormData("border", e.target.value ? parseInt(e.target.value) : undefined)}
            className="h-11"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Border as percentage of poster size (0-20%)
        </p>
      </div>
    </div>
  );
}
