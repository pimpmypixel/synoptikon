import type { IProgressService } from '../interfaces'
import type { PosterProgress } from '../types'

/**
 * Progress tracking service for poster creation jobs
 */
export class ProgressService implements IProgressService {
  private progress: Map<string, PosterProgress> = new Map()

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
    
    // In a real implementation, this would also update the stream
    // For now, we just store in memory
    console.log(`[${jobId}] ${progress}% - ${message}`)
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

    // Store completion metadata
    const existingProgress = this.progress.get(jobId)
    if (existingProgress) {
      existingProgress.outputFile = outputFile
      this.progress.set(jobId, existingProgress)
    }
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

  /**
   * Get all active jobs
   */
  getActiveJobs(): PosterProgress[] {
    return Array.from(this.progress.values()).filter(
      p => p.status !== 'completed' && p.status !== 'error'
    )
  }

  /**
   * Clean up old completed jobs
   */
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

  /**
   * Get job statistics
   */
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
}, 60 * 60 * 1000) // Clean up every hour