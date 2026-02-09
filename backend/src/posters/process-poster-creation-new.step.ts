import type { EventConfig } from 'motia'
import { z } from 'zod'
import { posterService } from './services/poster.service'
import { progressService } from './services/progress.service'
import type { PosterConfig } from './types'

export const config: EventConfig = {
  type: 'event',
  name: 'ProcessPosterCreation',
  subscribes: ['create-poster'],
  emits: [],
  flows: ['poster-creation-flow'],
  description: 'Background job that creates map or night sky posters from form data',
}

export const handler = async (input: any, context: any) => {
  const { jobId, posterId, ...config } = input.data
  
  context.logger.info('Processing poster creation job', { 
    jobId, 
    posterId,
    type: config.type,
    city: config.city,
    country: config.country
  })

  try {
    // Validate configuration
    await posterService.validate(config as PosterConfig)
    
    // Update progress - fetching data
    await progressService.updateProgress(
      jobId,
      'fetching_data',
      'Getting coordinates...',
      5
    )

    // Create poster
    const result = await posterService.createPoster(config as PosterConfig)
    
    if (result.success) {
      await progressService.completeProgress(jobId, result.filePath!, result.metadata)
      
      context.logger.info('Poster creation completed', { 
        jobId, 
        outputFile: result.filePath,
        fileSize: result.fileSize,
        renderTime: result.metadata?.renderTime 
      })
    } else {
      context.logger.error('Poster creation failed', { 
        jobId, 
        error: result.error 
      })
    }

  } catch (error) {
    context.logger.error('Error in poster creation job', { 
      jobId, 
      error: (error as Error).message,
      stack: (error as Error).stack 
    })
    
    await progressService.failProgress(jobId, (error as Error).message)
  }
}