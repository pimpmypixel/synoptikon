import { StreamConfig } from 'motia'
import { z } from 'zod'

export const config: StreamConfig = {
  name: 'posterProgress',
  schema: z.object({
    status: z.enum(['queued', 'fetching_data', 'downloading_streets', 'downloading_parks', 'downloading_water', 'rendering', 'saving', 'completed', 'error']),
    message: z.string(),
    progress: z.number().min(0).max(100),
    jobId: z.string(),
    outputFile: z.string().optional(),
    error: z.string().optional(),
    timestamp: z.string(),
  }),
  baseConfig: {
    storageType: 'default',
  },
}
