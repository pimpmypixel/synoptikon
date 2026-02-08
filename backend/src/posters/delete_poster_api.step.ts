import { ApiRouteConfig } from 'motia'
import fs from 'fs/promises'
import path from 'path'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'DeletePoster',
  path: '/posters/delete/:filename',
  method: 'DELETE',
  emits: [],
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

  const postersDir = path.join(process.cwd(), '..', 'posters')
  const filePath = path.join(postersDir, filename)
  const metadataPath = filePath.replace(/\.(png|svg|pdf)$/i, '.json')

  try {
    // Check if file exists
    try {
      await fs.access(filePath)
    } catch {
      return {
        status: 404,
        body: { error: 'Poster not found' },
      }
    }

    // Delete the poster file
    await fs.unlink(filePath)

    // Try to delete the metadata file if it exists
    try {
      await fs.unlink(metadataPath)
    } catch {
      // Metadata file may not exist, that's ok
    }

    context.logger.info('Poster deleted', { filename })

    return {
      status: 200,
      body: { success: true, filename },
    }
  } catch (error) {
    context.logger.error('Failed to delete poster', { error, filename })
    return {
      status: 500,
      body: { error: 'Failed to delete poster' },
    }
  }
}
