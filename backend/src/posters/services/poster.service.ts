import { IPosterService, PosterResult } from '../interfaces'
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
    if (config.type === 'map') {
      return mapPosterService.validate(config as MapPosterConfig)
    } else if (config.type === 'night-sky') {
      return nightSkyService.validate(config as NightSkyConfig)
    }
    
    throw new Error(`Unknown poster type: ${config.type}`)
  }

  /**
   * Create poster (main entry point)
   */
  async createPoster(config: PosterConfig): Promise<PosterResult> {
    if (config.type === 'map') {
      return mapPosterService.createPoster(config as MapPosterConfig)
    } else if (config.type === 'night-sky') {
      return nightSkyService.createPoster(config as NightSkyConfig)
    }
    
    throw new Error(`Unknown poster type: ${config.type}`)
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