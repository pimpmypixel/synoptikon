import { IMapPosterService } from '../interfaces'
import { dataService } from './data.service'
import type { MapPosterConfig, MapTheme, StreetNetwork, GeoFeature } from '../types'

interface OverpassResponse {
  elements: OverpassElement[]
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  nodes?: number[]
  tags?: Record<string, any>
  geometry?: Array<{ type: string; coordinates: number[] | number[][] }>
}

/**
 * Map data fetching service using Overpass API
 */
export class MapDataService {
  private readonly overpassUrl = 'https://overpass-api.de/api/interpreter'
  private readonly requestDelay = 1000 // 1 second delay between requests

  /**
   * Fetch street network data from OpenStreetMap
   */
  async fetchStreetNetwork(lat: number, lon: number, distance: number): Promise<StreetNetwork> {
    const cacheKey = dataService.generateCacheKey('street_network', { lat, lon, distance })
    
    // Try cache first
    const cached = await dataService.getFromCache<StreetNetwork>(cacheKey)
    if (cached) {
      console.log('Using cached street network')
      return cached
    }

    // Calculate bounding box
    const bbox = this.calculateBoundingBox(lat, lon, distance)
    
    // Overpass query for roads
    const query = `
      [out:json][timeout:25];
      (
        way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|living_street|unclassified)$"](${bbox});
        node(w);
      );
      out geom;
    `

    try {
      console.log('Fetching street network from Overpass API...')
      const response = await this.makeOverpassRequest(query)
      
      const streetNetwork = this.parseStreetNetwork(response)
      
      // Cache the result for 24 hours
      await dataService.setCache(cacheKey, streetNetwork, 24 * 60 * 60 * 1000)
      
      console.log(`Fetched ${streetNetwork.nodes.length} nodes and ${streetNetwork.edges.length} edges`)
      return streetNetwork
    } catch (error) {
      console.error('Failed to fetch street network:', error)
      throw new Error(`Failed to fetch street network: ${error}`)
    }
  }

  /**
   * Fetch geographical features (water, parks, etc.)
   */
  async fetchFeatures(
    lat: number, 
    lon: number, 
    distance: number, 
    type: 'water' | 'parks'
  ): Promise<GeoFeature[]> {
    const cacheKey = dataService.generateCacheKey('features', { lat, lon, distance, type })
    
    // Try cache first
    const cached = await dataService.getFromCache<GeoFeature[]>(cacheKey)
    if (cached) {
      console.log(`Using cached ${type} features`)
      return cached
    }

    const bbox = this.calculateBoundingBox(lat, lon, distance)
    
    let query = ''
    if (type === 'water') {
      query = `
        [out:json][timeout:25];
        (
          way["natural"="water"](${bbox});
          way["waterway"="riverbank"](${bbox});
          node(w);
        );
        out geom;
      `
    } else if (type === 'parks') {
      query = `
        [out:json][timeout:25];
        (
          way["leisure"="park"](${bbox});
          way["landuse"="grass"](${bbox});
          node(w);
        );
        out geom;
      `
    }

    try {
      console.log(`Fetching ${type} features from Overpass API...`)
      const response = await this.makeOverpassRequest(query)
      
      const features = this.parseFeatures(response, type)
      
      // Cache the result for 24 hours
      await dataService.setCache(cacheKey, features, 24 * 60 * 60 * 1000)
      
      console.log(`Fetched ${features.length} ${type} features`)
      return features
    } catch (error) {
      console.error(`Failed to fetch ${type} features:`, error)
      throw new Error(`Failed to fetch ${type} features: ${error}`)
    }
  }

  /**
   * Make request to Overpass API with retry logic
   */
  private async makeOverpassRequest(query: string): Promise<OverpassResponse> {
    const maxRetries = 3
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(this.overpassUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Synoptikon Poster Generator/1.0'
          },
          body: `data=${encodeURIComponent(query)}`
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        
        if (data.remark) {
          console.warn('Overpass API warning:', data.remark)
        }

        if (data.elements && data.elements.length === 0) {
          console.warn('No data returned from Overpass API')
        }

        return data
      } catch (error) {
        lastError = error as Error
        console.error(`Overpass request attempt ${attempt} failed:`, error)
        
        if (attempt < maxRetries) {
          const waitTime = this.requestDelay * attempt
          console.log(`Retrying in ${waitTime}ms...`)
          await this.sleep(waitTime)
        }
      }
    }

    throw lastError || new Error('Unknown error occurred')
  }

  /**
   * Parse Overpass response into street network format
   */
  private parseStreetNetwork(response: OverpassResponse): StreetNetwork {
    const nodes = new Map<string, { lat: number; lon: number }>()
    const edges: Array<{
      from: string
      to: string
      highway: string
      geometry: Array<[number, number]>
    }> = []

    // First, collect all nodes
    response.elements.forEach(element => {
      if (element.type === 'node' && element.lat && element.lon) {
        nodes.set(element.id.toString(), {
          lat: element.lat,
          lon: element.lon
        })
      }
    })

    // Then, process ways (roads)
    response.elements.forEach(element => {
      if (element.type === 'way' && element.nodes && element.tags) {
        const highway = element.tags.highway || 'unclassified'
        
        for (let i = 0; i < element.nodes.length - 1; i++) {
          const fromNode = nodes.get(element.nodes[i].toString())
          const toNode = nodes.get(element.nodes[i + 1].toString())
          
          if (fromNode && toNode) {
            edges.push({
              from: element.nodes[i].toString(),
              to: element.nodes[i + 1].toString(),
              highway,
              geometry: [
                [fromNode.lon, fromNode.lat],
                [toNode.lon, toNode.lat]
              ]
            })
          }
        }
      }
    })

    // Convert to expected format with projected coordinates
    const projectedNodes = Array.from(nodes.entries()).map(([id, coords]) => ({
      id,
      lat: coords.lat,
      lon: coords.lon,
      x: coords.lon, // Simple projection for now, will improve later
      y: coords.lat
    }))

    return {
      nodes: projectedNodes,
      edges
    }
  }

  /**
   * Parse Overpass response into features format
   */
  private parseFeatures(response: OverpassResponse, type: 'water' | 'parks'): GeoFeature[] {
    const featureType = type === 'parks' ? 'park' : type
    
    return response.elements
      .filter(element => element.type === 'way' && element.geometry)
      .map(element => ({
        type: featureType as 'water' | 'park' | 'building',
        geometry: element.geometry
          ?.filter(g => g.type === 'LineString' || g.type === 'Polygon')
          ?.map(g => {
            if (g.type === 'LineString') return g.coordinates as [number, number][]
            if (g.type === 'Polygon') return [g.coordinates[0]] as [number, number][]
            return [] as [number, number][]
          }) || []
      }))
  }

  /**
   * Calculate bounding box from center point and distance
   */
  private calculateBoundingBox(lat: number, lon: number, distance: number): string {
    // Convert distance to degrees (rough approximation)
    const deltaLat = distance / 111320 // 1 degree latitude ≈ 111.32 km
    const deltaLon = distance / (111320 * Math.cos(lat * Math.PI / 180))
    
    const minLat = lat - deltaLat
    const maxLat = lat + deltaLat
    const minLon = lon - deltaLon
    const maxLon = lon + deltaLon
    
    return `${minLat},${minLon},${maxLat},${maxLon}`
  }

  /**
   * Sleep helper for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Singleton instance
export const mapDataService = new MapDataService()