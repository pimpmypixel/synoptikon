import { INightSkyService, PosterResult } from '../interfaces'
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
    
    if (!config.projection) {
      throw new Error('Projection configuration is required')
    }

    // Validate timestamp
    const timestamp = new Date(config.timestamp)
    if (isNaN(timestamp.getTime())) {
      throw new Error('Invalid timestamp format')
    }

    return true
  }

  /**
   * Create night sky poster (main entry point)
   */
  async createPoster(config: NightSkyConfig): Promise<PosterResult> {
    const startTime = Date.now()
    
    try {
      // Validate configuration
      await this.validate(config)
      
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
      const renderResult = await this.renderNightSkyPoster(config, celestialObjects, theme, dimensions)

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
  async calculateCelestialPositions(timestamp: string, lat: number, lon: number): Promise<CelestialObject[]> {
    // For the interface, we need to access the config's celestial objects
    // In a real implementation, this would be passed as a parameter or stored in the config
    const celestialConfig = {
      stars: true,
      planets: true,
      moon: true,
      constellations: true,
      deepSkyObjects: false,
    }
    const observationTime = new Date(timestamp)
    const objects: CelestialObject[] = []

    // Calculate Julian Day
    const jd = this.calculateJulianDay(observationTime)
    
    if (celestialConfig.stars) {
      // Add stars from catalog
      const stars = await this.fetchStarCatalog(celestialConfig.styling?.starMagnitudes?.minMagnitude || 6.5)
      objects.push(...stars)
    }

    if (celestialConfig.moon) {
      // Calculate moon position
      const moonPosition = this.calculateMoonPosition(jd, lat, lon)
      objects.push(moonPosition)
    }

    if (celestialConfig.planets) {
      // Calculate planet positions
      const planets = this.calculatePlanetPositions(jd, lat, lon)
      objects.push(...planets)
    }

    // Apply stereographic projection
    const projectedObjects = this.applyStereographicProjection(
      objects,
      lat,
      lon,
      config.projection
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

    // Simulated star catalog - in production, this would load from a real catalog
    const stars: CelestialObject[] = [
      // Bright stars
      { id: 'sirius', type: 'star', name: 'Sirius', magnitude: -1.46, position: { ra: 101.287, dec: -16.716 } },
      { id: 'canopus', type: 'star', name: 'Canopus', magnitude: -0.74, position: { ra: 95.988, dec: -52.696 } },
      { id: 'arcturus', type: 'star', name: 'Arcturus', magnitude: -0.05, position: { ra: 213.915, dec: 19.182 } },
      { id: 'vega', type: 'star', name: 'Vega', magnitude: 0.03, position: { ra: 279.234, dec: 38.784 } },
      { id: 'capella', type: 'star', name: 'Capella', magnitude: 0.08, position: { ra: 79.172, dec: 45.998 } },
      { id: 'rigel', type: 'star', name: 'Rigel', magnitude: 0.13, position: { ra: 78.634, dec: -8.202 } },
      { id: 'procyon', type: 'star', name: 'Procyon', magnitude: 0.37, position: { ra: 114.826, dec: 5.225 } },
      
      // Medium stars
      { id: 'altair', type: 'star', name: 'Altair', magnitude: 0.77, position: { ra: 297.696, dec: 8.868 } },
      { id: 'betelgeuse', type: 'star', name: 'Betelgeuse', magnitude: 0.42, position: { ra: 88.793, dec: 7.407 } },
      { id: 'aldebaran', type: 'star', name: 'Aldebaran', magnitude: 0.85, position: { ra: 68.980, dec: 16.509 } },
      { id: 'spica', type: 'star', name: 'Spica', magnitude: 0.97, position: { ra: 201.298, dec: -11.161 } },
      { id: 'antares', type: 'star', name: 'Antares', magnitude: 1.09, position: { ra: 247.352, dec: -26.432 } },
      
      // Fainter stars
      { id: 'polaris', type: 'star', name: 'Polaris', magnitude: 1.98, position: { ra: 37.954, dec: 89.264 } },
      { id: 'deneb', type: 'star', name: 'Deneb', magnitude: 1.25, position: { ra: 310.358, dec: 45.280 } },
      { id: 'regulus', type: 'star', name: 'Regulus', magnitude: 1.35, position: { ra: 152.094, dec: 11.967 } },
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
    // Simplified moon position calculation
    // In production, use precise astronomical algorithms
    const T = (jd - 2451545.0) / 36525.0
    const L = (280.460 + 360.985647 * T) % 360 // Mean longitude
    const M = (357.528 + 359.229 * T) % 360 // Mean anomaly
    
    // Simplified calculation for demonstration
    const moonLongitude = (L + 6.289 * Math.sin(M * Math.PI / 180)) % 360
    const moonLatitude = 5.128 * Math.sin(M * Math.PI / 180)
    
    return {
      id: 'moon',
      type: 'moon',
      name: 'Moon',
      magnitude: -12.6, // Approximate full moon magnitude
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
    // Simplified planet positions
    // In production, use precise ephemeris data
    const planets = [
      { id: 'mercury', type: 'planet', name: 'Mercury', magnitude: -0.42, position: { ra: 150, dec: 10 } },
      { id: 'venus', type: 'planet', name: 'Venus', magnitude: -4.40, position: { ra: 200, dec: 15 } },
      { id: 'mars', type: 'planet', name: 'Mars', magnitude: -2.94, position: { ra: 120, dec: 20 } },
      { id: 'jupiter', type: 'planet', name: 'Jupiter', magnitude: -9.40, position: { ra: 80, dec: -5 } },
      { id: 'saturn', type: 'planet', name: 'Saturn', magnitude: -8.88, position: { ra: 60, dec: -10 } },
    ]

    return planets
  }

  /**
   * Apply stereographic projection
   */
  private applyStereographicProjection(
    objects: CelestialObject[],
    lat: number,
    lon: number,
    projection: NightSkyConfig['projection']
  ): CelestialObject[] {
    return objects.map(obj => {
      const { ra, dec } = obj.position
      
      // Convert to local coordinates
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
      const r = projection.fov / 2 / Math.tan((90 - altitude * 180 / Math.PI) / 2)
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
    
    // Simplified LST calculation
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
  private async renderNightSkyPoster(
    config: NightSkyConfig,
    celestialObjects: CelestialObject[],
    theme: NightSkyTheme,
    dimensions: { width: number; height: number }
  ): Promise<{ svgContent: string; width: number; height: number }> {
    
    const { width, height } = dimensions
    
    // Create SVG content for night sky
    let svgContent = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${theme.bg}"/>
    `
    
    // Add stars
    celestialObjects.forEach(obj => {
      if (obj.type === 'star' && obj.projected) {
        const size = this.getStarSize(obj.magnitude)
        const color = this.getStarColor(obj.magnitude, theme)
        
        svgContent += `
          <circle cx="${obj.projected.x}" cy="${obj.projected.y}" r="${size}" 
                  fill="${color}" opacity="0.9"/>
        `
      } else if (obj.type === 'planet' && obj.projected) {
        const size = this.getPlanetSize(obj.id)
        const color = theme.planets[obj.id as keyof typeof theme.planets] || '#FFFFFF'
        
        svgContent += `
          <circle cx="${obj.projected.x}" cy="${obj.projected.y}" r="${size}" 
                  fill="${color}" stroke="${theme.text}" stroke-width="1"/>
        `
      } else if (obj.type === 'moon' && obj.projected) {
        const size = 15
        const phase = this.getMoonPhase(new Date(config.timestamp))
        
        svgContent += `
          <circle cx="${obj.projected.x}" cy="${obj.projected.y}" r="${size}" 
                  fill="${theme.moon}" opacity="${phase.illumination}"/>
        `
      }
    })
    
    // Add grid lines if enabled
    if (config.styling?.gridLines) {
      svgContent += this.generateGridLines(width, height, theme)
    }
    
    svgContent += '</svg>'

    return { svgContent, width, height }
  }

  /**
   * Get star size based on magnitude
   */
  private getStarSize(magnitude: number): number {
    // Brighter stars are larger
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
   * Calculate moon phase
   */
  private getMoonPhase(date: Date): { phase: string; illumination: number } {
    // Simplified moon phase calculation
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    
    // Simple approximation for demonstration
    const phase = ((year + month + day) % 30) / 30
    const illumination = Math.abs(Math.cos(phase * 2 * Math.PI))
    
    return {
      phase: illumination > 0.5 ? 'Full' : illumination > 0.25 ? 'First Quarter' : 'New',
      illumination
    }
  }

  /**
   * Generate grid lines
   */
  private generateGridLines(width: number, height: number, theme: NightSkyTheme): string {
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) / 2
    
    let gridSVG = ''
    
    // Concentric circles for altitude
    for (let alt = 0; alt <= 90; alt += 30) {
      const r = radius * (1 - alt / 90)
      gridSVG += `
        <circle cx="${centerX}" cy="${centerY}" r="${r}" 
                fill="none" stroke="${theme.grid}" stroke-width="0.5" opacity="0.3"/>
      `
    }
    
    // Radial lines for azimuth
    for (let az = 0; az < 360; az += 45) {
      const x2 = centerX + radius * Math.sin(az * Math.PI / 180)
      const y2 = centerY - radius * Math.cos(az * Math.PI / 180)
      
      gridSVG += `
        <line x1="${centerX}" y1="${centerY}" x2="${x2}" y2="${y2}" 
              stroke="${theme.grid}" stroke-width="0.5" opacity="0.3"/>
      `
    }
    
    return gridSVG
  }

  /**
   * Calculate poster dimensions
   */
  private calculateDimensions(config: NightSkyConfig): { width: number; height: number } {
    if (config.widthCm && config.heightCm) {
      return {
        width: Math.round(config.widthCm / 2.54 * 300), // Convert cm to pixels at 300 DPI
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
    // Default night sky theme
    const defaultTheme: NightSkyTheme = {
      name: 'Night Sky',
      bg: '#000814', // Deep blue
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

    // Try to load custom theme (for now, return default)
    try {
      const themePath = `themes/night-sky/${themeName}.json`
      const themeFile = Bun.file(themePath)
      if (await themeFile.exists()) {
        const themeContent = await themeFile.text()
        return JSON.parse(themeContent)
      }
    } catch (error) {
      console.warn(`Night sky theme ${themeName} not found, using default`)
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
    // Ensure output directory exists
    try {
      const fs = await import('fs/promises')
      await fs.mkdir(this.outputDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }
    
    const posterId = config.posterId
    const format = config.format || 'png'
    
    // Main file path
    const filePath = `${this.outputDir}/${posterId}.${format}`
    
    // Thumbnail path
    const thumbnailPath = `${this.outputDir}/${posterId}_thumb.png`
    
    // Save main poster
    let fileSize = 0
    if (format === 'svg') {
      const svgBuffer = Buffer.from(renderResult.svgContent, 'utf8')
      await Bun.write(filePath, svgBuffer)
      fileSize = svgBuffer.length
    } else {
      // For PNG/PDF, save as SVG for now
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
}

// Singleton instance
export const nightSkyService = new NightSkyService()