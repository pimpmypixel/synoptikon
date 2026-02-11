import type { ApiRouteConfig } from 'motia'
import { z } from 'zod'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'CleanPosterJobs',
  path: '/posters/jobs/clean',
  method: 'POST',
  emits: [],
  flows: ['poster-creation-flow'],
  bodySchema: z.object({
    mode: z.enum(['stale', 'errors', 'all']).default('stale'),
  }),
  responseSchema: {
    200: z.object({
      removed: z.number(),
      message: z.string(),
    }),
  },
}

const STALE_THRESHOLD_MS = 10 * 60 * 1000 // 10 minutes

export const handler = async (req: any, context: any) => {
  const { mode } = req.body

  context.logger.info('Cleaning poster jobs', { mode })

  try {
    const jobs: any[] = await context.state.getGroup('posterJobs') || []
    const now = Date.now()
    let removed = 0

    for (const job of jobs) {
      let shouldRemove = false

      if (mode === 'all') {
        shouldRemove = true
      } else if (mode === 'errors') {
        shouldRemove = job.status === 'error'
      } else {
        // stale: remove errored jobs + jobs stuck in non-completed status for too long
        const age = now - new Date(job.updatedAt || job.createdAt).getTime()
        const isStale = job.status !== 'completed' && job.status !== 'error' && age > STALE_THRESHOLD_MS
        shouldRemove = job.status === 'error' || isStale
      }

      if (shouldRemove) {
        await context.state.delete('posterJobs', job.jobId)
        removed++
      }
    }

    context.logger.info(`Cleaned ${removed} jobs`, { mode, removed })

    return {
      status: 200,
      body: {
        removed,
        message: `Removed ${removed} job${removed !== 1 ? 's' : ''}`,
      },
    }
  } catch (error) {
    context.logger.error('Failed to clean jobs', { error: (error as Error).message })
    return {
      status: 200,
      body: {
        removed: 0,
        message: (error as Error).message,
      },
    }
  }
}
