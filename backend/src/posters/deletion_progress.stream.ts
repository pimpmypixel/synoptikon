import type { StreamConfig } from 'motia'
import { z } from 'zod'

export const config: StreamConfig = {
  name: 'deletionProgress',
  schema: z.object({
    requestId: z.string(),
    filename: z.string(),
    status: z.enum(['pending', 'completed', 'failed']),
    error: z.string().optional(),
    timestamp: z.string(),
  }),
  baseConfig: {
    storageType: 'default',
  },
}
