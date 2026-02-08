import { ApiRouteConfig } from 'motia'
import { randomUUID } from 'crypto'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'DeletePoster',
  path: '/posters/delete/:filename',
  method: 'DELETE',
  emits: ['poster-deletion-requested'],
  flows: ['poster-creation-flow'],
}

export const handler = async (req: any, context: any) => {
  const { filename } = req.pathParams

  if (!filename) {
    return {
      status: 400,
      body: { error: 'Filename is required' },
    }
  }

  // Validate filename to prevent directory traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return {
      status: 400,
      body: { error: 'Invalid filename' },
    }
  }

  const requestId = randomUUID()

  // Emit deletion event for async processing
  await context.emit({
    topic: 'poster-deletion-requested',
    data: {
      filename,
      requestId,
    },
  })

  context.logger.info('Poster deletion requested', { filename, requestId })

  return {
    status: 202,
    body: {
      success: true,
      requestId,
      message: 'Deletion request queued',
    },
  }
}
