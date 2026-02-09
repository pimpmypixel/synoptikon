import { z } from 'zod'
import type { ApiRouteConfig } from 'motia'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'ServePosterFile',
  path: '/posters-files/:filename',
  method: 'GET',
  emits: [],
  flows: ['poster-creation-flow'],
}

export const handler = async (req: any, context: any) => {
  const { filename } = req.pathParams

  // Security: prevent directory traversal
  if (filename?.includes('..') || filename?.includes('/')) {
    return {
      status: 400,
      body: { error: 'Invalid filename' },
    }
  }

  // Posters are in root directory
  const postersDir = '../posters'
  const filePath = `${postersDir}/${filename}`

  try {
    const file = await Bun.file(filePath).arrayBuffer()
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    
    let contentType = 'application/octet-stream'
    if (ext === 'png') contentType = 'image/png'
    else if (ext === 'svg') contentType = 'image/svg+xml'
    else if (ext === 'pdf') contentType = 'application/pdf'
    
    return new Response(file, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    })
  } catch (error) {
    context.logger.error('Failed to serve poster file', { filename, error })
    return {
      status: 404,
      body: { error: 'File not found' },
    }
  }
}