import type {
  PosterConfig,
  PosterProgress,
  StreetNetwork,
  GeoFeature,
  CelestialObject,
} from '../types'

/**
 * Base poster service interface
 */
export interface IPosterService {
  validate(config: PosterConfig): Promise<boolean>
  createPoster(config: PosterConfig): Promise<PosterResult>
  getProgress(jobId: string): Promise<PosterProgress | null>
}

/**
 * Poster creation result
 */
export interface PosterResult {
  success: boolean
  filePath?: string
  thumbnailPath?: string
  fileSize?: number
  metadata?: {
    width: number
    height: number
    dpi: number
    format: string
    renderTime: number
  }
  error?: string
}

/**
 * Map poster service interface
 */
export interface IMapPosterService extends IPosterService {
  fetchStreetNetwork(lat: number, lon: number, distance: number): Promise<StreetNetwork>
  fetchFeatures(lat: number, lon: number, distance: number, type: 'water' | 'parks'): Promise<GeoFeature[]>
}

/**
 * Your Sky poster service interface
 */
export interface IYourSkyService extends IPosterService {
  calculateCelestialPositions(timestamp: string, lat: number, lon: number): Promise<CelestialObject[]>
  fetchStarCatalog(magnitude: number): Promise<CelestialObject[]>
}

/**
 * Data fetching service interface
 */
export interface IDataService {
  getFromCache<T>(key: string): Promise<T | null>
  setCache<T>(key: string, value: T, ttl?: number): Promise<void>
  clearCache(pattern?: string): Promise<void>
}

/**
 * Progress tracking service interface
 */
export interface IProgressService {
  updateProgress(jobId: string, status: PosterProgress['status'], message: string, progress: number, outputFile?: string, error?: string): Promise<void>
  getProgress(jobId: string): Promise<PosterProgress | null>
  completeProgress(jobId: string, outputFile: string, metadata: any): Promise<void>
  failProgress(jobId: string, error: string): Promise<void>
}

