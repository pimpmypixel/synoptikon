import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { posterService } from './services/poster.service'
import { progressService } from './services/progress.service'
import type { PosterConfig, PosterProgress } from './types'

export const config = {
  type: 'event',
  name: 'ProcessPosterCreation',
  subscribes: ['create-poster'],
  emits: [],
  flows: ['poster-creation-flow'],
  description: 'Background job that creates map or night sky posters from form data',
}
    jobId: z.string(),
    posterId: z.string(),
    city: z.string().optional(),
    country: z.string().optional(),
    lat: z.number(),
    lon: z.number(),
    type: z.enum(['map', 'night-sky']).default('map'),
    googleMapsUrl: z.string().optional(),
    theme: z.string().default('feature_based'),
    distance: z.number().default(29000),
    border: z.number().optional(),
    format: z.enum(['png', 'svg', 'pdf']).default('png'),
    landscape: z.boolean().default(false),
    titleFont: z.string().optional(),
    subtitleFont: z.string().optional(),
    paperSize: z.string().optional(),
    rotation: z.number().optional(),
    widthCm: z.number().optional(),
    heightCm: z.number().optional(),
    // Night sky specific options
    timestamp: z.string().datetime().optional(),
    observationPoint: z.enum(['current', 'specified']).default('current'),
    celestialObjects: z.object({
      stars: z.boolean().default(true),
      planets: z.boolean().default(true),
      moon: z.boolean().default(true),
      constellations: z.boolean().default(true),
      deepSkyObjects: z.boolean().default(false),
    }).optional(),
    projection: z.object({
      type: z.literal('stereographic'),
      centerLat: z.number(),
      centerLon: z.number(),
      fov: z.number().default(180),
      northUp: z.boolean().default(true),
    }).optional(),
    styling: z.object({
      starColors: z.enum(['realistic', 'temperature', 'monochrome']).default('realistic'),
      starMagnitudes: z.object({
        minMagnitude: z.number().default(6.5),
        maxMagnitude: z.number().default(-2),
      }).optional(),
      constellationLines: z.boolean().default(true),
      constellationLabels: z.boolean().default(true),
      gridLines: z.boolean().default(true),
    }).optional(),
  }),
}

export const handler: Handlers = async (input: any, context: any) => {
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