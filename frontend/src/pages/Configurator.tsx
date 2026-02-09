import { useState, useEffect, useCallback } from "react";
import { useMotiaStream } from "@motiadev/stream-client-react";
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Loader2, Sparkles, AlertCircle, Copy, WifiOff, Send } from "lucide-react";
import {
  StepIndicator,
  LocationStep,
  ThemeStep,
  DimensionsStep,
  ProgressView,
  PosterPreview,
  PosterTypeSelector,
  NightSkyStep,
  type PosterFormData,
  type ProgressUpdate,
  type LocationMode,
  PAPER_SIZES,
} from "@/components/configurator";

const QUEUED_SUBMISSIONS_KEY = "queuedPosterSubmissions";

interface QueuedSubmission {
  payload: PosterFormData;
  queuedAt: string;
}

function getQueuedSubmissions(): QueuedSubmission[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUED_SUBMISSIONS_KEY) || "[]");
  } catch {
    return [];
  }
}

function addQueuedSubmission(payload: PosterFormData): void {
  const queued = getQueuedSubmissions();
  queued.push({ payload, queuedAt: new Date().toISOString() });
  localStorage.setItem(QUEUED_SUBMISSIONS_KEY, JSON.stringify(queued));
}

function removeQueuedSubmission(index: number): void {
  const queued = getQueuedSubmissions();
  queued.splice(index, 1);
  localStorage.setItem(QUEUED_SUBMISSIONS_KEY, JSON.stringify(queued));
}

function clearQueuedSubmissions(): void {
  localStorage.removeItem(QUEUED_SUBMISSIONS_KEY);
}

const INITIAL_FORM_DATA: PosterFormData = {
  type: "map",
  city: "",
  country: "",
  theme: "feature_based",
  distance: 10000,
  format: "png",
  landscape: false,
  border: 0,
  titleFont: "Roboto",
  subtitleFont: "Roboto",
  paperSize: "A4",
  rotation: 0,
};

export default function Configurator() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<PosterFormData>(INITIAL_FORM_DATA);
  const [locationMode, setLocationMode] = useState<LocationMode>("city");
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCloned, setIsCloned] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const { stream } = useMotiaStream();

  // Load cloned poster data from sessionStorage on mount
  useEffect(() => {
    const clonedData = sessionStorage.getItem("clonePosterData");
    if (clonedData) {
      try {
        const parsed = JSON.parse(clonedData) as Partial<PosterFormData>;
        setFormData((prev) => ({ ...prev, ...parsed }));
        setIsCloned(true);
        if (parsed.lat != null && parsed.lon != null) {
          setLocationMode("coords");
        }
        sessionStorage.removeItem("clonePosterData");
      } catch (e) {
        console.error("Failed to parse cloned poster data:", e);
      }
    }
    setQueuedCount(getQueuedSubmissions().length);
  }, []);

  // Subscribe to stream updates when jobId is set
  useEffect(() => {
    if (!jobId || !stream) return;

    setWsConnected(true);

    const subscription = stream.subscribeGroup("posterProgress", jobId);

    subscription.addChangeListener((data: any) => {
      if (data && data.length > 0 && data[0].status) {
        setProgress(data[0]);
      }
    });

    subscription.onClose(() => {
      setWsConnected(false);
    });

    return () => {
      subscription.close();
    };
  }, [jobId, stream]);

  const buildPayload = useCallback((): PosterFormData => {
    let widthCm = formData.widthCm;
    let heightCm = formData.heightCm;

    if (formData.paperSize !== "custom") {
      const paper = PAPER_SIZES.find((p) => p.id === formData.paperSize);
      if (paper) {
        if (formData.landscape) {
          widthCm = paper.height;
          heightCm = paper.width;
        } else {
          widthCm = paper.width;
          heightCm = paper.height;
        }
      }
    }

    return {
      ...formData,
      widthCm,
      heightCm,
      lat: locationMode === "coords" ? formData.lat : undefined,
      lon: locationMode === "coords" ? formData.lon : undefined,
      googleMapsUrl: locationMode === "google" ? formData.googleMapsUrl : undefined,
    };
  }, [formData, locationMode]);

  const submitPayload = async (payload: PosterFormData): Promise<string> => {
    const response = await fetch("/posters/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create poster");
    }

    const data = await response.json();
    return data.jobId;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    const payload = buildPayload();

    try {
      const id = await submitPayload(payload);
      setJobId(id);
    } catch (err) {
      const isNetworkError =
        err instanceof TypeError && err.message.includes("fetch");

      if (isNetworkError) {
        // Backend is down — save to localStorage for retry
        addQueuedSubmission(payload);
        setQueuedCount(getQueuedSubmissions().length);
        setError("Backend is offline. Your poster has been saved and will be submitted when the server comes back.");
      } else {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryQueued = async () => {
    setIsRetrying(true);
    setError(null);

    const queued = getQueuedSubmissions();
    let successCount = 0;
    let lastJobId: string | null = null;

    for (let i = queued.length - 1; i >= 0; i--) {
      try {
        lastJobId = await submitPayload(queued[i].payload);
        removeQueuedSubmission(i);
        successCount++;
      } catch {
        // Still offline — stop retrying
        setError("Backend still offline. Will keep your submissions queued.");
        break;
      }
    }

    setQueuedCount(getQueuedSubmissions().length);
    setIsRetrying(false);

    if (successCount > 0 && lastJobId) {
      setJobId(lastJobId);
    }
  };

  const handleClearQueued = () => {
    clearQueuedSubmissions();
    setQueuedCount(0);
  };

  const updateFormData = (key: keyof PosterFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };
  
  const updateNightSkyFormData = (updates: Partial<Omit<PosterFormData, "type"> & { type: "night-sky" }>) => {
    setFormData((prev) => ({ ...prev, ...updates } as PosterFormData));
  };

  const canProceed = () => {
    if (currentStep === 0) {
      if (locationMode === "google") return !!(formData.googleMapsUrl && formData.city && formData.country);
      if (locationMode === "coords") return formData.lat !== undefined && formData.lon !== undefined && !!formData.city && !!formData.country;
      return !!(formData.city && formData.country);
    }
    return true;
  };

  const resetForm = () => {
    setJobId(null);
    setProgress(null);
    setError(null);
    setCurrentStep(0);
    setFormData(INITIAL_FORM_DATA);
    setLocationMode("city");
    setIsCloned(false);
  };

  // Show progress view when job is running
  if (jobId) {
    return (
      <>
        <PageHeader>
          <PageHeaderHeading>Creating Your Poster</PageHeaderHeading>
          <PageHeaderDescription>
            Please wait while we generate your map poster
          </PageHeaderDescription>
        </PageHeader>
        <ProgressView
          jobId={jobId}
          progress={progress}
          wsConnected={wsConnected}
          onReset={resetForm}
        />
      </>
    );
  }

  const stepDescriptions = [
    "Choose your poster type",
    "Choose where you want to capture",
    "Pick a visual style for your poster",
    "Set output format and size",
  ];

  return (
    <>
      <PageHeader>
        <div className="flex items-center gap-3">
          <PageHeaderHeading>
            {isCloned ? "Clone Poster" : "Create a Poster"}
          </PageHeaderHeading>
          {isCloned && (
            <Badge variant="secondary" className="gap-1">
              <Copy className="w-3 h-3" />
              From {formData.city}
            </Badge>
          )}
        </div>
        <PageHeaderDescription>
          {isCloned
            ? "Modify the settings to create a new version"
            : "Design beautiful map posters in three simple steps"}
        </PageHeaderDescription>
      </PageHeader>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {queuedCount > 0 && (
        <Alert className="mb-6 border-amber-500/50 bg-amber-500/5">
          <WifiOff className="h-4 w-4 text-amber-600" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {queuedCount} poster{queuedCount !== 1 ? "s" : ""} queued offline
            </span>
            <div className="flex gap-2 ml-4">
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1"
                onClick={handleRetryQueued}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Send className="w-3 h-3" />
                )}
                Retry
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-muted-foreground"
                onClick={handleClearQueued}
              >
                Discard
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <StepIndicator currentStep={currentStep} />

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Poster Type Selection */}
         <div className="lg:col-span-1">
           <PosterTypeSelector
             value={formData.type}
             onChange={(type) => updateFormData("type", type)}
           />
         </div>
         
         {/* Form Panel */}
         <div className="lg:col-span-2">
           <Card>
             <CardHeader>
               <CardTitle>{["Poster Type", "Location", "Style", "Output"][currentStep]}</CardTitle>
               <CardDescription>{stepDescriptions[currentStep]}</CardDescription>
             </CardHeader>

            <CardContent className="min-h-[300px]">
              {currentStep === 0 && (
                <PosterTypeSelector
                  value={formData.type}
                  onChange={(type) => {
                    updateFormData("type", type);
                    // Reset to first step when changing poster type
                    setCurrentStep(0);
                  }}
                />
              )}
              
              {currentStep === 1 && (
                <LocationStep
                  formData={formData}
                  updateFormData={updateFormData}
                  locationMode={locationMode}
                  setLocationMode={setLocationMode}
                />
              )}
              
              {currentStep === 2 && formData.type === "map" && (
                <ThemeStep formData={formData} updateFormData={updateFormData} />
              )}
              
              {currentStep === 2 && formData.type === "night-sky" && (
                <NightSkyStep
                  value={formData as any}
                  onChange={updateNightSkyFormData}
                />
              )}
              
              {currentStep === 3 && (
                <DimensionsStep formData={formData} updateFormData={updateFormData} />
              )}
            </CardContent>

            <CardFooter className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                disabled={currentStep === 0}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>

              {currentStep < 2 ? (
                <Button
                  onClick={() => setCurrentStep((prev) => prev + 1)}
                  disabled={!canProceed()}
                  className="gap-2"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !canProceed()}
                  className="gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {isCloned ? "Create Version" : "Create Poster"}
                    </>
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardContent className="pt-6">
              <PosterPreview formData={formData} locationMode={locationMode} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
