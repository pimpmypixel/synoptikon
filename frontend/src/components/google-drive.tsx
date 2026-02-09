import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// Google OAuth Client ID — set via VITE_GOOGLE_CLIENT_ID env var
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const SCOPES = "https://www.googleapis.com/auth/drive.file";

// Dynamically load the GIS script
function useGoogleIdentityServices() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;

    if (
      document.querySelector(
        'script[src*="accounts.google.com/gsi/client"]'
      )
    ) {
      setLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, []);

  return loaded;
}

interface SaveToGoogleDriveProps {
  /** URL of the file to upload */
  fileUrl: string;
  /** Filename to use in Google Drive */
  fileName: string;
  /** MIME type */
  mimeType?: string;
  /** Button variant */
  variant?: "default" | "outline" | "secondary" | "ghost";
  /** Additional class names */
  className?: string;
  /** Compact mode */
  compact?: boolean;
}

type UploadStatus = "idle" | "authorizing" | "uploading" | "done" | "error";

export function SaveToGoogleDrive({
  fileUrl,
  fileName,
  mimeType = "image/png",
  variant = "outline",
  className,
  compact = false,
}: SaveToGoogleDriveProps) {
  const gisLoaded = useGoogleIdentityServices();
  const [status, setStatus] = useState<UploadStatus>("idle");
  const tokenClientRef = useRef<any>(null);

  const uploadToGoogleDrive = useCallback(
    async (accessToken: string) => {
      setStatus("uploading");
      try {
        const response = await fetch(fileUrl);
        const blob = await response.blob();

        const metadata = { name: fileName, mimeType };
        const form = new FormData();
        form.append(
          "metadata",
          new Blob([JSON.stringify(metadata)], { type: "application/json" })
        );
        form.append("file", blob);

        const uploadRes = await fetch(
          "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}` },
            body: form,
          }
        );

        if (!uploadRes.ok) {
          throw new Error(`Upload failed (${uploadRes.status})`);
        }

        setStatus("done");
        setTimeout(() => setStatus("idle"), 3000);
      } catch {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 3000);
      }
    },
    [fileUrl, fileName, mimeType]
  );

  const handleClick = useCallback(() => {
    setStatus("authorizing");

    if (!tokenClientRef.current) {
      tokenClientRef.current = (
        window as any
      ).google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse: any) => {
          if (tokenResponse.error) {
            setStatus("error");
            setTimeout(() => setStatus("idle"), 3000);
            return;
          }
          uploadToGoogleDrive(tokenResponse.access_token);
        },
        error_callback: () => {
          setStatus("idle");
        },
      });
    }

    tokenClientRef.current.requestAccessToken({ prompt: "" });
  }, [uploadToGoogleDrive]);

  // Don't render if no client ID configured
  if (!CLIENT_ID || !gisLoaded) return null;

  const label = {
    idle: compact ? "Drive" : "Save to Drive",
    authorizing: "Auth...",
    uploading: "Saving...",
    done: "Saved!",
    error: "Failed",
  }[status];

  return (
    <Button
      variant={variant}
      size="sm"
      className={cn(
        compact && "h-6 text-[10px] px-1.5",
        status === "done" && "text-green-600",
        status === "error" && "text-destructive",
        className
      )}
      onClick={handleClick}
      disabled={status === "authorizing" || status === "uploading"}
    >
      {(status === "authorizing" || status === "uploading") && (
        <Loader2 className={cn("animate-spin mr-1", compact ? "w-2.5 h-2.5" : "w-4 h-4")} />
      )}
      {!compact && status === "idle" && (
        <DriveIcon className="w-4 h-4 mr-1" />
      )}
      {label}
    </Button>
  );
}

function DriveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.71 3.5L1.15 15l4.29 7.5h13.12l4.29-7.5L16.29 3.5H7.71zm-.71 1h2.82l6.14 10.7H7.86L4.57 8.9 7 4.5zm3.54 0h4.92l6.14 10.7h-4.92L10.54 4.5zM4.05 9.5l2.97 5.2L4.29 21H2.15l1.9-3.3L4.05 9.5z" />
    </svg>
  );
}

export function isGoogleDriveEnabled(): boolean {
  return !!CLIENT_ID;
}
