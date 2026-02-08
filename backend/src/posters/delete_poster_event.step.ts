import { EventConfig } from 'motia'
import fs from 'fs/promises'
import path from 'path'
import { getPosterByFilename, deletePosterByFilename } from './db'

export const config: EventConfig = {
  type: 'event',
  name: 'ProcessPosterDeletion',
  subscribes: ['poster-deletion-requested'],
  emits: [],
  flows: ['poster-creation-flow'],
}

interface DeletionRequest {
  filename: string
  requestId: string
}

export const handler = async (input: DeletionRequest, context: any) => {
  const { filename, requestId } = input

  context.logger.info('Processing poster deletion', { filename, requestId })

  const updateStatus = async (status: 'pending' | 'completed' | 'failed', error?: string) => {
    await context.streams.deletionProgress.set(requestId, 'status', {
      requestId,
      filename,
      status,
      error,
      timestamp: new Date().toISOString(),
    })
  }

  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    await updateStatus('failed', 'Invalid filename')
    return
  }

  const postersDir = path.join(process.cwd(), '..', 'posters')

  try {
    // Look up poster record to find thumbnail
    const record = getPosterByFilename(filename)

    // Delete the poster file
    const filePath = path.join(postersDir, filename)
    await fs.unlink(filePath)
    context.logger.info('Deleted poster file', { filePath })

    // Delete thumbnail if it exists
    if (record?.thumbnail) {
      try {
        await fs.unlink(path.join(postersDir, record.thumbnail))
      } catch { /* ok */ }
    }

    // Delete from SQLite
    deletePosterByFilename(filename)

    await updateStatus('completed')
  } catch (error: any) {
    context.logger.error('Failed to delete poster', { error: error.message, filename })
    await updateStatus('failed', error.code === 'ENOENT' ? 'Poster not found' : 'Failed to delete poster')
  }
}
