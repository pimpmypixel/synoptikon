import { z } from 'zod'

// Base poster configuration
export const BasePosterConfigSchema = z.object({
  jobId: z.string(),
  posterId: z.string(),
  city: z.string().optional(),
  country: z.string().optional(),
  lat: z.number(),
  lon: z.number(),
  theme: z.string(),
  distance: z.number().optional(),
  border: z.number().optional(),
  format: z.enum(['png', 'svg', 'pdf']),
  landscape: z.boolean(),
  titleFont: z.string().optional(),
  subtitleFont: z.string().optional(),
  paperSize: z.string().optional(),
  rotation: z.number().default(0),
  widthCm: z.number().optional(),
  heightCm: z.number().optional(),
})

// Map poster specific configuration
export const MapPosterConfigSchema = BasePosterConfigSchema.extend({
  type: z.literal('map'),
  googleMapsUrl: z.string().optional(),
  waterFeatures: z.boolean().default(true),
  parkFeatures: z.boolean().default(true),
  roadHierarchy: z.boolean().default(true),
})

// Night sky poster specific configuration
export const NightSkyConfigSchema = BasePosterConfigSchema.extend({
  type: z.literal('night-sky'),
  timestamp: z.string().datetime(), // ISO datetime string
  observationPoint: z.enum(['current', 'specified']), // whether to use current location or specified lat/lon
  celestialObjects: z.object({
    stars: z.boolean().default(true),
    planets: z.boolean().default(true),
    moon: z.boolean().default(true),
    constellations: z.boolean().default(true),
    deepSkyObjects: z.boolean().default(false),
  }).default({
    stars: true,
    planets: true,
    moon: true,
    constellations: true,
    deepSkyObjects: false,
  }),
  projection: z.object({
    type: z.literal('stereographic'),
    centerLat: z.number(),
    centerLon: z.number(),
    fov: z.number().default(180), // field of view in degrees
    northUp: z.boolean().default(true),
  }).default({
    type: 'stereographic',
    centerLat: 0,
    centerLon: 0,
    fov: 180,
    northUp: true,
  }),
  styling: z.object({
    starColors: z.enum(['realistic', 'temperature', 'monochrome']).default('realistic'),
    starMagnitudes: z.object({
      minMagnitude: z.number().default(6.5),
      maxMagnitude: z.number().default(-2),
    }).default({
      minMagnitude: 6.5,
      maxMagnitude: -2,
    }),
    constellationLines: z.boolean().default(true),
    constellationLabels: z.boolean().default(true),
    gridLines: z.boolean().default(true),
  }).default({
    starColors: 'realistic',
    starMagnitudes: {
      minMagnitude: 6.5,
      maxMagnitude: -2,
    },
    constellationLines: true,
    constellationLabels: true,
    gridLines: true,
  }),
})

// Union type for all poster configurations
export const PosterConfigSchema = z.discriminatedUnion('type', [
  MapPosterConfigSchema,
  NightSkyConfigSchema,
])

export type MapPosterConfig = z.infer<typeof MapPosterConfigSchema>
export type NightSkyConfig = z.infer<typeof NightSkyConfigSchema>
export type PosterConfig = z.infer<typeof PosterConfigSchema>

// Progress tracking
export interface PosterProgress {
  jobId: string
  status: 'queued' | 'fetching_data' | 'downloading_streets' | 'downloading_parks' | 'downloading_water' | 'calculating_celestial' | 'rendering' | 'saving' | 'completed' | 'error'
  message: string
  progress: number
  outputFile?: string
  error?: string
  timestamp: string
}

// Theme types
export interface MapTheme {
  name: string
  description?: string
  bg: string
  text: string
  gradient_color: string
  water: string
  parks: string
  road_motorway: string
  road_primary: string
  road_secondary: string
  road_tertiary: string
  road_residential: string
  road_default: string
  fonts: {
    bold: string
    regular: string
    light: string
  }
  edge_width_factor?: number
}

export interface NightSkyTheme {
  name: string
  description?: string
  bg: string
  text: string
  stars: {
    main: string
    bright: string
    dim: string
  }
  planets: {
    mercury: string
    venus: string
    earth: string
    mars: string
    jupiter: string
    saturn: string
    uranus: string
    neptune: string
  }
  moon: string
  constellations: string
  grid: string
  fonts: {
    bold: string
    regular: string
    light: string
  }
}

export type Theme = MapTheme | NightSkyTheme

// Export formats
export interface ExportOptions {
  format: 'png' | 'svg' | 'pdf'
  dpi?: number
  quality?: number
  backgroundColor?: string
}

// Data types
export interface StreetNetwork {
  nodes: Array<{
    id: string
    lat: number
    lon: number
    x: number
    y: number
  }>
  edges: Array<{
    from: string
    to: string
    highway: string
    geometry: Array<[number, number]>
  }>
}

export interface GeoFeature {
  type: 'water' | 'park' | 'building'
  geometry: Array<Array<[number, number]>>
  properties?: Record<string, any>
}

export interface CelestialObject {
  id: string
  type: 'star' | 'planet' | 'moon' | 'constellation' | 'deep_sky'
  name: string
  magnitude: number
  position: {
    ra: number // right ascension in degrees
    dec: number // declination in degrees
  }
  projected?: {
    x: number
    y: number
  }
  properties?: {
    constellation?: string
    spectral_type?: string
    color?: string
    size?: number
  }
}

// Result types
export interface PosterResult {
  success: boolean
  filePath: string
  thumbnailPath: string
  fileSize: number
  metadata: {
    width: number
    height: number
    dpi: number
    format: string
    renderTime: number
  }
  error?: string
}