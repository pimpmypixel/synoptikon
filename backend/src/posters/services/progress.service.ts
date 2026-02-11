import type { IProgressService } from '../interfaces'
import type { PosterProgress } from '../types'

/**
 * Progress tracking service for poster creation jobs.
 *
 * Must call setContext() with the Motia event handler context
 * before use, so progress updates are pushed to the posterProgress stream.
 */
export class ProgressService implements IProgressService {
  private progress: Map<string, PosterProgress> = new Map()
  private context: any = null

  /**
   * Inject Motia context so stream updates can be pushed.
   * Call this once per event handler invocation.
   */
  setContext(ctx: any): void {
    this.context = ctx
  }

  async updateProgress(
    jobId: string,
    status: PosterProgress['status'],
    message: string,
    progress: number,
    outputFile?: string,
    error?: string
  ): Promise<void> {
    const progressEntry: PosterProgress = {
      jobId,
      status,
      message,
      progress: Math.min(100, Math.max(0, progress)),
      outputFile,
      error,
      timestamp: new Date().toISOString()
    }

    this.progress.set(jobId, progressEntry)

    console.log(`[${jobId}] ${progress}% - ${message}`)

    // Push to Motia stream so the frontend receives real-time updates
    if (this.context?.streams?.posterProgress) {
      try {
        await this.context.streams.posterProgress.set(jobId, 'status', {
          status: progressEntry.status,
          message: progressEntry.message,
          progress: progressEntry.progress,
          jobId,
          outputFile: progressEntry.outputFile,
          error: progressEntry.error,
          timestamp: progressEntry.timestamp,
        })
      } catch (err) {
        console.warn(`Failed to push progress to stream for ${jobId}:`, err)
      }
    }

    // Also update job state so the Jobs page reflects current status
    if (this.context?.state) {
      try {
        const existing = await this.context.state.get('posterJobs', jobId)
        if (existing) {
          await this.context.state.set('posterJobs', jobId, {
            ...existing,
            status: progressEntry.status,
            progress: progressEntry.progress,
            message: progressEntry.message,
            outputFile: progressEntry.outputFile || existing.outputFile,
            error: progressEntry.error || existing.error,
            updatedAt: progressEntry.timestamp,
          })
        }
      } catch (err) {
        console.warn(`Failed to update job state for ${jobId}:`, err)
      }
    }
  }

  async getProgress(jobId: string): Promise<PosterProgress | null> {
    return this.progress.get(jobId) || null
  }

  async completeProgress(
    jobId: string,
    outputFile: string,
    metadata: any
  ): Promise<void> {
    await this.updateProgress(
      jobId,
      'completed',
      'Poster created successfully!',
      100,
      outputFile
    )
  }

  async failProgress(jobId: string, error: string): Promise<void> {
    await this.updateProgress(
      jobId,
      'error',
      `Error: ${error}`,
      0,
      undefined,
      error
    )
  }

  getActiveJobs(): PosterProgress[] {
    return Array.from(this.progress.values()).filter(
      p => p.status !== 'completed' && p.status !== 'error'
    )
  }

  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now()
    const cutoffTime = now - maxAge

    for (const [jobId, progress] of this.progress.entries()) {
      const progressTime = new Date(progress.timestamp).getTime()

      if (
        (progress.status === 'completed' || progress.status === 'error') &&
        progressTime < cutoffTime
      ) {
        this.progress.delete(jobId)
      }
    }
  }

  getStats(): {
    total: number
    active: number
    completed: number
    failed: number
  } {
    const allJobs = Array.from(this.progress.values())

    return {
      total: allJobs.length,
      active: allJobs.filter(j => j.status !== 'completed' && j.status !== 'error').length,
      completed: allJobs.filter(j => j.status === 'completed').length,
      failed: allJobs.filter(j => j.status === 'error').length
    }
  }
}

// Singleton instance
export const progressService = new ProgressService()

// Set up periodic cleanup
setInterval(() => {
  progressService.cleanup()
}, 60 * 60 * 1000)
