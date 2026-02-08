import { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { RotateCw } from "lucide-react";

interface RotationDialProps {
  value: number;
  onChange: (value: number) => void;
  size?: number;
}

export function RotationDial({ value, onChange, size = 120 }: RotationDialProps) {
  const dialRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const calculateAngle = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!dialRef.current) return value;

    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const x = e.clientX - centerX;
    const y = e.clientY - centerY;

    // Calculate angle in degrees (0 is top, clockwise positive)
    let angle = Math.atan2(x, -y) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    return Math.round(angle);
  }, [value]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    onChange(calculateAngle(e));
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      onChange(calculateAngle(e));
    }
  }, [isDragging, calculateAngle, onChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add/remove event listeners
  useState(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  });

  // Snap to common angles
  const snapAngles = [0, 45, 90, 135, 180, 225, 270, 315];
  const snapToAngle = (angle: number) => {
    const tolerance = 5;
    for (const snap of snapAngles) {
      if (Math.abs(angle - snap) <= tolerance || Math.abs(angle - snap + 360) <= tolerance) {
        return snap;
      }
    }
    return angle;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value) || 0;
    onChange(Math.max(0, Math.min(360, newValue)) % 360);
  };

  const displayValue = snapToAngle(value);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Dial */}
      <div
        ref={dialRef}
        className={cn(
          "relative rounded-full border-2 cursor-pointer transition-colors",
          isDragging ? "border-primary" : "border-muted hover:border-muted-foreground"
        )}
        style={{ width: size, height: size }}
        onMouseDown={handleMouseDown}
      >
        {/* Dial background with tick marks */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          {/* Outer ring */}
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-muted"
          />

          {/* Tick marks */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
            const rad = (angle - 90) * (Math.PI / 180);
            const x1 = 50 + 40 * Math.cos(rad);
            const y1 = 50 + 40 * Math.sin(rad);
            const x2 = 50 + 46 * Math.cos(rad);
            const y2 = 50 + 46 * Math.sin(rad);
            return (
              <line
                key={angle}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                strokeWidth={angle % 90 === 0 ? 2 : 1}
                className={angle % 90 === 0 ? "text-foreground" : "text-muted-foreground"}
              />
            );
          })}

          {/* Cardinal labels */}
          <text x="50" y="18" textAnchor="middle" className="text-[8px] fill-muted-foreground">N</text>
          <text x="85" y="53" textAnchor="middle" className="text-[8px] fill-muted-foreground">E</text>
          <text x="50" y="88" textAnchor="middle" className="text-[8px] fill-muted-foreground">S</text>
          <text x="15" y="53" textAnchor="middle" className="text-[8px] fill-muted-foreground">W</text>
        </svg>

        {/* Pointer */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: `rotate(${value}deg)` }}
        >
          <div className="absolute top-2 w-1 h-8 bg-primary rounded-full" />
        </div>

        {/* Center button */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 rounded-full bg-background border flex items-center justify-center">
            <RotateCw className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Value input */}
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={359}
          value={displayValue}
          onChange={handleInputChange}
          className="w-16 text-center text-sm font-medium bg-background border rounded px-2 py-1"
        />
        <span className="text-sm text-muted-foreground">°</span>
        <button
          onClick={() => onChange(0)}
          className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded border"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
