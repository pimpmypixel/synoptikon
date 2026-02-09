import type { IDataService } from '../interfaces'
import { createHash } from 'crypto'

interface CacheEntry<T> {
  value: T
  timestamp: number
  ttl?: number
}

/**
 * Memory-based cache service with optional TTL
 */
export class DataService implements IDataService {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private defaultTTL = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

  async getFromCache<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Check if entry has expired
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.value as T
  }

  async setCache<T>(key: string, value: T, ttl?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    }
    
    this.cache.set(key, entry)
  }

  async clearCache(pattern?: string): Promise<void> {
    if (!pattern) {
      this.cache.clear()
      return
    }

    // Simple pattern matching for cache keys
    const regex = new RegExp(pattern.replace('*', '.*'))
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Generate a cache key from parameters
   */
  generateCacheKey(prefix: string, params: Record<string, any>): string {
    const keyString = `${prefix}:${JSON.stringify(params)}`
    return createHash('md5').update(keyString).digest('hex')
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (entry.ttl && now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

// Singleton instance
export const dataService = new DataService()

// Set up periodic cleanup
setInterval(() => {
  dataService.cleanup()
}, 60 * 60 * 1000) // Clean up every hour