import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMotiaStream } from "@motiadev/stream-client-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  Download,
  Image as ImageIcon,
  RefreshCw,
  MapPin,
  PenTool,
  Clock,
  Copy,
  Eye,
  Trash2,
  X,
  AlertTriangle,
  Route,
  Trees,
  Droplet,
  Palette,
  Save,
  Check,
  Loader2,
  AlertCircle,
  Star,
} from "lucide-react";
import type { PosterFormData, PosterJob } from "@/components/configurator";
import { SaveToGoogleDrive } from "@/components/google-drive";

interface PosterInfo {
  filename: string;
  url: string;
  thumbnailUrl: string;
  city: string;
  country: string;
  theme: string;
  format: string;
  distance: number;
  landscape: boolean;
  titleFont?: string;
  subtitleFont?: string;
  paperSize?: string;
  rotation?: number;
  border?: number;
  type: "map" | "your-sky";
  fileSize?: number;
  createdAt?: string;
  lat?: number;
  lon?: number;
  widthCm?: number;
  heightCm?: number;
}

type ViewMode = "grid" | "table";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function PosterGridSkeleton() {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Skeleton className="aspect-[3/4] w-full" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-32" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-7 w-16" />
        </div>
      </div>
    </div>
  );
}

function PreviewModal({
  poster,
  onClose,
}: {
  poster: PosterInfo;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[90vh] bg-background rounded-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>

        {poster.format === "png" ? (
          <img
            src={poster.url}
            alt={`${poster.city} poster`}
            className="max-w-full max-h-[85vh] object-contain"
          />
        ) : poster.thumbnailUrl ? (
          <img
            src={poster.thumbnailUrl}
            alt={`${poster.city} poster preview`}
            className="max-w-full max-h-[85vh] object-contain"
          />
        ) : (
          <div className="w-96 h-96 flex flex-col items-center justify-center bg-muted">
            <ImageIcon className="w-16 h-16 text-muted-foreground" />
            <span className="text-lg text-muted-foreground mt-2">
              {poster.format.toUpperCase()} Preview Not Available
            </span>
          </div>
        )}

        <div className="p-4 border-t bg-background">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{poster.city}</h3>
              <p className="text-sm text-muted-foreground">{poster.country}</p>
            </div>
            <Button size="sm" asChild>
              <a href={poster.url} download={poster.filename}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  poster,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  poster: PosterInfo;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-background rounded-lg p-6 max-w-md w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-full bg-destructive/10">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold">Delete Poster</h3>
            <p className="text-sm text-muted-foreground">
              This action cannot be undone
            </p>
          </div>
        </div>

        <p className="text-sm mb-6">
          Are you sure you want to delete the poster for{" "}
          <span className="font-medium">{poster.city}, {poster.country}</span>?
        </p>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PosterGridCard({
  poster,
  onClone,
  onPreview,
  onDelete,
}: {
  poster: PosterInfo;
  onClone: () => void;
  onPreview: () => void;
  onDelete: () => void;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div className="rounded-lg border bg-card overflow-hidden group hover:shadow-lg transition-shadow">
      {/* Thumbnail */}
      <div
        className="aspect-[3/4] bg-muted relative cursor-pointer"
        onClick={onPreview}
      >
        {poster.format === "png" || poster.thumbnailUrl ? (
          <>
            {!imageLoaded && !imageError && (
              <Skeleton className="absolute inset-0" />
            )}
            <img
              src={poster.thumbnailUrl || poster.url}
              alt={`${poster.city} poster`}
              className={cn(
                "w-full h-full object-cover transition-opacity",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
            {poster.format !== "png" && (
              <Badge variant="secondary" className="absolute bottom-2 right-2 text-[10px]">
                {poster.format.toUpperCase()}
              </Badge>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <ImageIcon className="w-12 h-12 text-muted-foreground" />
            <span className="text-sm text-muted-foreground mt-2">
              {poster.format.toUpperCase()}
            </span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Eye className="w-8 h-8 text-white" />
        </div>

        {/* Theme badge */}
        <Badge
          variant="secondary"
          className="absolute top-2 left-2 text-[10px] capitalize"
        >
          {poster.theme.replace(/_/g, " ")}
        </Badge>
      </div>

      {/* Details */}
      <div className="p-2">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
          <span>{poster.distance / 1000}km</span>
          <span>•</span>
          <span>{poster.landscape ? "Land" : "Port"}</span>
          <span>•</span>
          {poster.fileSize != null && <span>{formatFileSize(poster.fileSize)}</span>}
        </div>

        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-2">
          <Clock className="w-2.5 h-2.5" />
          {poster.createdAt ? new Date(poster.createdAt).toLocaleDateString() : "—"}
        </div>

        {/* Actions */}
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-1.5 flex-1"
            onClick={onClone}
          >
            <Copy className="w-2.5 h-2.5 mr-0.5" />
            Clone
          </Button>
          <Button size="sm" variant="secondary" className="h-6 text-[10px] px-1.5 flex-1" asChild>
            <a href={poster.url} download={poster.filename}>
              <Download className="w-2.5 h-2.5 mr-0.5" />
              DL
            </a>
          </Button>
          <SaveToGoogleDrive
            fileUrl={poster.url}
            fileName={poster.filename}
            mimeType={poster.format === "pdf" ? "application/pdf" : poster.format === "svg" ? "image/svg+xml" : "image/png"}
            compact
            className="flex-1"
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-1 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
          >
            <Trash2 className="w-2.5 h-2.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function PosterTableRow({
  poster,
  onClone,
  onPreview,
  onDelete,
}: {
  poster: PosterInfo;
  onClone: () => void;
  onPreview: () => void;
  onDelete: () => void;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <tr className="border-b hover:bg-muted/50 transition-colors">
      <td className="p-3">
        <div
          className="w-12 h-16 rounded overflow-hidden bg-muted cursor-pointer"
          onClick={onPreview}
        >
          {poster.format === "png" ? (
            <img
              src={poster.url}
              alt={`${poster.city} poster`}
              className={cn(
                "w-full h-full object-cover transition-opacity",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
              onLoad={() => setImageLoaded(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
        </div>
      </td>
      <td className="p-3">
        <div className="font-medium">{poster.city}</div>
        <div className="text-sm text-muted-foreground">{poster.country}</div>
      </td>
      <td className="p-3">
        <Badge variant="outline" className="capitalize text-xs">
          {poster.theme.replace(/_/g, " ")}
        </Badge>
      </td>
      <td className="p-3 text-sm text-muted-foreground">
        {poster.distance / 1000}km
      </td>
      <td className="p-3 text-sm text-muted-foreground">
        {poster.landscape ? "Landscape" : "Portrait"}
      </td>
      <td className="p-3 text-sm text-muted-foreground">
        {poster.fileSize != null ? formatFileSize(poster.fileSize) : "—"}
      </td>
      <td className="p-3 text-sm text-muted-foreground">
        {poster.createdAt ? new Date(poster.createdAt).toLocaleDateString() : "—"}
      </td>
      <td className="p-3">
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onPreview}>
            <Eye className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onClone}>
            <Copy className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
            <a href={poster.url} download={poster.filename}>
              <Download className="w-4 h-4" />
            </a>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function LocationSection({
  city,
  country,
  posters,
  viewMode,
  activeTab,
  onClone,
  onPreview,
  onDelete,
}: {
  city: string;
  country: string;
  posters: PosterInfo[];
  viewMode: ViewMode;
  activeTab: "map" | "your-sky" | "all";
  onClone: (poster: PosterInfo) => void;
  onPreview: (poster: PosterInfo) => void;
  onDelete: (poster: PosterInfo) => void;
}) {
  return (
    <div className="mb-8">
      {/* Location Header */}
      <div className="flex items-center gap-3 mb-4">
        <MapPin className="w-5 h-5 text-primary" />
        <div>
          <h3 className="font-semibold text-lg">{city}</h3>
          <p className="text-sm text-muted-foreground">{country}</p>
        </div>
        <Badge variant="secondary" className="ml-auto">
          {posters.length} poster{posters.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {posters.filter(poster => activeTab === "all" || poster.type === activeTab).map((poster) => (
            <PosterGridCard
              key={poster.filename}
              poster={poster}
              onClone={() => onClone(poster)}
              onPreview={() => onPreview(poster)}
              onDelete={() => onDelete(poster)}
            />
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground"></th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground">Location</th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground">Theme</th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground">Distance</th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground">Orientation</th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground">Size</th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground">Created</th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posters.map((poster) => (
                <PosterTableRow
                  key={poster.filename}
                  poster={poster}
                  onClone={() => onClone(poster)}
                  onPreview={() => onPreview(poster)}
                  onDelete={() => onDelete(poster)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const JOB_STAGES = [
  { status: "queued", label: "Queued", Icon: Clock },
  { status: "fetching_data", label: "Location", Icon: MapPin },
  { status: "downloading_streets", label: "Streets", Icon: Route },
  { status: "downloading_parks", label: "Parks", Icon: Trees },
  { status: "downloading_water", label: "Water", Icon: Droplet },
  { status: "calculating_celestial", label: "Sky", Icon: Star },
  { status: "rendering", label: "Rendering", Icon: Palette },
  { status: "saving", label: "Saving", Icon: Save },
  { status: "completed", label: "Done", Icon: Check },
] as const;

function getStageIndex(status: string) {
  const i = JOB_STAGES.findIndex((s) => s.status === status);
  return i >= 0 ? i : 0;
}

function ActiveJobCard({ job, stream }: { job: PosterJob; stream: any }) {
  const [liveProgress, setLiveProgress] = useState<{
    status: string;
    progress: number;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!stream || !job.jobId) return;
    const sub = stream.subscribeGroup("posterProgress", job.jobId);
    sub.addChangeListener((data: any) => {
      if (data && data.length > 0 && data[0].status) {
        setLiveProgress({
          status: data[0].status,
          progress: data[0].progress,
          message: data[0].message,
        });
      }
    });
    return () => sub.close();
  }, [stream, job.jobId]);

  const status = liveProgress?.status || job.status;
  const progress = liveProgress?.progress ?? job.progress;
  const message = liveProgress?.message || job.message;
  const stageIdx = getStageIndex(status);
  const isCompleted = status === "completed";
  const isError = status === "error";

  return (
    <div
      className={cn(
        "rounded-lg border p-3 space-y-2 transition-all",
        isCompleted && "border-green-500/50 bg-green-500/5",
        isError && "border-destructive/50 bg-destructive/5"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium truncate">
          {job.city || "Poster"}
        </span>
        {isCompleted && (
          <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-600">
            Done
          </Badge>
        )}
        {isError && (
          <Badge variant="destructive" className="text-[10px]">
            Error
          </Badge>
        )}
      </div>

      {!isError && (
        <>
          <Progress
            value={progress}
            className={cn("h-1.5", isCompleted && "[&>div]:bg-green-500")}
          />
          <div className="flex items-center gap-1.5 flex-wrap">
            {JOB_STAGES.slice(0, isCompleted ? undefined : -1).map((stage, i) => {
              const isPast = i < stageIdx;
              const isCurrent = i === stageIdx && !isCompleted;
              const SIcon = stage.Icon;
              return (
                <div
                  key={stage.status}
                  className={cn(
                    "flex items-center justify-center w-5 h-5 rounded-full transition-all",
                    isPast && "bg-primary text-primary-foreground",
                    isCurrent && "bg-primary text-primary-foreground animate-pulse",
                    !isPast && !isCurrent && "bg-muted text-muted-foreground",
                    stage.status === "completed" && isCompleted && "bg-green-500 text-white"
                  )}
                  title={stage.label}
                >
                  {isCurrent ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  ) : (
                    <SIcon className="w-2.5 h-2.5" />
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground truncate">{message}</p>
        </>
      )}

      {isError && (
        <div className="flex items-center gap-1.5 text-[10px] text-destructive">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{job.error || "Failed"}</span>
        </div>
      )}
    </div>
  );
}

function ActiveJobsSidebar({
  jobs,
  stream,
}: {
  jobs: PosterJob[];
  stream: any;
}) {
  const now = Date.now();
  const FIVE_MIN = 5 * 60 * 1000;
  const THIRTY_SEC = 30 * 1000;

  const activeJobs = jobs.filter((j) => {
    const age = now - new Date(j.updatedAt).getTime();
    // Recently completed — show briefly then fade out
    if (j.status === "completed") return age < THIRTY_SEC;
    // Errors — show briefly
    if (j.status === "error") return age < THIRTY_SEC;
    // In-progress jobs — only if updated recently (not stale)
    return age < FIVE_MIN;
  });

  if (activeJobs.length === 0) return null;

  return (
    <div className="w-72 flex-shrink-0 space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Active Jobs ({activeJobs.length})
      </h3>
      {activeJobs.map((job) => (
        <ActiveJobCard key={job.jobId} job={job} stream={stream} />
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [posters, setPosters] = useState<PosterInfo[]>([]);
  const [jobs, setJobs] = useState<PosterJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode] = useState<ViewMode>("grid");
  const [previewPoster, setPreviewPoster] = useState<PosterInfo | null>(null);
  const [deletePoster, setDeletePoster] = useState<PosterInfo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<"map" | "your-sky" | "all">("all");
  const navigate = useNavigate();
  const { stream } = useMotiaStream();
  const { addToast, updateToast } = useToast();

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/posters/jobs");
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch {
      // Silently ignore job fetch errors
    }
  }, []);

  const fetchPosters = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/posters/list");
      if (!response.ok) {
        throw new Error("Failed to fetch posters");
      }

      const data = await response.json();
      setPosters(data.posters || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posters");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosters();
    fetchJobs();
    const postersInterval = setInterval(fetchPosters, 30000);
    const jobsInterval = setInterval(fetchJobs, 5000);
    return () => {
      clearInterval(postersInterval);
      clearInterval(jobsInterval);
    };
  }, [fetchJobs]);

  // Group posters by city + country
  const groupedPosters = posters.reduce(
    (groups: { city: string; country: string; posters: PosterInfo[] }[], poster) => {
      const key = `${poster.city}-${poster.country}`;
      const existing = groups.find((g) => `${g.city}-${g.country}` === key);
      if (existing) {
        existing.posters.push(poster);
      } else {
        groups.push({
          city: poster.city,
          country: poster.country,
          posters: [poster],
        });
      }
      return groups;
    },
    []
  );

  const handleClone = (poster: PosterInfo) => {
    const formData: Partial<PosterFormData> = {
      type: poster.type || "map",
      city: poster.city,
      country: poster.country,
      theme: poster.theme,
      distance: poster.distance,
      format: poster.format as "png" | "svg" | "pdf",
      landscape: poster.landscape,
      titleFont: poster.titleFont || "Roboto",
      subtitleFont: poster.subtitleFont || "Roboto",
      paperSize: poster.paperSize || "A4",
      rotation: poster.rotation || 0,
      border: poster.border ?? 0,
      lat: poster.lat,
      lon: poster.lon,
      widthCm: poster.widthCm,
      heightCm: poster.heightCm,
    };

    sessionStorage.setItem("clonePosterData", JSON.stringify(formData));
    navigate("/create");
  };

  const handleDelete = async () => {
    if (!deletePoster) return;

    const filename = deletePoster.filename;
    setIsDeleting(true);

    // Show loading toast
    const toastId = addToast(`Deleting ${deletePoster.city} poster...`, "loading");

    try {
      const response = await fetch(`/posters/delete/${filename}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to delete poster");
      }

      // Try to parse JSON response, but handle empty/invalid responses
      let requestId: string | null = null;
      const responseText = await response.text();
      if (responseText) {
        try {
          const data = JSON.parse(responseText);
          requestId = data.requestId;
        } catch {
          // Response wasn't JSON, that's okay
        }
      }

      // Subscribe to deletion progress if we have a requestId and stream
      if (requestId && stream) {
        const subscription = stream.subscribeGroup("deletionProgress", requestId);

        subscription.addChangeListener((updates: any) => {
          if (updates && updates.length > 0) {
            const update = updates[0];
            if (update.status === "completed") {
              updateToast(toastId, `Poster deleted successfully`, "success");
              setPosters((prev) => prev.filter((p) => p.filename !== filename));
              subscription.close();
            } else if (update.status === "failed") {
              updateToast(toastId, update.error || "Failed to delete poster", "error");
              subscription.close();
            }
          }
        });

        // Timeout fallback - remove from UI after 5 seconds anyway
        setTimeout(() => {
          updateToast(toastId, `Poster deleted successfully`, "success");
          setPosters((prev) => prev.filter((p) => p.filename !== filename));
          subscription.close();
        }, 5000);
      } else {
        // Fallback if no stream - just remove immediately
        updateToast(toastId, `Poster deleted successfully`, "success");
        setPosters((prev) => prev.filter((p) => p.filename !== filename));
      }

      setDeletePoster(null);
    } catch (err) {
      updateToast(toastId, err instanceof Error ? err.message : "Failed to delete poster", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
        <PageHeader>
          <div className="flex items-center justify-between">
            <div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight">Poster Gallery</h3>
                <p className="text-muted-foreground">
                  Your collection of generated map and sky posters
                </p>
              </div>
            </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchPosters}
            disabled={loading}
          >
            <RefreshCw
              className={cn("w-4 h-4 mr-2", loading && "animate-spin")}
            />
            Refresh
          </Button>
          <Button size="sm" asChild>
            <a href="/create">
              <PenTool className="w-4 h-4 mr-2" />
              Create New
            </a>
          </Button>
        </div>
      </PageHeader>

      {/* Type filter tabs */}
      <div className="flex gap-2 mb-4">
        {(["all", "map", "your-sky"] as const).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab)}
          >
            {tab === "all" ? "All" : tab === "map" ? "Maps" : "Your Sky"}
          </Button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Gallery Content */}
        <div className="flex-1 min-w-0">
          {error && (
            <Card className="mb-6 border-destructive/50 bg-destructive/5">
              <CardContent className="pt-6">
                <p className="text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {[...Array(8)].map((_, i) => (
                <PosterGridSkeleton key={i} />
              ))}
            </div>
          ) : groupedPosters.length === 0 ? (
            <Card className="py-16">
              <CardContent className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                  <ImageIcon className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No posters yet</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                  Create your first map poster by selecting a location and
                  customizing the style.
                </p>
                <Button asChild>
                  <a href="/create">
                    <PenTool className="w-4 h-4 mr-2" />
                    Create Your First Poster
                  </a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            groupedPosters.map((group) => (
              <LocationSection
                key={`${group.city}-${group.country}`}
                city={group.city}
                country={group.country}
                posters={group.posters}
                viewMode={viewMode}
                activeTab={activeTab}
                onClone={handleClone}
                onPreview={setPreviewPoster}
                onDelete={setDeletePoster}
              />
            ))
          )}
        </div>

        {/* Active Jobs Sidebar */}
        <ActiveJobsSidebar jobs={jobs} stream={stream} />
      </div>

      {/* Preview Modal */}
      {previewPoster && (
        <PreviewModal
          poster={previewPoster}
          onClose={() => setPreviewPoster(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletePoster && (
        <DeleteConfirmModal
          poster={deletePoster}
          onConfirm={handleDelete}
          onCancel={() => setDeletePoster(null)}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
}
