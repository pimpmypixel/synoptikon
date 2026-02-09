import type { INightSkyService, PosterResult } from '../interfaces'
import { progressService } from './progress.service'
import { dataService } from './data.service'
import type { NightSkyConfig, CelestialObject, NightSkyTheme, PosterProgress } from '../types'

/**
 * Night sky poster service using astronomical calculations
 */
export class NightSkyService implements INightSkyService {
  private readonly outputDir = 'posters'

  /**
   * Validate night sky configuration
   */
  async validate(config: NightSkyConfig): Promise<boolean> {
    if (!config.timestamp) {
      throw new Error('Timestamp is required for night sky posters')
    }
    
    if (!config.lat || !config.lon) {
      throw new Error('Coordinates are required for observation point')
    }

    return true
  }

  /**
   * Create night sky poster (main entry point)
   */
  async createPoster(config: NightSkyConfig): Promise<PosterResult> {
    const startTime = Date.now()
    
    try {
      await progressService.updateProgress(
        config.jobId,
        'fetching_data',
        'Preparing celestial calculations...',
        5
      )

      // Load theme
      const theme = await this.loadTheme(config.theme)
      
      await progressService.updateProgress(
        config.jobId,
        'calculating_celestial',
        'Calculating celestial positions...',
        25
      )

      // Calculate celestial positions
      const celestialObjects = await this.calculateCelestialPositions(
        config.timestamp,
        config.lat,
        config.lon
      )

      await progressService.updateProgress(
        config.jobId,
        'rendering',
        'Rendering night sky...',
        60
      )

      // Calculate dimensions
      const dimensions = this.calculateDimensions(config)
      
      // Render night sky poster
      const renderResult = await this.renderNightSkyPosterContent(config, celestialObjects, theme, dimensions)

      await progressService.updateProgress(
        config.jobId,
        'saving',
        'Saving poster...',
        90
      )

      // Save files
      const saveResult = await this.savePoster(renderResult, config)
      
      await progressService.completeProgress(config.jobId, saveResult.filePath, {
        width: dimensions.width,
        height: dimensions.height,
        renderTime: Date.now() - startTime,
        celestialObjectsCount: celestialObjects.length
      })

      return {
        success: true,
        filePath: saveResult.filePath,
        thumbnailPath: saveResult.thumbnailPath,
        fileSize: saveResult.fileSize,
        metadata: {
          width: dimensions.width,
          height: dimensions.height,
          dpi: 300,
          format: config.format,
          renderTime: Date.now() - startTime
        }
      }
    } catch (error) {
      await progressService.failProgress(config.jobId, (error as Error).message)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  /**
   * Calculate celestial positions for given time and location
   */
  async calculateCelestialPositions(
    timestamp: string,
    lat: number,
    lon: number
  ): Promise<CelestialObject[]> {
    const observationTime = new Date(timestamp)
    const objects: CelestialObject[] = []

    // Calculate Julian Day
    const jd = this.calculateJulianDay(observationTime)
    
    // Add stars from catalog
    const stars = await this.fetchStarCatalog(6.5)
    objects.push(...stars)

    // Calculate moon position
    const moonPosition = this.calculateMoonPosition(jd, lat, lon)
    objects.push(moonPosition)

    // Calculate planet positions
    const planets = this.calculatePlanetPositions(jd, lat, lon)
    objects.push(...planets)

    // Apply stereographic projection
    const projectedObjects = this.applyStereographicProjection(
      objects,
      lat,
      lon
    )

    return projectedObjects
  }

  /**
   * Fetch star catalog (simulated for now)
   */
  async fetchStarCatalog(minMagnitude: number): Promise<CelestialObject[]> {
    const cacheKey = dataService.generateCacheKey('star_catalog', { minMagnitude })
    
    // Try cache first
    const cached = await dataService.getFromCache<CelestialObject[]>(cacheKey)
    if (cached) {
      console.log('Using cached star catalog')
      return cached
    }

    // Simulated star catalog
    const stars: CelestialObject[] = [
      { id: 'sirius', type: 'star', name: 'Sirius', magnitude: -1.46, position: { ra: 101.287, dec: -16.716 } },
      { id: 'canopus', type: 'star', name: 'Canopus', magnitude: -0.74, position: { ra: 95.988, dec: -52.696 } },
      { id: 'arcturus', type: 'star', name: 'Arcturus', magnitude: -0.05, position: { ra: 213.915, dec: 19.182 } },
      { id: 'vega', type: 'star', name: 'Vega', magnitude: 0.03, position: { ra: 279.234, dec: 38.784 } },
    ]

    // Cache for 24 hours
    await dataService.setCache(cacheKey, stars, 24 * 60 * 60 * 1000)
    
    console.log(`Fetched ${stars.length} stars from catalog`)
    return stars
  }

  /**
   * Calculate moon position
   */
  private calculateMoonPosition(jd: number, lat: number, lon: number): CelestialObject {
    const T = (jd - 2451545.0) / 36525.0
    const L = (280.460 + 360.985647 * T) % 360
    const M = (357.528 + 359.229 * T) % 360
    
    const moonLongitude = (L + 6.289 * Math.sin(M * Math.PI / 180)) % 360
    const moonLatitude = 5.128 * Math.sin(M * Math.PI / 180)
    
    return {
      id: 'moon',
      type: 'moon',
      name: 'Moon',
      magnitude: -12.6,
      position: {
        ra: moonLongitude,
        dec: moonLatitude
      }
    }
  }

  /**
   * Calculate planet positions
   */
  private calculatePlanetPositions(jd: number, lat: number, lon: number): CelestialObject[] {
const planets: CelestialObject[] = [
      { id: 'mercury', type: 'planet' as const, name: 'Mercury', magnitude: 8.23, position: { ra: 120, dec: 10 } },
      { id: 'venus', type: 'planet' as const, name: 'Venus', magnitude: -3.99, position: { ra: 180, dec: 15 } },
      { id: 'mars', type: 'planet' as const, name: 'Mars', magnitude: -0.56, position: { ra: 240, dec: -20 } },
      { id: 'jupiter', type: 'planet' as const, name: 'Jupiter', magnitude: -2.94, position: { ra: 300, dec: 5 } },
      { id: 'saturn', type: 'planet' as const, name: 'Saturn', magnitude: -8.88, position: { ra: 60, dec: -10 } },
    ]

    return planets
  }

  /**
   * Apply stereographic projection
   */
  private applyStereographicProjection(
    objects: CelestialObject[],
    lat: number,
    lon: number
  ): CelestialObject[] {
    return objects.map(obj => {
      const { ra, dec } = obj.position
      
      const hourAngle = this.getLocalSiderealTime(lat, lon) - ra
      const altitude = Math.asin(
        Math.sin(dec * Math.PI / 180) * Math.sin(lat * Math.PI / 180) +
        Math.cos(dec * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.cos(hourAngle * Math.PI / 180)
      )
      
      const azimuth = Math.atan2(
        Math.sin(hourAngle * Math.PI / 180),
        Math.cos(hourAngle * Math.PI / 180) * Math.tan(lat * Math.PI / 180) -
        Math.tan(dec * Math.PI / 180) / Math.cos(lat * Math.PI / 180)
      )

      // Stereographic projection
      const r = 180 / 2 / Math.tan((90 - altitude * 180 / Math.PI) / 2)
      const x = r * Math.sin(azimuth * Math.PI / 180)
      const y = r * Math.cos(azimuth * Math.PI / 180)

      return {
        ...obj,
        projected: { x, y }
      }
    })
  }

  /**
   * Calculate local sidereal time
   */
  private getLocalSiderealTime(lat: number, lon: number): number {
    const now = new Date()
    const jd = this.calculateJulianDay(now)
    
    const T = (jd - 2451545.0) / 36525.0
    const L0 = (280.46061837 + 360.98564736629 * T) % 360
    const LST = (L0 + lon) % 360
    
    return LST
  }

  /**
   * Calculate Julian Day
   */
  private calculateJulianDay(date: Date): number {
    const a = Math.floor((14 - date.getMonth()) / 12)
    const y = date.getFullYear() + 4800 - a
    const m = date.getMonth() + 12 * a - 3
    
    return date.getDate() + Math.floor((153 * m + 2) / 5) + 365 * a + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045
  }

  /**
   * Render night sky poster content
   */
  private async renderNightSkyPosterContent(
    config: NightSkyConfig,
    celestialObjects: CelestialObject[],
    theme: NightSkyTheme,
    dimensions: { width: number; height: number }
  ): Promise<{ svgContent: string; width: number; height: number }> {
    
    const { width, height } = dimensions
    
    let svgContent = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${theme.bg}"/>
    `
    
    // Add celestial objects
    celestialObjects.forEach(obj => {
      if (obj.projected) {
        if (obj.type === 'star') {
          const size = this.getStarSize(obj.magnitude)
          const color = this.getStarColor(obj.magnitude, theme)
          
          svgContent += `
            <circle cx="${obj.projected.x}" cy="${obj.projected.y}" r="${size}" 
                    fill="${color}" opacity="0.9"/>
          `
        } else if (obj.type === 'planet') {
          const size = this.getPlanetSize(obj.id)
          const color = theme.planets[obj.id as keyof typeof theme.planets] || '#FFFFFF'
          
          svgContent += `
            <circle cx="${obj.projected.x}" cy="${obj.projected.y}" r="${size}" 
                    fill="${color}" stroke="${theme.text}" stroke-width="1"/>
          `
        } else if (obj.type === 'moon') {
          const size = 15
          
          svgContent += `
            <circle cx="${obj.projected.x}" cy="${obj.projected.y}" r="${size}" 
                    fill="${theme.moon}" opacity="0.8"/>
          `
        }
      }
    })
    
    svgContent += '</svg>'

    return { svgContent, width, height }
  }

  /**
   * Get star size based on magnitude
   */
  private getStarSize(magnitude: number): number {
    const maxSize = 4
    const minSize = 0.5
    const size = Math.max(minSize, maxSize * Math.exp(-magnitude * 0.3))
    return Math.min(size, maxSize)
  }

  /**
   * Get star color based on magnitude
   */
  private getStarColor(magnitude: number, theme: NightSkyTheme): string {
    const colorScheme = theme.stars
    if (magnitude < 0) return colorScheme.bright
    if (magnitude < 2) return colorScheme.main
    return colorScheme.dim
  }

  /**
   * Get planet size
   */
  private getPlanetSize(planetId: string): number {
    const sizes: Record<string, number> = {
      mercury: 3,
      venus: 5,
      earth: 5,
      mars: 4,
      jupiter: 12,
      saturn: 10,
      uranus: 7,
      neptune: 7
    }
    return sizes[planetId] || 5
  }

  /**
   * Calculate poster dimensions
   */
  private calculateDimensions(config: NightSkyConfig): { width: number; height: number } {
    if (config.widthCm && config.heightCm) {
      return {
        width: Math.round(config.widthCm / 2.54 * 300),
        height: Math.round(config.heightCm / 2.54 * 300)
      }
    }
    
    // Default to square for night sky
    const defaultSize = 3600 // 12 inches at 300 DPI
    return { width: defaultSize, height: defaultSize }
  }

  /**
   * Load night sky theme
   */
  private async loadTheme(themeName: string): Promise<NightSkyTheme> {
    const defaultTheme: NightSkyTheme = {
      name: 'Night Sky',
      bg: '#000814',
      text: '#FFFFFF',
      stars: {
        main: '#FFFFFF',
        bright: '#FFE4B5',
        dim: '#B8D4E3'
      },
      planets: {
        mercury: '#8C7853',
        venus: '#FFC649',
        earth: '#4169E1',
        mars: '#CD5C5C',
        jupiter: '#DAA520',
        saturn: '#F4E7D7',
        uranus: '#4FD0E7',
        neptune: '#4B70DD'
      },
      moon: '#F0F0F0',
      constellations: '#4682B4',
      grid: '#333333',
      fonts: {
        bold: 'fonts/Roboto/Roboto-Bold.ttf',
        regular: 'fonts/Roboto/Roboto-Regular.ttf',
        light: 'fonts/Roboto/Roboto-Light.ttf'
      }
    }

    return defaultTheme
  }

  /**
   * Save poster to file and generate thumbnail
   */
  private async savePoster(
    renderResult: { svgContent: string; width: number; height: number },
    config: NightSkyConfig
  ): Promise<{ filePath: string; thumbnailPath: string; fileSize: number }> {
    try {
      const fs = await import('fs/promises')
      await fs.mkdir(this.outputDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }
    
    const posterId = config.posterId
    const format = config.format || 'png'
    
    const filePath = `${this.outputDir}/${posterId}.${format}`
    const thumbnailPath = `${this.outputDir}/${posterId}_thumb.png`
    
    let fileSize = 0
    if (format === 'svg') {
      const svgBuffer = Buffer.from(renderResult.svgContent, 'utf8')
      await Bun.write(filePath, svgBuffer)
      fileSize = svgBuffer.length
    } else {
      fileSize = renderResult.svgContent.length
      await Bun.write(filePath, renderResult.svgContent)
    }
    
    // Generate thumbnail
    await this.generateThumbnail(renderResult.svgContent, thumbnailPath)
    
    return {
      filePath,
      thumbnailPath,
      fileSize
    }
  }

  /**
   * Generate thumbnail
   */
  private async generateThumbnail(svgContent: string, thumbnailPath: string): Promise<void> {
    const scale = 0.25
    const thumbnailSVG = svgContent.replace(
      /width="(\d+)"/,
      `width="${Math.floor(3600 * scale)}"`
    ).replace(
      /height="(\d+)"/,
      `height="${Math.floor(3600 * scale)}"`
    )
    
    await Bun.write(thumbnailPath, thumbnailSVG)
  }

  /**
   * Get progress for job
   */
  async getProgress(jobId: string): Promise<PosterProgress | null> {
    return progressService.getProgress(jobId)
  }

  /**
   * Render night sky poster (interface requirement)
   */
  async renderNightSkyPoster(config: NightSkyConfig): Promise<PosterResult> {
    return this.createPoster(config)
  }
}

// Singleton instance
export const nightSkyService = new NightSkyService()