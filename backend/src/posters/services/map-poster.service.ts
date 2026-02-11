import type { IMapPosterService, PosterResult } from '../interfaces'
import { mapDataService } from './map-data.service'
import { progressService } from './progress.service'
import type { StreetNetwork, GeoFeature, MapTheme, MapPosterConfig, PosterProgress } from '../types'
import fs from 'fs/promises'
import path from 'path'
import { Resvg } from '@resvg/resvg-js'
import { svgToPdfBuffer } from './pdf.service'

/**
 * Map poster rendering service using D3.js
 */
export class MapPosterService implements IMapPosterService {

  /**
   * Validate map poster configuration
   */
  async validate(config: MapPosterConfig): Promise<boolean> {
    if (!config.lat && !config.lon && !config.googleMapsUrl) {
      throw new Error('Coordinates or Google Maps URL are required')
    }
    return true
  }

  /**
   * Resolve lat/lon from config, parsing googleMapsUrl if needed
   */
  private resolveCoordinates(config: MapPosterConfig): { lat: number; lon: number } {
    if (config.googleMapsUrl) {
      const coords = this.parseGoogleMapsURL(config.googleMapsUrl)
      return coords
    }
    if (config.lat != null && config.lon != null) {
      return { lat: config.lat, lon: config.lon }
    }
    throw new Error('Coordinates are required')
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

      const { lat, lon } = this.resolveCoordinates(config)

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
    
    const { width, height } = dimensions
    const margin = { top: 40, right: 40, bottom: 60, left: 40 }
    const mapWidth = width - margin.left - margin.right
    const mapHeight = height - margin.top - margin.bottom
    
    // Create SVG with D3-style rendering
    let svgElements: string[] = []
    
    // Background
    svgElements.push(`<rect width="100%" height="100%" fill="${theme.bg}"/>`)
    
    // Title area
    svgElements.push(`<text x="${width/2}" y="25" text-anchor="middle" dominant-baseline="middle" 
          fill="${theme.text}" font-family="Arial" font-size="20" font-weight="bold">
        ${(config.city || 'Custom Location').toUpperCase()}
      </text>`)
    
    if (config.country) {
      svgElements.push(`<text x="${width/2}" y="45" text-anchor="middle" dominant-baseline="middle" 
            fill="${theme.text}" font-family="Arial" font-size="14" opacity="0.8">
          ${config.country}
        </text>`)
    }
    
    // Map area background
    svgElements.push(`<rect x="${margin.left}" y="${margin.top}" width="${mapWidth}" height="${mapHeight}" 
          fill="${theme.bg}" stroke="${theme.text}" stroke-width="1" opacity="0.3"/>`)
    
    // Simple street network visualization
    if (streetNetwork.edges.length > 0) {
      // Scale coordinates to fit map area
      const lons = streetNetwork.nodes.flatMap(n => [n.lon]).filter(Boolean)
      const lats = streetNetwork.nodes.flatMap(n => [n.lat]).filter(Boolean)
      const minLon = Math.min(...lons)
      const maxLon = Math.max(...lons)
      const minLat = Math.min(...lats)
      const maxLat = Math.max(...lats)
      
      const scaleX = (lon: number) => margin.left + ((lon - minLon) / (maxLon - minLon)) * mapWidth
      const scaleY = (lat: number) => margin.top + ((maxLat - lat) / (maxLat - minLat)) * mapHeight
      
      // Draw streets
      streetNetwork.edges.slice(0, 50).forEach(edge => {
        const from = streetNetwork.nodes.find(n => n.id === edge.from)
        const to = streetNetwork.nodes.find(n => n.id === edge.to)
        
        if (from && to && from.lon && from.lat && to.lon && to.lat) {
          const x1 = scaleX(from.lon)
          const y1 = scaleY(from.lat)
          const x2 = scaleX(to.lon)
          const y2 = scaleY(to.lat)
          
          let strokeColor = theme.road_default
          if (edge.highway === 'motorway') strokeColor = theme.road_motorway
          else if (edge.highway === 'primary') strokeColor = theme.road_primary
          else if (edge.highway === 'secondary') strokeColor = theme.road_secondary
          
          svgElements.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" 
                stroke="${strokeColor}" stroke-width="${edge.highway === 'motorway' ? 2 : 1}" opacity="0.7"/>`)
        }
      })
    }
    
    // Parks
    if (parks.length > 0) {
      parks.slice(0, 10).forEach(park => {
        if (park.geometry) {
          const geom = park.geometry as any
          if (geom.coordinates && geom.coordinates[0]) {
            const coords = geom.coordinates[0] as number[][]
            if (coords.length >= 3) {
              const points = coords.map(coord => `${coord[0]},${coord[1]}`).join(' ')
              svgElements.push(`<polygon points="${points}" fill="${theme.parks}" opacity="0.3"/>`)
            }
          }
        }
      })
    }
    
    // Water features
    if (water.length > 0) {
      water.slice(0, 5).forEach(water => {
        if (water.geometry) {
          const geom = water.geometry as any
          if (geom.coordinates && geom.coordinates[0]) {
            const coords = geom.coordinates[0] as number[][]
            if (coords.length >= 3) {
              const points = coords.map(coord => `${coord[0]},${coord[1]}`).join(' ')
              svgElements.push(`<polygon points="${points}" fill="${theme.water}" opacity="0.5"/>`)
            }
          }
        }
      })
    }
    
    // Stats
    svgElements.push(`<text x="${margin.left}" y="${height - 20}" fill="${theme.text}" 
          font-family="Arial" font-size="10" opacity="0.6">
        Streets: ${streetNetwork.edges.length} | Nodes: ${streetNetwork.nodes.length}
      </text>`)
    
    const svgContent = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${svgElements.join('\n  ')}
    </svg>`

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
    const themePath = path.join(process.cwd(), '..', 'maptoposter', 'themes', `${themeName}.json`)

    try {
      const themeContent = await fs.readFile(themePath, 'utf8')
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
   * Save poster to file and generate thumbnail
   */
  private async savePoster(
    renderResult: { svgContent: string; width: number; height: number },
    config: MapPosterConfig
  ): Promise<{ filePath: string; thumbnailPath: string; fileSize: number }> {
    const outputDir = path.join(process.cwd(), '..', 'posters')
    await fs.mkdir(outputDir, { recursive: true })

    const posterId = config.posterId
    const format = config.format || 'png'

    const filePath = path.join(outputDir, `${posterId}.${format}`)
    const thumbnailPath = path.join(outputDir, `${posterId}_thumb.png`)

    // Save main poster
    const resvgOpts = {
      font: { loadSystemFonts: true },
    }

    let fileBuffer: Buffer
    if (format === 'png') {
      const resvg = new Resvg(renderResult.svgContent, {
        ...resvgOpts,
        fitTo: { mode: 'width' as const, value: renderResult.width },
      })
      const pngData = resvg.render()
      fileBuffer = Buffer.from(pngData.asPng())
    } else if (format === 'pdf') {
      fileBuffer = await svgToPdfBuffer(renderResult.svgContent, renderResult.width, renderResult.height)
    } else {
      fileBuffer = Buffer.from(renderResult.svgContent, 'utf8')
    }

    await fs.writeFile(filePath, fileBuffer)
    const fileSize = fileBuffer.length

    // Generate thumbnail as PNG
    const thumbWidth = Math.floor(renderResult.width * 0.25)
    const thumbResvg = new Resvg(renderResult.svgContent, {
      ...resvgOpts,
      fitTo: { mode: 'width' as const, value: thumbWidth },
    })
    const thumbPng = thumbResvg.render()
    await fs.writeFile(thumbnailPath, thumbPng.asPng())

    return {
      filePath: `posters/${posterId}.${format}`,
      thumbnailPath: `posters/${posterId}_thumb.png`,
      fileSize
    }
  }
}

// Singleton instance
export const mapPosterService = new MapPosterService()