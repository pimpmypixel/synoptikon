import { useState, useEffect } from "react";
import { useMotiaStream } from "@motiadev/stream-client-react";
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Loader2, Sparkles, AlertCircle, Copy } from "lucide-react";
import {
  StepIndicator,
  LocationStep,
  ThemeStep,
  DimensionsStep,
  ProgressView,
  PosterPreview,
  type PosterFormData,
  type ProgressUpdate,
  type LocationMode,
} from "@/components/configurator";

const INITIAL_FORM_DATA: PosterFormData = {
  city: "",
  country: "",
  theme: "feature_based",
  distance: 10000,
  format: "png",
  landscape: false,
  border: 5,
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

  const { stream } = useMotiaStream();

  // Load cloned poster data from sessionStorage on mount
  useEffect(() => {
    const clonedData = sessionStorage.getItem("clonePosterData");
    if (clonedData) {
      try {
        const parsed = JSON.parse(clonedData) as Partial<PosterFormData>;
        setFormData((prev) => ({ ...prev, ...parsed }));
        setIsCloned(true);
        sessionStorage.removeItem("clonePosterData");
      } catch (e) {
        console.error("Failed to parse cloned poster data:", e);
      }
    }
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

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const payload: PosterFormData = {
        ...formData,
        lat: locationMode === "coords" ? formData.lat : undefined,
        lon: locationMode === "coords" ? formData.lon : undefined,
        googleMapsUrl: locationMode === "google" ? formData.googleMapsUrl : undefined,
      };

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
      setJobId(data.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormData = (key: keyof PosterFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
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
    "Choose where you want to capture",
    "Pick a visual style for your poster",
    "Set the output format and size",
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

      <StepIndicator currentStep={currentStep} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Panel */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{["Location", "Style", "Output"][currentStep]}</CardTitle>
              <CardDescription>{stepDescriptions[currentStep]}</CardDescription>
            </CardHeader>

            <CardContent className="min-h-[300px]">
              {currentStep === 0 && (
                <LocationStep
                  formData={formData}
                  updateFormData={updateFormData}
                  locationMode={locationMode}
                  setLocationMode={setLocationMode}
                />
              )}

              {currentStep === 1 && (
                <ThemeStep formData={formData} updateFormData={updateFormData} />
              )}

              {currentStep === 2 && (
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
          <Card className="h-full">
            <CardContent className="pt-6 h-full">
              <PosterPreview formData={formData} locationMode={locationMode} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
