import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Clock, MapPin, Route, Trees, Droplet, Palette, Save,
  Check, AlertCircle, Loader2, Download, Plus, Sparkles, LayoutGrid
} from "lucide-react";
import { SaveToGoogleDrive } from "@/components/google-drive";
import type { ProgressUpdate } from "./types";

interface ProgressViewProps {
  jobId: string;
  progress: ProgressUpdate | null;
  wsConnected: boolean;
  onReset: () => void;
}

const STAGES = [
  { status: "queued", label: "Queued", icon: Clock },
  { status: "fetching_data", label: "Finding Location", icon: MapPin },
  { status: "downloading_streets", label: "Streets", icon: Route },
  { status: "downloading_parks", label: "Parks", icon: Trees },
  { status: "downloading_water", label: "Water", icon: Droplet },
  { status: "rendering", label: "Rendering", icon: Palette },
  { status: "saving", label: "Saving", icon: Save },
  { status: "completed", label: "Complete", icon: Check },
];

function getStageIndex(status: string): number {
  const index = STAGES.findIndex(s => s.status === status);
  return index >= 0 ? index : 0;
}

export function ProgressView({ jobId, progress, wsConnected, onReset }: ProgressViewProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const currentStageIndex = progress ? getStageIndex(progress.status) : 0;
  const isCompleted = progress?.status === "completed";
  const isError = progress?.status === "error";

  useEffect(() => {
    if (isCompleted) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isCompleted]);

  const getPosterUrl = (outputFile: string) => {
    const filename = outputFile.split("/").pop() || outputFile.split("\\").pop();
    return `/posters-files/${filename}`;
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">
          {isCompleted ? "Your Poster is Ready!" : isError ? "Something Went Wrong" : "Creating Your Poster"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isCompleted ? "Download your masterpiece below" : isError ? progress?.error : `Job ID: ${jobId}`}
        </p>
      </div>

      {/* Progress Card */}
      <Card className={cn(
        "relative overflow-hidden transition-all duration-500",
        isCompleted && "border-green-500/50 bg-green-500/5",
        isError && "border-destructive/50 bg-destructive/5"
      )}>
        {/* Confetti Effect */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <Sparkles
                key={i}
                className="absolute text-yellow-500 animate-ping"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${0.5 + Math.random() * 0.5}s`,
                  opacity: 0.6,
                }}
              />
            ))}
          </div>
        )}

        <CardContent className="pt-6">
          {/* Connection Status */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className={cn(
              "w-2 h-2 rounded-full",
              wsConnected ? "bg-green-500 animate-pulse" : "bg-yellow-500"
            )} />
            <span className="text-xs text-muted-foreground">
              {wsConnected ? "Connected" : "Connecting..."}
            </span>
          </div>

          {/* Progress Bar */}
          {!isError && (
            <div className="mb-8">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">{progress?.message || "Initializing..."}</span>
                <span className="text-muted-foreground">{progress?.progress || 0}%</span>
              </div>
              <Progress
                value={progress?.progress || 0}
                className={cn("h-3", isCompleted && "[&>div]:bg-green-500")}
              />
            </div>
          )}

          {/* Stage Timeline */}
          {!isError && (
            <div className="relative">
              {/* Vertical Line */}
              <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-muted" />

              <div className="space-y-4">
                {STAGES.map((stage, index) => {
                  const Icon = stage.icon;
                  const isPast = index < currentStageIndex;
                  const isCurrent = index === currentStageIndex && !isCompleted;
                  const isLast = stage.status === "completed";

                  if (isLast && !isCompleted) return null;

                  return (
                    <div key={stage.status} className="flex items-center gap-4 relative">
                      <div
                        className={cn(
                          "relative z-10 flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300",
                          isPast && "bg-primary text-primary-foreground",
                          isCurrent && "bg-primary text-primary-foreground animate-pulse scale-110",
                          !isPast && !isCurrent && "bg-muted text-muted-foreground",
                          isLast && isCompleted && "bg-green-500 text-white"
                        )}
                      >
                        {isCurrent ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-sm transition-colors",
                          isPast && "text-foreground",
                          isCurrent && "text-foreground font-medium",
                          !isPast && !isCurrent && "text-muted-foreground",
                          isLast && isCompleted && "text-green-600 dark:text-green-400 font-medium"
                        )}
                      >
                        {stage.label}
                        {isCurrent && <span className="ml-2 text-muted-foreground">...</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <p className="text-sm text-destructive text-center max-w-sm">
                {progress?.error || "An unexpected error occurred. Please try again."}
              </p>
            </div>
          )}

          {/* Success Preview */}
          {isCompleted && progress?.outputFile && (
            <div className="mt-8 space-y-4">
              {progress.outputFile.endsWith('.png') && (
                <div className="relative rounded-lg overflow-hidden bg-muted aspect-[3/4] max-w-xs mx-auto">
                  <img
                    src={getPosterUrl(progress.outputFile)}
                    alt="Generated poster preview"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div className="flex justify-center gap-3">
                <Button asChild size="lg" className="gap-2">
                  <a href={getPosterUrl(progress.outputFile)} download>
                    <Download className="w-5 h-5" />
                    Download
                  </a>
                </Button>
                <SaveToGoogleDrive
                  fileUrl={getPosterUrl(progress.outputFile)}
                  fileName={progress.outputFile.split("/").pop() || "poster.png"}
                  mimeType={
                    progress.outputFile.endsWith(".pdf")
                      ? "application/pdf"
                      : progress.outputFile.endsWith(".svg")
                        ? "image/svg+xml"
                        : "image/png"
                  }
                  variant="outline"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          {(isCompleted || isError) && (
            <div className="flex justify-center gap-3 mt-6 pt-6 border-t">
              <Button variant="outline" onClick={onReset} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Another
              </Button>
              <Button variant="outline" asChild className="gap-2">
                <a href="/">
                  <LayoutGrid className="w-4 h-4" />
                  View Gallery
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
