import { EventConfig } from 'motia'
import fs from 'fs/promises'
import path from 'path'

export const config: EventConfig = {
  type: 'event',
  name: 'ProcessPosterDeletion',
  subscribes: ['poster-deletion-requested'],
  emits: ['poster-deletion-completed', 'poster-deletion-failed'],
  flows: ['poster-creation-flow'],
}

interface DeletionRequest {
  filename: string
  requestId: string
}

export const handler = async (input: DeletionRequest, context: any) => {
  const { filename, requestId } = input

  context.logger.info('Processing poster deletion', { filename, requestId })

  // Validate filename
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    await context.emit({
      topic: 'poster-deletion-failed',
      data: {
        requestId,
        filename,
        error: 'Invalid filename',
      },
    })
    return
  }

  const postersDir = path.join(process.cwd(), '..', 'posters')
  const filePath = path.join(postersDir, filename)
  const metadataPath = filePath.replace(/\.(png|svg|pdf)$/i, '.json')

  try {
    // Check if file exists
    await fs.access(filePath)

    // Delete the poster file
    await fs.unlink(filePath)
    context.logger.info('Deleted poster file', { filePath })

    // Try to delete the metadata file if it exists
    try {
      await fs.unlink(metadataPath)
      context.logger.info('Deleted metadata file', { metadataPath })
    } catch {
      // Metadata file may not exist, that's ok
    }

    await context.emit({
      topic: 'poster-deletion-completed',
      data: {
        requestId,
        filename,
        success: true,
      },
    })
  } catch (error: any) {
    context.logger.error('Failed to delete poster', { error: error.message, filename })

    await context.emit({
      topic: 'poster-deletion-failed',
      data: {
        requestId,
        filename,
        error: error.code === 'ENOENT' ? 'Poster not found' : 'Failed to delete poster',
      },
    })
  }
}
