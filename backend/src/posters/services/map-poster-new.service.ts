import { IMapPosterService, PosterResult } from '../interfaces'
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
    if (!config.lat || !config.lon) {
      throw new Error('Coordinates are required')
    }
    return true
  }

  /**
   * Create map poster (main entry point)
   */
  async createPoster(config: MapPosterConfig): Promise<PosterResult> {
    const startTime = Date.now()
    
    try {
      await progressService.updateProgress(
        config.jobId,
        'fetching_data',
        'Getting coordinates...',
        5
      )

      // Get coordinates
      let lat = config.lat
      let lon = config.lon
      
      if (config.googleMapsUrl) {
        const coords = this.parseGoogleMapsURL(config.googleMapsUrl)
        lat = coords.lat
        lon = coords.lon
      }

      await progressService.updateProgress(
        config.jobId,
        'downloading_streets',
        'Downloading street network...',
        15
      )

      const streetNetwork = await this.fetchStreetNetwork(lat, lon, config.distance || 29000)

      await progressService.updateProgress(
        config.jobId,
        'downloading_parks',
        'Downloading parks and green spaces...',
        35
      )

      const parks = await this.fetchFeatures(lat, lon, config.distance || 29000, 'parks')

      await progressService.updateProgress(
        config.jobId,
        'downloading_water',
        'Downloading water features...',
        55
      )

      const water = await this.fetchFeatures(lat, lon, config.distance || 29000, 'water')

      await progressService.updateProgress(
        config.jobId,
        'rendering',
        'Rendering map...',
        70
      )

      // Load theme
      const theme = await this.loadTheme(config.theme)
      
      // Calculate dimensions
      const dimensions = this.calculateDimensions(config)
      
      // Render poster
      const renderResult = await this.renderMapContent(config, streetNetwork, parks, water, theme, dimensions)

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
        renderTime: Date.now() - startTime
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

  /**
   * Render map poster (interface requirement)
   */
  async renderMapPoster(config: MapPosterConfig): Promise<PosterResult> {
    return this.createPoster(config)
  }

  /**
   * Render map poster content
   */
  private async renderMapContent(
    config: MapPosterConfig,
    streetNetwork: StreetNetwork,
    parks: GeoFeature[],
    water: GeoFeature[],
    theme: MapTheme,
    dimensions: { width: number; height: number }
  ): Promise<{ svgContent: string; width: number; height: number }> {
    
    // Create placeholder SVG content
    const { width, height } = dimensions
    
    const svgContent = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${theme.bg}"/>
        <text x="50%" y="30%" text-anchor="middle" dominant-baseline="middle" 
              fill="${theme.text}" font-family="Arial" font-size="${width * 0.02}">
          ${(config.city || 'Custom Location').toUpperCase()}
        </text>
        <text x="50%" y="40%" text-anchor="middle" dominant-baseline="middle" 
              fill="${theme.text}" font-family="Arial" font-size="${width * 0.015}" opacity="0.7">
          ${config.country || ''}
        </text>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" 
              fill="${theme.text}" font-family="Arial" font-size="${width * 0.01}" opacity="0.5">
          Streets: ${streetNetwork.nodes.length}
        </text>
      </svg>
    `

    return { svgContent, width, height }
  }

  /**
   * Calculate poster dimensions
   */
  private calculateDimensions(config: MapPosterConfig): { width: number; height: number } {
    if (config.widthCm && config.heightCm) {
      return {
        width: Math.round(config.widthCm / 2.54 * 300), // Convert cm to pixels at 300 DPI
        height: Math.round(config.heightCm / 2.54 * 300)
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
          elevation: match[3] ? parseInt(match[3]) : undefined
        }
      }
    }

    throw new Error('Could not extract coordinates from Google Maps URL')
  }

  /**
   * Save poster to file and generate thumbnail
   */
  private async savePoster(
    renderResult: { svgContent: string; width: number; height: number },
    config: MapPosterConfig
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
      // For PNG/PDF, we would use a proper conversion library
      // For now, save as SVG with PNG extension as placeholder
      fileSize = renderResult.svgContent.length
      await Bun.write(filePath, renderResult.svgContent)
    }
    
    // Generate thumbnail
    await this.generateThumbnail(renderResult.svgContent, thumbnailPath, config.landscape || false)
    
    return {
      filePath,
      thumbnailPath,
      fileSize
    }
  }

  /**
   * Generate thumbnail
   */
  private async generateThumbnail(svgContent: string, thumbnailPath: string, isLandscape: boolean): Promise<void> {
    const scale = 0.25
    const thumbnailSVG = svgContent.replace(
      /width="(\d+)"/,
      `width="${Math.floor(3600 * scale)}"`
    ).replace(
      /height="(\d+)"/,
      `height="${Math.floor(4800 * scale)}"`
    )
    
    await Bun.write(thumbnailPath, thumbnailSVG)
  }
}

// Singleton instance
export const mapPosterService = new MapPosterService()