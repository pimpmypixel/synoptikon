import { useState, useEffect } from "react";
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  RefreshCw,
  Clock,
  MapPin,
  Route,
  Trees,
  Droplet,
  Palette,
  Save,
  Check,
  AlertCircle,
  Download,
  FileIcon,
  Loader2,
} from "lucide-react";
import type { PosterJob } from "@/components/configurator";

const STAGES = [
  { status: "queued", label: "Queued", Icon: Clock },
  { status: "fetching_data", label: "Location", Icon: MapPin },
  { status: "downloading_streets", label: "Streets", Icon: Route },
  { status: "downloading_parks", label: "Parks", Icon: Trees },
  { status: "downloading_water", label: "Water", Icon: Droplet },
  { status: "rendering", label: "Rendering", Icon: Palette },
  { status: "saving", label: "Saving", Icon: Save },
  { status: "completed", label: "Done", Icon: Check },
] as const;

function getStageIndex(status: string) {
  const i = STAGES.findIndex((s) => s.status === status);
  return i >= 0 ? i : 0;
}

function statusBadge(status: string) {
  if (status === "completed")
    return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Completed</Badge>;
  if (status === "error")
    return <Badge variant="destructive">Error</Badge>;
  return <Badge variant="secondary" className="gap-1">
    <Loader2 className="w-3 h-3 animate-spin" />
    In Progress
  </Badge>;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function JobRow({ job }: { job: PosterJob }) {
  const stageIdx = getStageIndex(job.status);
  const isCompleted = job.status === "completed";
  const isError = job.status === "error";

  const posterUrl = job.outputFile
    ? `/posters-files/${job.outputFile.split("/").pop()}`
    : null;

  return (
    <div
      className={cn(
        "border rounded-lg p-4 space-y-3 transition-colors",
        isCompleted && "border-green-500/20",
        isError && "border-destructive/20 bg-destructive/5"
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <h3 className="font-medium text-sm">
              {job.city || "Unknown"}{job.country ? `, ${job.country}` : ""}
            </h3>
            <p className="text-xs text-muted-foreground">
              {job.theme.replace(/_/g, " ")} &middot; {job.format.toUpperCase()} &middot; {job.distance / 1000}km
              {job.landscape ? " &middot; Landscape" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {statusBadge(job.status)}
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDate(job.createdAt)}
          </span>
        </div>
      </div>

      {/* Stage indicators */}
      {!isError && (
        <div className="flex items-center gap-1">
          {STAGES.map((stage, i) => {
            const isPast = i < stageIdx;
            const isCurrent = i === stageIdx && !isCompleted;
            const SIcon = stage.Icon;
            return (
              <div
                key={stage.status}
                className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full transition-all",
                  isPast && "bg-primary text-primary-foreground",
                  isCurrent && "bg-primary text-primary-foreground animate-pulse",
                  !isPast && !isCurrent && "bg-muted text-muted-foreground",
                  stage.status === "completed" && isCompleted && "bg-green-500 text-white"
                )}
                title={stage.label}
              >
                {isCurrent ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <SIcon className="w-3 h-3" />
                )}
              </div>
            );
          })}
          <span className="text-xs text-muted-foreground ml-2">{job.message}</span>
        </div>
      )}

      {/* Error message */}
      {isError && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{job.error || "An error occurred"}</span>
        </div>
      )}

      {/* Output file */}
      {isCompleted && posterUrl && (
        <div className="flex items-center gap-2 pt-1">
          <FileIcon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground truncate">
            {job.outputFile?.split("/").pop()}
          </span>
          <Button size="sm" variant="outline" className="h-6 text-xs px-2 ml-auto" asChild>
            <a href={posterUrl} download>
              <Download className="w-3 h-3 mr-1" />
              Download
            </a>
          </Button>
        </div>
      )}

      {/* Job ID */}
      <div className="text-[10px] text-muted-foreground/50">
        ID: {job.jobId}
      </div>
    </div>
  );
}

export default function Jobs() {
  const [jobs, setJobs] = useState<PosterJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/posters/jobs");
      if (!res.ok) throw new Error("Failed to fetch jobs");
      const data = await res.json();
      setJobs(data.jobs || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 10000);
    return () => clearInterval(interval);
  }, []);

  const completedJobs = jobs.filter((j) => j.status === "completed");
  const errorJobs = jobs.filter((j) => j.status === "error");
  const activeJobs = jobs.filter(
    (j) => j.status !== "completed" && j.status !== "error"
  );

  return (
    <>
      <PageHeader>
        <PageHeaderHeading>Job History</PageHeaderHeading>
        <PageHeaderDescription>
          All poster generation jobs and their status
        </PageHeaderDescription>
      </PageHeader>

      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-3 text-sm text-muted-foreground">
          <span>{jobs.length} total</span>
          {activeJobs.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              {activeJobs.length} active
            </Badge>
          )}
          {completedJobs.length > 0 && (
            <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
              {completedJobs.length} completed
            </Badge>
          )}
          {errorJobs.length > 0 && (
            <Badge variant="destructive">
              {errorJobs.length} failed
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchJobs}
          disabled={loading}
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="mb-6 border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading && jobs.length === 0 ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <Card className="py-16">
          <CardContent className="flex flex-col items-center text-center">
            <p className="text-muted-foreground">No jobs yet. Create a poster to see jobs here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobRow key={job.jobId} job={job} />
          ))}
        </div>
      )}
    </>
  );
}
