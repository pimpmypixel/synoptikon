export interface PosterFormData {
  // Core fields
  type: "map" | "night-sky";
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
  
  // Map-specific fields
  waterFeatures?: boolean;
  parkFeatures?: boolean;
  roadHierarchy?: boolean;
  
  // Night sky specific fields
  timestamp?: string; // ISO datetime string
  observationPoint?: "current" | "specified";
  celestialObjects?: {
    stars?: boolean;
    planets?: boolean;
    moon?: boolean;
    constellations?: boolean;
    deepSkyObjects?: boolean;
  };
  projection?: {
    type: "stereographic";
    centerLat?: number;
    centerLon?: number;
    fov?: number;
    northUp?: boolean;
  };
  styling?: {
    starColors?: "realistic" | "temperature" | "monochrome";
    starMagnitudes?: {
      minMagnitude?: number;
      maxMagnitude?: number;
    };
    constellationLines?: boolean;
    constellationLabels?: boolean;
    gridLines?: boolean;
  };
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
  // Map themes
  { value: "feature_based", label: "Feature Based", description: "Modern style with color-coded features", type: "map" },
  { value: "noir", label: "Noir", description: "Dark and dramatic", type: "map" },
  { value: "warm_beige", label: "Warm Beige", description: "Soft and elegant", type: "map" },
  { value: "blueprint", label: "Blueprint", description: "Technical blueprint style", type: "map" },
  { value: "ocean", label: "Ocean", description: "Cool ocean tones", type: "map" },
  { value: "midnight_blue", label: "Midnight Blue", description: "Deep blue night theme", type: "map" },
  { value: "pastel_dream", label: "Pastel Dream", description: "Soft pastel colors", type: "map" },
  { value: "japanese_ink", label: "Japanese Ink", description: "Minimalist ink wash", type: "map" },
  { value: "terracotta", label: "Terracotta", description: "Warm earth tones", type: "map" },
  { value: "sunset", label: "Sunset", description: "Warm sunset gradients", type: "map" },
  { value: "contrast_zones", label: "Contrast Zones", description: "High contrast zones", type: "map" },
  { value: "copper_patina", label: "Copper Patina", description: "Aged copper aesthetics", type: "map" },
  
  // Night sky themes
  { value: "starry_night", label: "Starry Night", description: "Deep blue with bright stars", type: "night-sky" },
  { value: "cosmic_purple", label: "Cosmic Purple", description: "Mysterious purple nebula", type: "night-sky" },
  { value: "aurora_green", label: "Aurora Green", description: "Northern lights style", type: "night-sky" },
  { value: "lunar_gray", label: "Lunar Gray", description: "Moon surface monochrome", type: "night-sky" },
  { value: "solar_orange", label: "Solar Orange", description: "Warm solar corona", type: "night-sky" },
  { value: "nebula_pink", label: "Nebula Pink", description: "Pink cosmic dust", type: "night-sky" },
] as const;

export const DISTANCE_OPTIONS = [
  { value: 1000, label: "1km", description: "Street level" },
  { value: 2000, label: "2km", description: "Block view" },
  { value: 3000, label: "3km", description: "Close-up" },
  { value: 4000, label: "4km", description: "Neighborhood" },
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
