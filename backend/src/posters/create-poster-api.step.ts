import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { posterService } from './services/poster.service'
import type { PosterConfig, PosterProgress } from './types'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'CreatePoster',
  path: '/posters/create',
  method: 'POST',
  emits: ['create-poster'],
  flows: ['poster-creation-flow'],
  bodySchema: z.object({
    type: z.enum(['map', 'night-sky']).default('map'),
    city: z.string().optional(),
    country: z.string().optional(),
    lat: z.number().optional(),
    lon: z.number().optional(),
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
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      jobId: z.string(),
      message: z.string(),
    }),
    400: z.object({
      error: z.string(),
    }),
  },
}

export const handler = async (req: any, context: any) => {
  const body = req.body
  const jobId = `poster-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  context.logger.info('Creating poster job', { 
    jobId, 
    type: body.type,
    city: body.city, 
    country: body.country 
  })

  try {
    // Validate configuration
    await posterService.validate(body as PosterConfig)
    
    // Initialize progress tracking
    await context.state.set('posterJobs', jobId, {
      jobId,
      posterId: jobId, // Use jobId as posterId for now
      type: body.type,
      status: 'queued',
      progress: 0,
      message: 'Poster creation job queued',
      outputFile: '',
      error: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    // Initialize stream with queued status
    await context.streams.posterProgress.set(jobId, 'status', {
      status: 'queued',
      message: 'Poster creation job queued',
      progress: 0,
      jobId,
      outputFile: undefined,
      error: undefined,
      timestamp: new Date().toISOString(),
    })

    // Emit event for background processing
    await context.emit({
      topic: 'create-poster',
      data: {
        ...body,
        jobId,
        posterId: jobId,
      },
    })

    return {
      status: 200,
      body: {
        success: true,
        jobId,
        message: 'Poster creation started. Connect to WebSocket to track progress.',
      },
    }
  } catch (error) {
    context.logger.error('Failed to create poster job', { 
      error: (error as Error).message,
      jobId 
    })

    return {
      status: 400,
      body: {
        error: (error as Error).message,
      },
    }
  }
}