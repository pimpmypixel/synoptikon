/**
 * Benchmark script for Your Sky poster generation.
 * Run: bun scripts/benchmark-posters.ts
 *
 * Generates 5 SVG posters with predefined configs and outputs a manifest.
 */
import { YourSkyService } from '../backend/src/posters/services/your-sky.service'
import { computeVisibleStars, computePlanetPositions, computeMoonData } from '../backend/src/posters/services/astronomy.service'
import fs from 'fs/promises'
import path from 'path'

const OUTPUT_DIR = path.join(import.meta.dir, '..', 'benchmarks')

interface BenchmarkConfig {
  name: string
  city: string
  country: string
  lat: number
  lon: number
  timestamp: string
  theme: string
  description: string
}

const CONFIGS: BenchmarkConfig[] = [
  {
    name: 'paris-winter',
    city: 'Paris',
    country: 'France',
    lat: 48.8566,
    lon: 2.3522,
    timestamp: '2025-01-15T23:00:00Z',
    theme: 'starry_night',
    description: 'Paris winter night, Orion visible',
  },
  {
    name: 'sydney-summer',
    city: 'Sydney',
    country: 'Australia',
    lat: -33.8688,
    lon: 151.2093,
    timestamp: '2025-01-15T12:00:00Z',
    theme: 'cosmic_purple',
    description: 'Sydney summer night (local), Southern Cross',
  },
  {
    name: 'tokyo-equinox',
    city: 'Tokyo',
    country: 'Japan',
    lat: 35.6762,
    lon: 139.6503,
    timestamp: '2025-03-20T21:00:00Z',
    theme: 'aurora_green',
    description: 'Tokyo spring equinox evening',
  },
  {
    name: 'reykjavik-midsummer',
    city: 'Reykjavik',
    country: 'Iceland',
    lat: 64.1466,
    lon: -21.9426,
    timestamp: '2025-06-21T01:00:00Z',
    theme: 'lunar_gray',
    description: 'Reykjavik midsummer (near midnight sun)',
  },
  {
    name: 'capetown-fullmoon',
    city: 'Cape Town',
    country: 'South Africa',
    lat: -33.9249,
    lon: 18.4241,
    timestamp: '2025-02-12T22:00:00Z',
    theme: 'nebula_pink',
    description: 'Cape Town full moon night',
  },
]

interface ManifestEntry {
  name: string
  city: string
  country: string
  timestamp: string
  theme: string
  starCount: number
  planetsVisible: string[]
  moonPhase: number
  moonIllumination: number
  renderTimeMs: number
  fileSizeBytes: number
  svgFile: string
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true })

  const service = new YourSkyService()
  const manifest: ManifestEntry[] = []

  console.log(`\nBenchmarking ${CONFIGS.length} poster configs...\n`)

  for (const config of CONFIGS) {
    const startTime = performance.now()

    console.log(`  ${config.name}: ${config.description}`)

    const date = new Date(config.timestamp)

    // Compute celestial data for metadata
    const stars = await computeVisibleStars(date, config.lat, config.lon)
    const planets = computePlanetPositions(date, config.lat, config.lon)
    const moon = computeMoonData(date, config.lat, config.lon)
    const visiblePlanets = planets.filter(p => p.alt > 0)

    // Create poster using service
    const jobId = `bench-${config.name}`
    const result = await service.createPoster({
      type: 'your-sky',
      jobId,
      posterId: config.name,
      city: config.city,
      country: config.country,
      lat: config.lat,
      lon: config.lon,
      timestamp: config.timestamp,
      observationPoint: 'specified',
      theme: config.theme,
      format: 'svg',
      landscape: false,
      rotation: 0,
      celestialObjects: {
        stars: true,
        planets: true,
        moon: true,
        constellations: true,
        zodiac: true,
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
    } as any)

    const renderTime = performance.now() - startTime

    if (!result.success) {
      console.log(`    FAILED: ${result.error}`)
      continue
    }

    // The service saves to path.join(process.cwd(), '..', 'posters', filename)
    // result.filePath is 'posters/xxx.svg'
    const srcPath = path.join(process.cwd(), '..', result.filePath!)
    const destPath = path.join(OUTPUT_DIR, `${config.name}.svg`)
    await fs.copyFile(srcPath, destPath)

    const stat = await fs.stat(destPath)

    // Write metadata JSON
    const metadata = {
      ...config,
      starCount: stars.length,
      planetsVisible: visiblePlanets.map(p => p.name),
      moonPhase: moon.phase,
      moonIllumination: moon.illumination,
      renderTimeMs: Math.round(renderTime),
      fileSizeBytes: stat.size,
    }
    await fs.writeFile(
      path.join(OUTPUT_DIR, `${config.name}.json`),
      JSON.stringify(metadata, null, 2)
    )

    manifest.push({
      name: config.name,
      city: config.city,
      country: config.country,
      timestamp: config.timestamp,
      theme: config.theme,
      starCount: stars.length,
      planetsVisible: visiblePlanets.map(p => p.name),
      moonPhase: Math.round(moon.phase * 10) / 10,
      moonIllumination: Math.round(moon.illumination * 1000) / 1000,
      renderTimeMs: Math.round(renderTime),
      fileSizeBytes: stat.size,
      svgFile: `${config.name}.svg`,
    })

    console.log(`    Stars: ${stars.length}, Planets: ${visiblePlanets.map(p => p.name).join(', ') || 'none'}, Moon: ${Math.round(moon.phase)}° (${Math.round(moon.illumination * 100)}%)`)
    console.log(`    Render: ${Math.round(renderTime)}ms, Size: ${(stat.size / 1024).toFixed(1)}KB`)
  }

  // Write manifest
  await fs.writeFile(
    path.join(OUTPUT_DIR, 'manifest.json'),
    JSON.stringify({ generated: new Date().toISOString(), entries: manifest }, null, 2)
  )

  console.log(`\nManifest written to benchmarks/manifest.json`)
  console.log(`Generated ${manifest.length} SVGs in ${OUTPUT_DIR}\n`)
}

main().catch(console.error)
