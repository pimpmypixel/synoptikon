import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { generatePosterId, insertPoster } from './db'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'CreatePoster',
  path: '/posters/create',
  method: 'POST',
  emits: ['create-poster'],
  flows: ['poster-creation-flow'],
  bodySchema: z.object({
    city: z.string().min(1, 'City is required'),
    country: z.string().min(1, 'Country is required'),
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
  const posterId = generatePosterId()

  context.logger.info('Creating poster job', { jobId, posterId, city: body.city, country: body.country })

  // Insert poster record into SQLite
  try {
    const ext = (body.format || 'png').toLowerCase()
    insertPoster({
      id: posterId,
      filename: `${posterId}.${ext}`,
      city: body.city,
      country: body.country,
      theme: body.theme || 'feature_based',
      format: ext,
      distance: body.distance || 10000,
      landscape: body.landscape || false,
      titleFont: body.titleFont,
      subtitleFont: body.subtitleFont,
      paperSize: body.paperSize,
      rotation: body.rotation || 0,
      border: body.border ?? 0,
      lat: body.lat,
      lon: body.lon,
      widthCm: body.widthCm,
      heightCm: body.heightCm,
      createdAt: new Date().toISOString(),
    })
    context.logger.info('Poster record saved to DB', { posterId })
  } catch (dbError: any) {
    context.logger.error('Failed to save poster to DB', { error: dbError.message })
  }

  // Store job info in state for persistence
  try {
    const jobData = {
      jobId,
      posterId,
      city: body.city,
      country: body.country,
      theme: body.theme,
      format: body.format,
      status: 'queued',
      progress: 0,
      message: 'Poster creation job queued',
      outputFile: '',
      error: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await context.state.set('posterJobs', jobId, jobData)
    context.logger.info('Job saved to state', { jobId })
  } catch (stateError) {
    context.logger.error('Failed to save job to state', { error: stateError })
  }

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

  // Emit event for background processing with posterId for filename
  await context.emit({
    topic: 'create-poster',
    data: {
      ...body,
      jobId,
      posterId,
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
}
