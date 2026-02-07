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
  ChevronDown,
  ChevronRight,
  Type,
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

interface PosterGroup {
  city: string;
  country: string;
  posters: PosterInfo[];
}

function PosterSkeleton() {
  return (
    <div className="flex gap-3 p-3 rounded-lg border bg-card">
      <Skeleton className="w-20 h-28 rounded-md flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function PosterThumbnail({ poster, onClone }: { poster: PosterInfo; onClone: () => void }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group">
      {/* Thumbnail */}
      <div className="w-20 h-28 rounded-md overflow-hidden bg-muted flex-shrink-0 relative">
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
            <ImageIcon className="w-6 h-6 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground mt-1">
              {poster.format.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm">
              <Palette className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="truncate capitalize">{poster.theme.replace(/_/g, " ")}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
              <span>{poster.distance / 1000}km</span>
              <span>•</span>
              <span>{poster.landscape ? "Landscape" : "Portrait"}</span>
              <span>•</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {poster.format.toUpperCase()}
              </Badge>
              <span>•</span>
              <span>{formatFileSize(poster.fileSize)}</span>
            </div>
            {(poster.titleFont || poster.subtitleFont) && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                <Type className="w-3 h-3" />
                {poster.titleFont && <span>{poster.titleFont}</span>}
                {poster.titleFont && poster.subtitleFont && <span>/</span>}
                {poster.subtitleFont && <span>{poster.subtitleFont}</span>}
              </div>
            )}
            <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              {new Date(poster.createdAt).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={onClone}
          >
            <Copy className="w-3 h-3" />
            Clone
          </Button>
          <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" asChild>
            <a href={poster.url} download={poster.filename}>
              <Download className="w-3 h-3" />
              Download
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

function LocationGroup({
  group,
  onClone,
  defaultExpanded = true,
}: {
  group: PosterGroup;
  onClone: (poster: PosterInfo) => void;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Group Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-primary" />
          <div className="text-left">
            <h3 className="font-semibold text-lg">{group.city}</h3>
            <p className="text-sm text-muted-foreground">{group.country}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">
            {group.posters.length} version{group.posters.length !== 1 ? "s" : ""}
          </Badge>
          {expanded ? (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Poster List */}
      {expanded && (
        <div className="p-3 space-y-2 bg-background">
          {group.posters.map((poster) => (
            <PosterThumbnail
              key={poster.filename}
              poster={poster}
              onClone={() => onClone(poster)}
            />
          ))}
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
    // Refresh every 30 seconds
    const interval = setInterval(fetchPosters, 30000);
    return () => clearInterval(interval);
  }, []);

  // Group posters by city + country
  const groupedPosters: PosterGroup[] = posters.reduce(
    (groups: PosterGroup[], poster) => {
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
    // Create form data from poster config and navigate to create page
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

    // Store in sessionStorage for the create page to pick up
    sessionStorage.setItem("clonePosterData", JSON.stringify(formData));
    navigate("/create");
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
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-5 h-5 rounded" />
                <div>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24 mt-1" />
                </div>
              </div>
              <div className="space-y-2">
                <PosterSkeleton />
                <PosterSkeleton />
              </div>
            </div>
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
        <div className="space-y-4">
          {groupedPosters.map((group, index) => (
            <LocationGroup
              key={`${group.city}-${group.country}`}
              group={group}
              onClone={handleClone}
              defaultExpanded={index < 3}
            />
          ))}
        </div>
      )}
    </>
  );
}
