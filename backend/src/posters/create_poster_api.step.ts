import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

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
    fontFamily: z.string().optional(),
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

  context.logger.info('Creating poster job', { jobId, city: body.city, country: body.country })

  // Store job info in state for persistence
  try {
    const jobData = {
      jobId,
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
    // Use proper Motia state API: state.set(groupId, key, value)
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

  // Emit event for background processing
  await context.emit({
    topic: 'create-poster',
    data: {
      ...body,
      jobId,
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
