import type { IMapPosterService, PosterResult } from '../interfaces'
import { mapDataService } from './map-data.service'
import { progressService } from './progress.service'
import { dataService } from './data.service'
import type { StreetNetwork, GeoFeature, MapTheme, MapPosterConfig, PosterProgress } from '../types'

/**
 * Map poster rendering service using D3.js
 */
export class MapPosterService implements IMapPosterService {
  private readonly outputDir = 'posters'

  /**
   * Validate map poster configuration
   */
  async validate(config: MapPosterConfig): Promise<boolean> {
    // Basic validation
    if (!config.lat || !config.lon) {
      throw new Error('Coordinates are required')
    }
    
    if (config.lat < -90 || config.lat > 90) {
      throw new Error('Latitude must be between -90 and 90')
    }
    
    if (config.lon < -180 || config.lon > 180) {
      throw new Error('Longitude must be between -180 and 180')
    }
    
    if (!config.theme) {
      throw new Error('Theme is required')
    }

    return true
  }

  /**
   * Create map poster (main entry point)
   */
  async createPoster(config: MapPosterConfig): Promise<PosterResult> {
    const startTime = Date.now()
    
    try {
      // Validate configuration
      await this.validate(config)
      
      await progressService.updateProgress(
        config.jobId,
        'fetching_data',
        'Getting coordinates...',
        5
      )

      // Load theme
      const theme = await this.loadTheme(config.theme)
      
      // Get coordinates from Google Maps URL if provided
      let lat = config.lat
      let lon = config.lon
      
      if (config.googleMapsUrl) {
        const coords = this.parseGoogleMapsURL(config.googleMapsUrl)
        lat = coords.lat
        lon = coords.lon
        
        if (coords.elevation && config.distance === 29000) {
          config.distance = coords.elevation / 2
        }
      }

      await progressService.updateProgress(
        config.jobId,
        'downloading_streets',
        'Downloading street network...',
        15
      )

      // Fetch data
      const streetNetwork = await mapDataService.fetchStreetNetwork(
        lat,
        lon,
        config.distance || 29000
      )

      await progressService.updateProgress(
        config.jobId,
        'downloading_parks',
        'Downloading parks and green spaces...',
        35
      )

      const parks = config.waterFeatures !== false 
        ? await mapDataService.fetchFeatures(lat, lon, config.distance || 29000, 'parks')
        : []

      await progressService.updateProgress(
        config.jobId,
        'downloading_water',
        'Downloading water features...',
        55
      )

      const water = config.waterFeatures !== false
        ? await mapDataService.fetchFeatures(lat, lon, config.distance || 29000, 'water')
        : []

      await progressService.updateProgress(
        config.jobId,
        'rendering',
        'Rendering map...',
        70
      )

      // Calculate dimensions
      const dimensions = this.calculateDimensions(config)
      
      // Render poster
      const result = await this.renderMapPoster(
        config,
        streetNetwork,
        parks,
        water
      )

      await progressService.updateProgress(
        config.jobId,
        'saving',
        'Saving poster...',
        90
      )

      // Save files
      const saveResult = await this.savePoster(result, config)
      
      await progressService.completeProgress(config.jobId, saveResult.filePath, {
        width: dimensions.width,
        height: dimensions.height,
        renderTime: Date.now() - startTime,
        ...saveResult.metadata
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
   * Render map poster using D3.js
   */
  private async renderMapPoster(config: MapPosterConfig, streetNetwork: StreetNetwork, parks: GeoFeature[], water: GeoFeature[]): Promise<{ svgContent: string; width: number; height: number }> {
    // This is where we'll implement D3.js rendering
    // For now, return a placeholder SVG
    const dimensions = this.calculateDimensions(config)
    
    let svgContent = `
      <svg width="${dimensions.width}" height="${dimensions.height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${config.theme || '#FFFFFF'}"/>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" 
              fill="${config.theme || '#000000'}" font-family="Arial" font-size="24">
          Map Poster for ${config.city || 'Custom Location'}
        </text>
      </svg>
    `

    // Apply rotation if specified
    if (config.rotation && config.rotation !== 0) {
      svgContent = this.applyRotation(svgContent, config.rotation)
    }

    return { svgContent, width: dimensions.width, height: dimensions.height }
  }

  /**
   * Save poster to file and generate thumbnail
   */
  private async savePoster(
    renderResult: { svgContent: string; width: number; height: number },
    config: MapPosterConfig
  ): Promise<{ filePath: string; thumbnailPath: string; fileSize: number; metadata: any }> {
    // Ensure output directory exists
    await this.ensureDirectory(this.outputDir)
    
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
      // For PNG/PDF, we would use a headless browser or canvas
      // For now, save as PNG with basic conversion
      fileSize = await this.convertToPNG(renderResult.svgContent, filePath)
    }
    
    // Generate thumbnail
    await this.generateThumbnail(renderResult.svgContent, thumbnailPath, config.landscape || false)
    
    return {
      filePath,
      thumbnailPath,
      fileSize,
      metadata: {
        svgSize: renderResult.svgContent.length,
        aspectRatio: renderResult.width / renderResult.height
      }
    }
  }

  /**
   * Calculate poster dimensions
   */
  private calculateDimensions(config: MapPosterConfig): { width: number; height: number } {
    if (config.widthCm && config.heightCm) {
      return {
        width: config.widthCm / 2.54 * 300, // Convert cm to pixels at 300 DPI
        height: config.heightCm / 2.54 * 300
      }
    }
    
    if (config.landscape) {
      return { width: 4800, height: 3600 } // 16" x 12" at 300 DPI
    } else {
      return { width: 3600, height: 4800 } // 12" x 16" at 300 DPI
    }
  }

  /**
   * Load theme from file system
   */
  private async loadTheme(themeName: string): Promise<MapTheme> {
    const themePath = `../maptoposter/themes/${themeName}.json`
    
    try {
      const themeFile = Bun.file(themePath)
      const themeContent = await themeFile.text()
      const theme = JSON.parse(themeContent)
      
      // Add default fonts if not specified
      if (!theme.fonts) {
        theme.fonts = {
          bold: 'fonts/Roboto/Roboto-Bold.ttf',
          regular: 'fonts/Roboto/Roboto-Regular.ttf',
          light: 'fonts/Roboto/Roboto-Light.ttf'
        }
      }
      
      return theme
    } catch (error) {
      console.warn(`Theme ${themeName} not found, using default`)
      return this.getDefaultTheme()
    }
  }

  /**
   * Get default theme
   */
  private getDefaultTheme(): MapTheme {
    return {
      name: 'Feature-Based Shading',
      bg: '#FFFFFF',
      text: '#000000',
      gradient_color: '#FFFFFF',
      water: '#C0C0C0',
      parks: '#F0F0F0',
      road_motorway: '#0A0A0A',
      road_primary: '#1A1A1A',
      road_secondary: '#2A2A2A',
      road_tertiary: '#3A3A3A',
      road_residential: '#4A4A4A',
      road_default: '#3A3A3A',
      fonts: {
        bold: 'fonts/Roboto/Roboto-Bold.ttf',
        regular: 'fonts/Roboto/Roboto-Regular.ttf',
        light: 'fonts/Roboto/Roboto-Light.ttf'
      }
    }
  }

  /**
   * Parse Google Maps URL
   */
  private parseGoogleMapsURL(url: string): { lat: number; lon: number; elevation?: number } {
    const patterns = [
      /@(-?\d+\.\d+),(-?\d+\.\d+),(\d+)m/,
      /@(-?\d+\.\d+),(-?\d+\.\d+),(\d+\.?\d*)z/,
      /3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        return {
          lat: parseFloat(match[1]),
          lon: parseFloat(match[2]),
          elevation: match[3] ? parseInt(match[3]!) : undefined
        }
      }
    }

    throw new Error('Could not extract coordinates from Google Maps URL')
  }

  /**
   * Apply rotation to SVG content
   */
  private applyRotation(svgContent: string, angle: number): string {
    return `<!-- Rotated ${angle} degrees -->${svgContent}<!-- End rotation -->`
  }

  /**
   * Convert SVG to PNG (placeholder implementation)
   */
  private async convertToPNG(svgContent: string, filePath: string): Promise<number> {
    // This would use a proper SVG to PNG conversion in production
    // For now, save as SVG with .png extension
    const buffer = Buffer.from(svgContent, 'utf8')
    await Bun.write(filePath, buffer)
    return buffer.length
  }

  /**
   * Generate thumbnail
   */
  private async generateThumbnail(svgContent: string, thumbnailPath: string, isLandscape: boolean): Promise<void> {
    const scale = isLandscape ? 0.25 : 0.25
    // Simple thumbnail generation - would use proper image processing in production
    const thumbnailSVG = svgContent.replace(
      /width="(\d+)"/,
      `width="${Math.floor(4800 * scale)}"`
    ).replace(
      /height="(\d+)"/,
      `height="${Math.floor(3600 * scale)}"`
    )
    
    await Bun.write(thumbnailPath, thumbnailSVG)
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectory(dir: string): Promise<void> {
    try {
      const fs = await import('fs/promises')
      await fs.mkdir(dir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }
  }

  /**
   * Get progress for job
   */
  async getProgress(jobId: string): Promise<PosterProgress | null> {
    return progressService.getProgress(jobId)
  }

  /**
   * Fetch street network (delegate to map data service)
   */
  async fetchStreetNetwork(lat: number, lon: number, distance: number): Promise<StreetNetwork> {
    return mapDataService.fetchStreetNetwork(lat, lon, distance)
  }

  /**
   * Fetch features (delegate to map data service)
   */
  async fetchFeatures(lat: number, lon: number, distance: number, type: 'water' | 'parks'): Promise<GeoFeature[]> {
    return mapDataService.fetchFeatures(lat, lon, distance, type)
  }


}

// Singleton instance
export const mapPosterService = new MapPosterService()