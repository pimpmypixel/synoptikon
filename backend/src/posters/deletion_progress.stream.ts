import { StreamConfig } from 'motia'

export const config: StreamConfig = {
  type: 'stream',
  name: 'DeletionProgress',
  subscribes: ['poster-deletion-completed', 'poster-deletion-failed'],
  flows: ['poster-creation-flow'],
}

interface DeletionEvent {
  requestId: string
  filename: string
  success?: boolean
  error?: string
}

export const handler = async (input: DeletionEvent, context: any) => {
  const { requestId, filename, success, error } = input

  const status = success ? 'completed' : 'failed'

  context.logger.info('Streaming deletion status', { requestId, status })

  await context.streams.publishToGroup('deletionProgress', requestId, {
    requestId,
    filename,
    status,
    error,
    timestamp: new Date().toISOString(),
  })
}
