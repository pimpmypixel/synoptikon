import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Check, Type } from "lucide-react";
import { GOOGLE_FONTS } from "./types";

interface FontSelectorProps {
  label: string;
  value?: string;
  onChange: (font: string) => void;
  previewText?: string;
}

// Load Google Fonts dynamically
function useGoogleFonts() {
  useEffect(() => {
    const families = GOOGLE_FONTS.map(f =>
      `${f.family.replace(/ /g, '+')}:wght@300;400;500;600;700`
    ).join('&family=');

    const linkId = 'google-fonts-link';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`;
      document.head.appendChild(link);
    }
  }, []);
}

export function FontSelector({ label, value, onChange, previewText = "City Name" }: FontSelectorProps) {
  useGoogleFonts();

  return (
    <div className="space-y-3">
      <Label className="text-base">{label}</Label>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {GOOGLE_FONTS.map((font) => {
          const isSelected = value === font.family;
          return (
            <button
              key={font.family}
              type="button"
              onClick={() => onChange(font.family)}
              className={cn(
                "relative flex flex-col items-start p-3 rounded-lg border-2 transition-all text-left",
                "hover:border-primary/50 hover:bg-accent/50",
                isSelected ? "border-primary bg-primary/5" : "border-muted"
              )}
            >
              {/* Font Preview */}
              <div
                className="w-full mb-2 text-lg font-semibold truncate"
                style={{ fontFamily: `'${font.family}', ${font.category}` }}
              >
                {previewText}
              </div>

              {/* Font Name */}
              <span className="text-xs font-medium text-foreground truncate w-full">
                {font.family}
              </span>

              {/* Category */}
              <span className="text-[10px] text-muted-foreground">
                {font.preview}
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
    </div>
  );
}

// Compact version for inline use
export function FontSelectorCompact({ label, value, onChange }: Omit<FontSelectorProps, 'previewText'>) {
  useGoogleFonts();

  return (
    <div className="space-y-2">
      <Label className="text-sm flex items-center gap-1.5">
        <Type className="w-3.5 h-3.5" />
        {label}
      </Label>
      <div className="flex flex-wrap gap-2">
        {GOOGLE_FONTS.map((font) => {
          const isSelected = value === font.family;
          return (
            <button
              key={font.family}
              type="button"
              onClick={() => onChange(font.family)}
              className={cn(
                "px-3 py-1.5 rounded-md border transition-all text-sm",
                "hover:border-primary/50",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted bg-background"
              )}
              style={{ fontFamily: `'${font.family}', ${font.category}` }}
            >
              {font.family}
            </button>
          );
        })}
      </div>
    </div>
  );
}
