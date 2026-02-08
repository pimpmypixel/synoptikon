import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { RectangleVertical, RectangleHorizontal, Image, FileText, FileCode, Check } from "lucide-react";
import type { PosterFormData } from "./types";
import { PAPER_SIZES } from "./types";

interface DimensionsStepProps {
  formData: PosterFormData;
  updateFormData: (key: keyof PosterFormData, value: any) => void;
}

export function DimensionsStep({ formData, updateFormData }: DimensionsStepProps) {
  const orientations = [
    { id: false, label: "Portrait", icon: RectangleVertical },
    { id: true, label: "Landscape", icon: RectangleHorizontal },
  ];

  const formats = [
    { id: "png" as const, label: "PNG", icon: Image, description: "300 DPI raster" },
    { id: "svg" as const, label: "SVG", icon: FileCode, description: "Scalable vector" },
    { id: "pdf" as const, label: "PDF", icon: FileText, description: "Print-ready" },
  ];

  const selectedPaper = PAPER_SIZES.find((p) => p.id === formData.paperSize) || PAPER_SIZES[0];
  const isCustom = formData.paperSize === "custom";

  // Get dimensions based on orientation
  const getDimensions = () => {
    if (isCustom) {
      return { width: formData.widthCm || 0, height: formData.heightCm || 0 };
    }
    if (formData.landscape) {
      return { width: selectedPaper.height, height: selectedPaper.width };
    }
    return { width: selectedPaper.width, height: selectedPaper.height };
  };

  const dims = getDimensions();

  const handlePaperSizeChange = (paperId: string) => {
    updateFormData("paperSize", paperId);
    if (paperId !== "custom") {
      const paper = PAPER_SIZES.find((p) => p.id === paperId);
      if (paper) {
        updateFormData("widthCm", undefined);
        updateFormData("heightCm", undefined);
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Paper Size */}
      <div className="space-y-3">
        <Label className="text-base">Paper Size</Label>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {PAPER_SIZES.map((paper) => {
            const isSelected = formData.paperSize === paper.id;
            return (
              <button
                key={paper.id}
                type="button"
                onClick={() => handlePaperSizeChange(paper.id)}
                className={cn(
                  "relative flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
                  "hover:border-primary/50",
                  isSelected ? "border-primary bg-primary/5" : "border-muted"
                )}
              >
                <span className={cn(
                  "text-sm font-bold",
                  isSelected ? "text-primary" : "text-foreground"
                )}>
                  {paper.label}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {paper.id === "custom" ? "Custom" : `${paper.width}×${paper.height}cm`}
                </span>
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
                  "relative flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all",
                  "hover:border-primary/50",
                  isSelected ? "border-primary bg-primary/5" : "border-muted"
                )}
              >
                <Icon className={cn("h-10 w-10", isSelected ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-sm font-medium", isSelected ? "text-foreground" : "text-muted-foreground")}>
                  {orientation.label}
                </span>
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {!isCustom && (
          <p className="text-xs text-muted-foreground">
            Final size: {dims.width} × {dims.height} cm
          </p>
        )}
      </div>

      {/* Custom Dimensions */}
      {isCustom && (
        <div className="space-y-3">
          <Label className="text-base">Custom Dimensions</Label>
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
        </div>
      )}

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

      {/* Border */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="border" className="text-base">Border Width</Label>
          <span className="text-xs text-muted-foreground">(optional)</span>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={15}
            value={formData.border || 0}
            onChange={(e) => updateFormData("border", parseInt(e.target.value))}
            className="flex-1 max-w-xs h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <span className="text-sm font-medium w-12 text-right">{formData.border || 0}%</span>
        </div>
        <p className="text-xs text-muted-foreground">
          White margin around the poster
        </p>
      </div>
    </div>
  );
}
