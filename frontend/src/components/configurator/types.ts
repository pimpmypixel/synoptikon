export interface PosterFormData {
  city: string;
  country: string;
  lat?: number;
  lon?: number;
  googleMapsUrl?: string;
  theme: string;
  distance: number;
  border?: number;
  format: "png" | "svg" | "pdf";
  landscape: boolean;
  titleFont?: string;
  subtitleFont?: string;
  paperSize: string;
  widthCm?: number;
  heightCm?: number;
  rotation?: number; // 0-360 degrees
}

// Standard paper sizes in cm (portrait orientation)
export const PAPER_SIZES = [
  { id: "A4", label: "A4", width: 21, height: 29.7, description: "Standard print" },
  { id: "A3", label: "A3", width: 29.7, height: 42, description: "Medium poster" },
  { id: "A2", label: "A2", width: 42, height: 59.4, description: "Large poster" },
  { id: "A1", label: "A1", width: 59.4, height: 84.1, description: "Exhibition size" },
  { id: "A0", label: "A0", width: 84.1, height: 118.9, description: "Billboard size" },
  { id: "Letter", label: "Letter", width: 21.6, height: 27.9, description: "US standard" },
  { id: "Legal", label: "Legal", width: 21.6, height: 35.6, description: "US legal" },
  { id: "Tabloid", label: "Tabloid", width: 27.9, height: 43.2, description: "US tabloid" },
  { id: "30x40", label: "30×40", width: 30, height: 40, description: "Photo print" },
  { id: "50x70", label: "50×70", width: 50, height: 70, description: "Standard frame" },
  { id: "60x90", label: "60×90", width: 60, height: 90, description: "Large frame" },
  { id: "custom", label: "Custom", width: 0, height: 0, description: "Set your own" },
] as const;

export interface ProgressUpdate {
  status: string;
  message: string;
  progress: number;
  jobId: string;
  outputFile?: string;
  error?: string;
  timestamp: string;
}

export interface PosterJob {
  jobId: string;
  city: string;
  country: string;
  theme: string;
  format: string;
  distance: number;
  landscape: boolean;
  titleFont?: string;
  subtitleFont?: string;
  status: string;
  progress: number;
  message: string;
  outputFile: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export type LocationMode = "city" | "coords" | "google";

export const THEMES = [
  { value: "feature_based", label: "Feature Based", description: "Modern style with color-coded features" },
  { value: "noir", label: "Noir", description: "Dark and dramatic" },
  { value: "warm_beige", label: "Warm Beige", description: "Soft and elegant" },
  { value: "blueprint", label: "Blueprint", description: "Technical blueprint style" },
  { value: "ocean", label: "Ocean", description: "Cool ocean tones" },
  { value: "midnight_blue", label: "Midnight Blue", description: "Deep blue night theme" },
  { value: "pastel_dream", label: "Pastel Dream", description: "Soft pastel colors" },
  { value: "japanese_ink", label: "Japanese Ink", description: "Minimalist ink wash" },
  { value: "terracotta", label: "Terracotta", description: "Warm earth tones" },
  { value: "sunset", label: "Sunset", description: "Warm sunset gradients" },
  { value: "contrast_zones", label: "Contrast Zones", description: "High contrast zones" },
  { value: "copper_patina", label: "Copper Patina", description: "Aged copper aesthetics" },
] as const;

export const DISTANCE_OPTIONS = [
  { value: 4000, label: "4km", description: "Neighborhood view" },
  { value: 6000, label: "6km", description: "Small area" },
  { value: 8000, label: "8km", description: "City center" },
  { value: 10000, label: "10km", description: "Medium city" },
  { value: 12000, label: "12km", description: "Large area" },
  { value: 15000, label: "15km", description: "Metro area" },
  { value: 20000, label: "20km", description: "Full metro" },
  { value: 29000, label: "29km", description: "Wide view" },
] as const;

// Top 10 Google Fonts with style variants
export const GOOGLE_FONTS = [
  {
    family: "Roboto",
    category: "sans-serif",
    variants: ["Light", "Regular", "Medium", "Bold"],
    preview: "Clean & Modern"
  },
  {
    family: "Open Sans",
    category: "sans-serif",
    variants: ["Light", "Regular", "SemiBold", "Bold"],
    preview: "Friendly & Readable"
  },
  {
    family: "Montserrat",
    category: "sans-serif",
    variants: ["Light", "Regular", "SemiBold", "Bold"],
    preview: "Geometric & Elegant"
  },
  {
    family: "Playfair Display",
    category: "serif",
    variants: ["Regular", "Medium", "SemiBold", "Bold"],
    preview: "Classic & Refined"
  },
  {
    family: "Lato",
    category: "sans-serif",
    variants: ["Light", "Regular", "Bold", "Black"],
    preview: "Warm & Stable"
  },
  {
    family: "Oswald",
    category: "sans-serif",
    variants: ["Light", "Regular", "Medium", "Bold"],
    preview: "Bold & Impactful"
  },
  {
    family: "Raleway",
    category: "sans-serif",
    variants: ["Light", "Regular", "SemiBold", "Bold"],
    preview: "Sleek & Stylish"
  },
  {
    family: "Merriweather",
    category: "serif",
    variants: ["Light", "Regular", "Bold", "Black"],
    preview: "Traditional & Readable"
  },
  {
    family: "Poppins",
    category: "sans-serif",
    variants: ["Light", "Regular", "SemiBold", "Bold"],
    preview: "Geometric & Friendly"
  },
  {
    family: "Source Sans Pro",
    category: "sans-serif",
    variants: ["Light", "Regular", "SemiBold", "Bold"],
    preview: "Professional & Clear"
  },
] as const;

export const PROGRESS_STAGES = [
  { status: "queued", label: "Queued", icon: "clock" },
  { status: "fetching_data", label: "Fetching Location", icon: "map-pin" },
  { status: "downloading_streets", label: "Streets", icon: "route" },
  { status: "downloading_parks", label: "Parks", icon: "trees" },
  { status: "downloading_water", label: "Water", icon: "droplet" },
  { status: "rendering", label: "Rendering", icon: "palette" },
  { status: "saving", label: "Saving", icon: "save" },
  { status: "completed", label: "Complete", icon: "check" },
] as const;
