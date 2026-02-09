import type { IPosterService, PosterResult } from '../interfaces'
import { mapPosterService } from './map-poster-new.service'
import { nightSkyService } from './night-sky-new.service'
import { progressService } from './progress.service'
import type { PosterConfig, MapPosterConfig, NightSkyConfig, PosterProgress } from '../types'

/**
 * Unified poster service that delegates to appropriate specialized service
 */
export class PosterService implements IPosterService {
  /**
   * Validate poster configuration
   */
  async validate(config: PosterConfig): Promise<boolean> {
    const posterConfig = config as any // Use any to bypass discriminated union issues
    
    if (posterConfig.type === 'map') {
      return mapPosterService.validate(posterConfig as MapPosterConfig)
    } else if (posterConfig.type === 'night-sky') {
      return nightSkyService.validate(posterConfig as NightSkyConfig)
    }
    
    throw new Error(`Unknown poster type: ${posterConfig.type}`)
  }

  /**
   * Create poster (main entry point)
   */
  async createPoster(config: PosterConfig): Promise<PosterResult> {
    const posterConfig = config as any // Use any to bypass discriminated union issues
    
    if (posterConfig.type === 'map') {
      return mapPosterService.createPoster(posterConfig as MapPosterConfig)
    } else if (posterConfig.type === 'night-sky') {
      return nightSkyService.createPoster(posterConfig as NightSkyConfig)
    }
    
    throw new Error(`Unknown poster type: ${posterConfig.type}`)
  }

  /**
   * Get progress for job
   */
  async getProgress(jobId: string): Promise<PosterProgress | null> {
    return progressService.getProgress(jobId)
  }
}

// Singleton instance
export const posterService = new PosterService()