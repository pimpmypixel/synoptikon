import type { EventConfig } from 'motia'
import { posterService } from './services/poster.service'
import { progressService } from './services/progress.service'
import { insertPoster } from './db'
import type { PosterConfig } from './types'

export const config: EventConfig = {
  type: 'event',
  name: 'ProcessPosterCreation',
  subscribes: ['create-poster'],
  emits: [],
  flows: ['poster-creation-flow'],
  description: 'Background job that creates map or your sky posters from form data',
}

export const handler = async (input: any, context: any) => {
  const { jobId, posterId } = input
  const config = { ...input } as PosterConfig

  // Inject Motia context so progress updates push to the stream
  progressService.setContext(context)

  context.logger.info('Processing poster creation job', {
    jobId,
    posterId,
    type: config.type,
    city: config.city,
    country: config.country
  })

  try {
    // Validate configuration
    await posterService.validate(config)

    // Create poster (services handle their own progress updates)
    const result = await posterService.createPoster(config)

    if (result.success) {
      // Save poster metadata to SQLite for the gallery
      try {
        const filename = result.filePath?.split('/').pop() || `${posterId}.${config.format || 'png'}`
        const thumbnailFilename = result.thumbnailPath?.split('/').pop()
        insertPoster({
          id: posterId,
          filename,
          type: (config.type as 'map' | 'your-sky') || 'map',
          city: config.city || '',
          country: config.country || '',
          theme: config.theme || 'feature_based',
          format: config.format || 'png',
          distance: config.distance || 29000,
          landscape: config.landscape || false,
          titleFont: config.titleFont,
          subtitleFont: config.subtitleFont,
          paperSize: config.paperSize,
          rotation: config.rotation,
          border: config.border,
          lat: config.lat,
          lon: config.lon,
          widthCm: config.widthCm,
          heightCm: config.heightCm,
          fileSize: result.fileSize,
          thumbnail: thumbnailFilename,
          createdAt: new Date().toISOString(),
        })
        context.logger.info('Poster metadata saved to database', { posterId, filename })
      } catch (dbError) {
        context.logger.warn('Failed to save poster metadata to database', {
          posterId,
          error: (dbError as Error).message
        })
      }

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