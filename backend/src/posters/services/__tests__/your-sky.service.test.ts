import { test, expect, describe, mock } from 'bun:test'
import { YourSkyService } from '../your-sky.service'
import type { YourSkyConfig } from '../../types'

// Mock progressService to prevent stream/state calls
mock.module('../progress.service', () => ({
  progressService: {
    updateProgress: async () => {},
    completeProgress: async () => {},
    failProgress: async () => {},
    getProgress: async () => null,
    setContext: () => {},
  },
}))

function makeConfig(overrides: Partial<YourSkyConfig> = {}): YourSkyConfig {
  return {
    type: 'your-sky',
    jobId: 'test-job',
    posterId: 'test-poster',
    city: 'Paris',
    country: 'France',
    lat: 48.8566,
    lon: 2.3522,
    timestamp: '2025-01-15T23:00:00Z',
    observationPoint: 'specified',
    theme: 'starry_night',
    format: 'svg',
    landscape: false,
    rotation: 0,
    celestialObjects: {
      stars: true,
      planets: true,
      moon: true,
      constellations: true,
      zodiac: false,
      grid: false,
      deepSkyObjects: false,
    },
    projection: { type: 'stereographic', fov: 180, northUp: true },
    styling: {
      starColors: 'realistic',
      starMagnitudes: { minMagnitude: 6.5, maxMagnitude: -2 },
      constellationLines: true,
      constellationLabels: true,
      gridLines: false,
    },
    ...overrides,
  } as YourSkyConfig
}

describe('YourSkyService', () => {
  const service = new YourSkyService()

  describe('validate', () => {
    test('accepts valid config', async () => {
      const result = await service.validate(makeConfig())
      expect(result).toBe(true)
    })

    test('rejects missing timestamp', async () => {
      await expect(
        service.validate(makeConfig({ timestamp: '' } as any))
      ).rejects.toThrow('Timestamp is required')
    })
  })

  describe('createPoster', () => {
    test('generates SVG with >100 stars for Paris winter night', async () => {
      const config = makeConfig()
      const result = await service.createPoster(config)

      expect(result.success).toBe(true)
      expect(result.fileSize).toBeGreaterThan(10_000) // >10KB
      expect(result.metadata?.renderTime).toBeGreaterThan(0)
    }, 30_000) // allow 30s for star catalog loading

    test('SVG contains expected elements', async () => {
      const config = makeConfig({ widthCm: 10, heightCm: 10 }) // small for speed
      const result = await service.createPoster(config)

      expect(result.success).toBe(true)

      // Read the SVG file
      const fs = await import('fs/promises')
      const path = await import('path')
      const svgPath = path.join(process.cwd(), '..', result.filePath!)
      const svg = await fs.readFile(svgPath, 'utf-8')

      // Check SVG structure
      expect(svg).toContain('<svg')
      expect(svg).toContain('<circle') // stars
      expect(svg).toContain('<path')   // constellation lines or ecliptic
      expect(svg).toContain('PARIS')   // title block
      expect(svg).toContain('France')  // subtitle
    }, 30_000)
  })

  describe('calculateCelestialPositions', () => {
    test('returns star objects with positions', async () => {
      const objects = await service.calculateCelestialPositions(
        '2025-01-15T23:00:00Z', 48.8566, 2.3522
      )

      expect(objects.length).toBeGreaterThan(50)
      for (const obj of objects) {
        expect(obj.type).toBe('star')
        expect(obj.position.ra).toBeDefined()
        expect(obj.position.dec).toBeDefined()
        expect(obj.horizontal).toBeDefined()
        expect(obj.horizontal!.alt).toBeGreaterThan(0)
      }
    })
  })

  describe('fetchStarCatalog', () => {
    test('returns catalog filtered by magnitude', async () => {
      const catalog = await service.fetchStarCatalog(4.0)

      expect(catalog.length).toBeGreaterThan(100)
      for (const star of catalog) {
        expect(star.magnitude).toBeLessThanOrEqual(4.0)
      }
    })
  })
})
