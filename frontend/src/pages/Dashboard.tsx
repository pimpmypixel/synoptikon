import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Download,
  Image as ImageIcon,
  RefreshCw,
  MapPin,
  Palette,
  PenTool,
  Clock,
  Copy,
  Type,
  LayoutGrid,
  List,
  Eye,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";
import type { PosterFormData } from "@/components/configurator";

interface PosterInfo {
  filename: string;
  city: string;
  country: string;
  theme: string;
  format: string;
  distance: number;
  landscape: boolean;
  titleFont?: string;
  subtitleFont?: string;
  createdAt: string;
  fileSize: number;
  url: string;
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
        {poster.format === "png" ? (
          <>
            {!imageLoaded && !imageError && (
              <Skeleton className="absolute inset-0" />
            )}
            <img
              src={poster.url}
              alt={`${poster.city} poster`}
              className={cn(
                "w-full h-full object-cover transition-opacity",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
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
      <div className="p-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <span>{poster.distance / 1000}km</span>
          <span>•</span>
          <span>{poster.landscape ? "Landscape" : "Portrait"}</span>
          <span>•</span>
          <span>{formatFileSize(poster.fileSize)}</span>
        </div>

        {(poster.titleFont || poster.subtitleFont) && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Type className="w-3 h-3" />
            <span className="truncate">
              {poster.titleFont}
              {poster.titleFont && poster.subtitleFont && " / "}
              {poster.subtitleFont}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-3">
          <Clock className="w-3 h-3" />
          {new Date(poster.createdAt).toLocaleDateString()}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs flex-1"
            onClick={onPreview}
          >
            <Eye className="w-3 h-3 mr-1" />
            Preview
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs flex-1"
            onClick={onClone}
          >
            <Copy className="w-3 h-3 mr-1" />
            Clone
          </Button>
        </div>
        <div className="flex gap-2 mt-2">
          <Button size="sm" variant="secondary" className="h-7 text-xs flex-1" asChild>
            <a href={poster.url} download={poster.filename}>
              <Download className="w-3 h-3 mr-1" />
              Download
            </a>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
          >
            <Trash2 className="w-3 h-3" />
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
        {formatFileSize(poster.fileSize)}
      </td>
      <td className="p-3 text-sm text-muted-foreground">
        {new Date(poster.createdAt).toLocaleDateString()}
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
  onClone,
  onPreview,
  onDelete,
}: {
  city: string;
  country: string;
  posters: PosterInfo[];
  viewMode: ViewMode;
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {posters.map((poster) => (
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

export default function Dashboard() {
  const navigate = useNavigate();
  const [posters, setPosters] = useState<PosterInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [previewPoster, setPreviewPoster] = useState<PosterInfo | null>(null);
  const [deletePoster, setDeletePoster] = useState<PosterInfo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
    const interval = setInterval(fetchPosters, 30000);
    return () => clearInterval(interval);
  }, []);

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
      city: poster.city,
      country: poster.country,
      theme: poster.theme,
      distance: poster.distance,
      format: poster.format as "png" | "svg" | "pdf",
      landscape: poster.landscape,
      titleFont: poster.titleFont,
      subtitleFont: poster.subtitleFont,
    };

    sessionStorage.setItem("clonePosterData", JSON.stringify(formData));
    navigate("/create");
  };

  const handleDelete = async () => {
    if (!deletePoster) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/posters/delete/${deletePoster.filename}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete poster");
      }

      // Remove from local state
      setPosters((prev) => prev.filter((p) => p.filename !== deletePoster.filename));
      setDeletePoster(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete poster");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <PageHeader>
        <PageHeaderHeading>Gallery</PageHeaderHeading>
        <PageHeaderDescription>
          Your collection of generated map posters
        </PageHeaderDescription>
      </PageHeader>

      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-muted-foreground">
          {loading ? (
            "Loading..."
          ) : (
            <>
              {posters.length} poster{posters.length !== 1 ? "s" : ""} in{" "}
              {groupedPosters.length} location
              {groupedPosters.length !== 1 ? "s" : ""}
            </>
          )}
        </p>
        <div className="flex gap-2">
          {/* View Toggle */}
          <div className="flex border rounded-lg p-1">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setViewMode("table")}
            >
              <List className="w-4 h-4" />
            </Button>
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
      </div>

      {error && (
        <Card className="mb-6 border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
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
            onClone={handleClone}
            onPreview={setPreviewPoster}
            onDelete={setDeletePoster}
          />
        ))
      )}

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
