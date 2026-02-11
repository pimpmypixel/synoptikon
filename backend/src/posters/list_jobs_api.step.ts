import type { ApiRouteConfig } from 'motia'
import { z } from 'zod'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'ListPosterJobs',
  path: '/posters/jobs',
  method: 'GET',
  emits: [],
  flows: ['poster-creation-flow'],
  responseSchema: {
    200: z.object({
      jobs: z.array(z.object({
        jobId: z.string(),
        city: z.string(),
        country: z.string(),
        theme: z.string(),
        format: z.string(),
        status: z.string(),
        progress: z.number(),
        message: z.string(),
        outputFile: z.string().nullable(),
        error: z.string().nullable(),
        createdAt: z.string(),
        updatedAt: z.string(),
      })),
    }),
  },
}

export const handler = async (req: any, context: any) => {
  context.logger.info('Fetching poster jobs list')

  try {
    // Get all jobs from state group
    let jobs: any[] = []
    try {
      // Use getGroup to get all items in the posterJobs group
      jobs = await context.state.getGroup('posterJobs') || []
      
      // Sort by createdAt, newest first
      jobs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      
      context.logger.info(`Found ${jobs.length} jobs in state`)
    } catch (stateError) {
      context.logger.warn('State not available, returning empty jobs list', { error: stateError })
    }

    return {
      status: 200,
      body: {
        jobs,
      },
    }
  } catch (error) {
    context.logger.error('Failed to fetch jobs', { error })
    return {
      status: 200,
      body: {
        jobs: [],
      },
    }
  }
}
