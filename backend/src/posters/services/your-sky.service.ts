import type { IYourSkyService, PosterResult } from '../interfaces'
import { progressService } from './progress.service'
import type { YourSkyConfig, CelestialObject, YourSkyTheme, PosterProgress } from '../types'
import {
  computeVisibleStars,
  computePlanetPositions,
  computeMoonData,
  computeConstellationLines,
  computeZodiacPositions,
  computeSunPosition,
  computeEclipticPath,
  type VisibleStar,
  type PlanetData,
  type MoonData,
  type ConstellationLineProjected,
  type ZodiacPosition,
} from './astronomy.service'
import { bvToColor, getConstellationName } from './celestial-data.service'
import {
  buildCanvasConfig,
  project,
  type CanvasConfig,
  type ProjectedPoint,
} from './projection.service'
import fs from 'fs/promises'
import path from 'path'
import { Resvg } from '@resvg/resvg-js'
import { svgToPdfBuffer } from './pdf.service'

// Sky themes
const SKY_THEMES: Record<string, YourSkyTheme> = {
  starry_night: {
    name: 'Starry Night',
    bg: '#0B1026', bgGradientEnd: '#1A2040',
    text: '#FFFFFF',
    stars: { main: '#FFFFFF', bright: '#FFE4B5', dim: '#B8D4E3' },
    planets: { mercury: '#8C7853', venus: '#FFC649', earth: '#4169E1', mars: '#CD5C5C', jupiter: '#DAA520', saturn: '#F4E7D7', uranus: '#4FD0E7', neptune: '#4B70DD' },
    moon: '#F0F0F0', moonGlow: '#F0F0F040',
    constellations: '#4682B4', constellationLabels: '#4682B480',
    ecliptic: '#FFD70040', horizon: '#FFFFFF30', zodiac: '#FFD70060',
    grid: '#FFFFFF15', useSpectralColors: true,
    fonts: { bold: 'Roboto', regular: 'Roboto', light: 'Roboto' },
  },
  cosmic_purple: {
    name: 'Cosmic Purple',
    bg: '#1A0A2E', bgGradientEnd: '#2D1450',
    text: '#E8D5F5',
    stars: { main: '#E8D5F5', bright: '#FFFFFF', dim: '#9B7BC0' },
    planets: { mercury: '#B8A080', venus: '#FFD880', earth: '#6090C0', mars: '#E07060', jupiter: '#F0C060', saturn: '#F5E8D0', uranus: '#60D0F0', neptune: '#6080E0' },
    moon: '#E8D5F5', moonGlow: '#E8D5F530',
    constellations: '#7B2FBE60', constellationLabels: '#9B5FDE50',
    ecliptic: '#D4A0FF30', horizon: '#E8D5F520', zodiac: '#D4A0FF50',
    grid: '#E8D5F510', useSpectralColors: false,
    fonts: { bold: 'Roboto', regular: 'Roboto', light: 'Roboto' },
  },
  aurora_green: {
    name: 'Aurora Green',
    bg: '#0A1F0A', bgGradientEnd: '#153015',
    text: '#E0FFE0',
    stars: { main: '#FFFFFF', bright: '#E0FFE0', dim: '#80C080' },
    planets: { mercury: '#A09070', venus: '#FFE080', earth: '#4090D0', mars: '#D06050', jupiter: '#E0B040', saturn: '#F0E0C0', uranus: '#40D0E0', neptune: '#5070D0' },
    moon: '#E0FFE0', moonGlow: '#4ADE8030',
    constellations: '#4ADE8040', constellationLabels: '#4ADE8030',
    ecliptic: '#80FF8030', horizon: '#4ADE8025', zodiac: '#80FF8050',
    grid: '#4ADE8010', useSpectralColors: true,
    fonts: { bold: 'Roboto', regular: 'Roboto', light: 'Roboto' },
  },
  lunar_gray: {
    name: 'Lunar Gray',
    bg: '#1A1A1A', bgGradientEnd: '#2A2A2A',
    text: '#D4D4D4',
    stars: { main: '#D4D4D4', bright: '#FFFFFF', dim: '#808080' },
    planets: { mercury: '#909090', venus: '#C0C0A0', earth: '#7090B0', mars: '#B07060', jupiter: '#C0A060', saturn: '#D0C0A0', uranus: '#80B0C0', neptune: '#7080B0' },
    moon: '#D4D4D4', moonGlow: '#D4D4D430',
    constellations: '#66666640', constellationLabels: '#66666630',
    ecliptic: '#88888830', horizon: '#D4D4D420', zodiac: '#88888850',
    grid: '#D4D4D410', useSpectralColors: false,
    fonts: { bold: 'Roboto', regular: 'Roboto', light: 'Roboto' },
  },
  solar_orange: {
    name: 'Solar Orange',
    bg: '#1A0F05', bgGradientEnd: '#2A1A08',
    text: '#FFD4A0',
    stars: { main: '#FFD4A0', bright: '#FFFFFF', dim: '#C09060' },
    planets: { mercury: '#C0A070', venus: '#FFE070', earth: '#5080C0', mars: '#E06040', jupiter: '#F0B030', saturn: '#F0D0A0', uranus: '#50C0D0', neptune: '#5070C0' },
    moon: '#FFD4A0', moonGlow: '#FF8C0030',
    constellations: '#FF8C0030', constellationLabels: '#FF8C0025',
    ecliptic: '#FFA50030', horizon: '#FFD4A020', zodiac: '#FFA50050',
    grid: '#FFD4A010', useSpectralColors: false,
    fonts: { bold: 'Roboto', regular: 'Roboto', light: 'Roboto' },
  },
  nebula_pink: {
    name: 'Nebula Pink',
    bg: '#1A0515', bgGradientEnd: '#2A0A25',
    text: '#FFD0E8',
    stars: { main: '#FFD0E8', bright: '#FFFFFF', dim: '#C08090' },
    planets: { mercury: '#B09080', venus: '#FFE090', earth: '#5090D0', mars: '#E07060', jupiter: '#E0B050', saturn: '#F0D8C0', uranus: '#50D0E0', neptune: '#5080D0' },
    moon: '#FFD0E8', moonGlow: '#FF69B430',
    constellations: '#FF69B430', constellationLabels: '#FF69B425',
    ecliptic: '#FF69B430', horizon: '#FFD0E820', zodiac: '#FF69B450',
    grid: '#FFD0E810', useSpectralColors: false,
    fonts: { bold: 'Roboto', regular: 'Roboto', light: 'Roboto' },
  },
  classic_ivory: {
    name: 'Classic Ivory',
    bg: '#FAF6F0', bgGradientEnd: '#F0EBE0',
    text: '#1A2744',
    stars: { main: '#1A2744', bright: '#0D1522', dim: '#4A5A74' },
    planets: { mercury: '#6B5B4B', venus: '#B8960A', earth: '#2A5080', mars: '#8B3A3A', jupiter: '#8B7530', saturn: '#6B6050', uranus: '#3A7A8A', neptune: '#3A5090' },
    moon: '#1A2744', moonGlow: '#1A274420',
    constellations: '#B8960A40', constellationLabels: '#B8960A35',
    ecliptic: '#B8960A30', horizon: '#1A274425', zodiac: '#B8960A50',
    grid: '#1A274415', useSpectralColors: false,
    fonts: { bold: 'Roboto', regular: 'Roboto', light: 'Roboto' },
  },
  arctic_blue: {
    name: 'Arctic Blue',
    bg: '#EDF3F8', bgGradientEnd: '#DDE8F0',
    text: '#1C2D3F',
    stars: { main: '#1C2D3F', bright: '#0E1720', dim: '#4A6080' },
    planets: { mercury: '#5A6A70', venus: '#8A7A20', earth: '#2A5090', mars: '#8A4040', jupiter: '#7A6A30', saturn: '#6A6050', uranus: '#3A7090', neptune: '#3A5080' },
    moon: '#1C2D3F', moonGlow: '#1C2D3F20',
    constellations: '#4A7AAA40', constellationLabels: '#4A7AAA35',
    ecliptic: '#4A7AAA30', horizon: '#1C2D3F25', zodiac: '#4A7AAA50',
    grid: '#1C2D3F15', useSpectralColors: false,
    fonts: { bold: 'Roboto', regular: 'Roboto', light: 'Roboto' },
  },
  dawn_rose: {
    name: 'Dawn Rose',
    bg: '#F8EEF0', bgGradientEnd: '#F0E0E4',
    text: '#3A1A24',
    stars: { main: '#3A1A24', bright: '#1D0D12', dim: '#6A4A54' },
    planets: { mercury: '#6A5A50', venus: '#A08A30', earth: '#3A5A80', mars: '#8A3030', jupiter: '#7A6A30', saturn: '#6A5A48', uranus: '#3A708A', neptune: '#3A5078' },
    moon: '#3A1A24', moonGlow: '#3A1A2420',
    constellations: '#B07A7A40', constellationLabels: '#B07A7A35',
    ecliptic: '#B07A7A30', horizon: '#3A1A2425', zodiac: '#B07A7A50',
    grid: '#3A1A2415', useSpectralColors: false,
    fonts: { bold: 'Roboto', regular: 'Roboto', light: 'Roboto' },
  },
}

/**
 * Your Sky poster service — layered SVG rendering with real ephemeris data
 */
export class YourSkyService implements IYourSkyService {

  async validate(config: YourSkyConfig): Promise<boolean> {
    if (!config.timestamp) {
      throw new Error('Timestamp is required for Your Sky posters')
    }
    if (!config.lat && !config.lon && !config.googleMapsUrl) {
      throw new Error('Coordinates are required for observation point')
    }
    return true
  }

  private resolveCoordinates(config: YourSkyConfig): { lat: number; lon: number } {
    if (config.lat != null && config.lon != null) {
      return { lat: config.lat, lon: config.lon }
    }
    if (config.googleMapsUrl) {
      const coords = this.parseGoogleMapsURL(config.googleMapsUrl)
      if (coords) return coords
    }
    throw new Error('Coordinates are required for observation point')
  }

  async createPoster(config: YourSkyConfig): Promise<PosterResult> {
    const startTime = Date.now()

    try {
      const { lat, lon } = this.resolveCoordinates(config)
      const observationTime = new Date(config.timestamp)

      await progressService.updateProgress(config.jobId, 'fetching_data', 'Loading star catalog...', 5)

      const theme = this.loadTheme(config.theme)
      const dimensions = this.calculateDimensions(config)
      const titleBlockHeight = Math.round(dimensions.height * 0.12)
      const canvas = buildCanvasConfig(dimensions.width, dimensions.height, titleBlockHeight)
      const projType = config.projection?.type || 'stereographic'

      await progressService.updateProgress(config.jobId, 'calculating_celestial', 'Computing star positions...', 15)

      // Compute all celestial data in parallel
      const show = config.celestialObjects || { stars: true, planets: true, moon: true, constellations: true, zodiac: false, grid: false }

      const [
        visibleStars,
        planets,
        moonData,
        constellationLines,
        zodiacPositions,
        sunPosition,
        eclipticPath,
      ] = await Promise.all([
        show.stars !== false ? computeVisibleStars(observationTime, lat, lon, config.styling?.starMagnitudes?.minMagnitude ?? 6.5) : Promise.resolve([]),
        show.planets !== false ? Promise.resolve(computePlanetPositions(observationTime, lat, lon)) : Promise.resolve([]),
        show.moon !== false ? Promise.resolve(computeMoonData(observationTime, lat, lon)) : Promise.resolve(null),
        show.constellations !== false ? computeConstellationLines(observationTime, lat, lon) : Promise.resolve([]),
        show.zodiac ? Promise.resolve(computeZodiacPositions(observationTime, lat, lon)) : Promise.resolve([]),
        Promise.resolve(computeSunPosition(observationTime, lat, lon)),
        Promise.resolve(computeEclipticPath(observationTime, lat, lon)),
      ])

      await progressService.updateProgress(config.jobId, 'rendering', `Rendering ${visibleStars.length} stars...`, 50)

      // Build layered SVG
      const svgContent = this.renderSVG({
        config,
        theme,
        canvas,
        projType,
        visibleStars,
        planets,
        moonData,
        constellationLines,
        zodiacPositions,
        eclipticPath,
        titleBlockHeight,
        lat,
        lon,
        observationTime,
      })

      await progressService.updateProgress(config.jobId, 'saving', 'Saving poster...', 90)

      const saveResult = await this.savePoster({ svgContent, ...dimensions }, config)

      await progressService.completeProgress(config.jobId, saveResult.filePath, {
        width: dimensions.width,
        height: dimensions.height,
        renderTime: Date.now() - startTime,
        celestialObjectsCount: visibleStars.length + planets.length + (moonData ? 1 : 0),
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
          renderTime: Date.now() - startTime,
        },
      }
    } catch (error) {
      await progressService.failProgress(config.jobId, (error as Error).message)
      return { success: false, error: (error as Error).message }
    }
  }

  // ─── SVG Rendering ──────────────────────────────────────────────

  private renderSVG(opts: {
    config: YourSkyConfig
    theme: YourSkyTheme
    canvas: CanvasConfig
    projType: 'stereographic' | 'polar'
    visibleStars: VisibleStar[]
    planets: PlanetData[]
    moonData: MoonData | null
    constellationLines: ConstellationLineProjected[]
    zodiacPositions: ZodiacPosition[]
    eclipticPath: Array<{ alt: number; az: number }>
    titleBlockHeight: number
    lat: number
    lon: number
    observationTime: Date
  }): string {
    const { config, theme, canvas, projType } = opts
    const show = config.celestialObjects || { stars: true, planets: true, moon: true, constellations: true, zodiac: false, grid: false }
    const styling = config.styling || { starColors: 'realistic', constellationLines: true, constellationLabels: true, gridLines: true }

    const layers: string[] = []

    // Layer 1: Background
    layers.push(this.renderBackground(canvas, theme))

    // Layer 2: SVG defs (filters, clip paths)
    layers.push(this.renderDefs(canvas, theme))

    // Layer 3: Coordinate grid
    if (show.grid) {
      layers.push(this.renderGrid(canvas, projType, theme))
    }

    // Layer 4: Ecliptic path
    layers.push(this.renderEcliptic(opts.eclipticPath, canvas, projType, theme))

    // Layer 5: Constellation lines
    if (show.constellations !== false && styling.constellationLines !== false) {
      layers.push(this.renderConstellationLines(opts.constellationLines, canvas, projType, theme))
    }

    // Layer 6: Constellation labels
    if (show.constellations !== false && styling.constellationLabels !== false) {
      layers.push(this.renderConstellationLabels(opts.constellationLines, canvas, projType, theme))
    }

    // Layer 7: Stars
    if (show.stars !== false) {
      layers.push(this.renderStars(opts.visibleStars, canvas, projType, theme, styling.starColors || 'realistic'))
    }

    // Layer 8: Planets
    if (show.planets !== false) {
      layers.push(this.renderPlanets(opts.planets, canvas, projType, theme))
    }

    // Layer 9: Moon
    if (show.moon !== false && opts.moonData) {
      layers.push(this.renderMoon(opts.moonData, canvas, projType, theme))
    }

    // Layer 10: Zodiac signs
    if (show.zodiac) {
      layers.push(this.renderZodiac(opts.zodiacPositions, canvas, projType, theme))
    }

    // Layer 11: Horizon circle
    layers.push(this.renderHorizon(canvas, theme))

    // Layer 12: Title block
    layers.push(this.renderTitleBlock(config, opts.lat, opts.lon, opts.observationTime, canvas, opts.titleBlockHeight, theme))

    return `<svg width="${canvas.width}" height="${canvas.height}" xmlns="http://www.w3.org/2000/svg">\n${layers.join('\n')}\n</svg>`
  }

  // Layer 1
  private renderBackground(canvas: CanvasConfig, theme: YourSkyTheme): string {
    const gradEnd = theme.bgGradientEnd || theme.bg
    return `<defs>
  <radialGradient id="sky-bg" cx="50%" cy="${((canvas.centerY / canvas.height) * 100).toFixed(1)}%" r="60%">
    <stop offset="0%" stop-color="${theme.bg}"/>
    <stop offset="100%" stop-color="${gradEnd}"/>
  </radialGradient>
</defs>
<rect width="${canvas.width}" height="${canvas.height}" fill="url(#sky-bg)"/>`
  }

  // Layer 2
  private renderDefs(canvas: CanvasConfig, theme: YourSkyTheme): string {
    return `<defs>
  <filter id="star-glow" x="-200%" y="-200%" width="500%" height="500%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="moon-glow" x="-100%" y="-100%" width="300%" height="300%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <clipPath id="sky-clip">
    <circle cx="${canvas.centerX}" cy="${canvas.centerY}" r="${canvas.radius}"/>
  </clipPath>
</defs>`
  }

  // Layer 3
  private renderGrid(canvas: CanvasConfig, projType: 'stereographic' | 'polar', theme: YourSkyTheme): string {
    const gridColor = theme.grid || '#FFFFFF15'
    const lines: string[] = ['<g clip-path="url(#sky-clip)" opacity="0.5">']

    // Altitude circles at 15° intervals
    for (let alt = 15; alt <= 75; alt += 15) {
      const points: ProjectedPoint[] = []
      for (let az = 0; az < 360; az += 5) {
        const p = project(alt, az, canvas, projType)
        if (p) points.push(p)
      }
      if (points.length > 2) {
        const d = `M ${points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')} Z`
        lines.push(`  <path d="${d}" fill="none" stroke="${gridColor}" stroke-width="0.5" stroke-dasharray="4,4"/>`)
      }
    }

    // Azimuth lines at 30° intervals
    for (let az = 0; az < 360; az += 30) {
      const p1 = project(0, az, canvas, projType)
      const p2 = project(89, az, canvas, projType)
      if (p1 && p2) {
        lines.push(`  <line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="${gridColor}" stroke-width="0.5" stroke-dasharray="4,4"/>`)
      }
    }

    // Cardinal direction labels
    const cardinals = [
      { az: 0, label: 'N' }, { az: 45, label: 'NE' },
      { az: 90, label: 'E' }, { az: 135, label: 'SE' },
      { az: 180, label: 'S' }, { az: 225, label: 'SW' },
      { az: 270, label: 'W' }, { az: 315, label: 'NW' },
    ]
    for (const c of cardinals) {
      const p = project(2, c.az, canvas, projType)
      if (p) {
        lines.push(`  <text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" fill="${theme.text}" font-size="${canvas.radius * 0.03}" text-anchor="middle" dominant-baseline="middle" opacity="0.5">${c.label}</text>`)
      }
    }

    lines.push('</g>')
    return lines.join('\n')
  }

  // Layer 4
  private renderEcliptic(eclipticPath: Array<{ alt: number; az: number }>, canvas: CanvasConfig, projType: 'stereographic' | 'polar', theme: YourSkyTheme): string {
    const eclipticColor = theme.ecliptic || '#FFD70040'
    const points: ProjectedPoint[] = []

    for (const { alt, az } of eclipticPath) {
      const p = project(alt, az, canvas, projType)
      if (p) points.push(p)
    }

    if (points.length < 3) return ''

    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    return `<g clip-path="url(#sky-clip)">
  <path d="${pathData}" fill="none" stroke="${eclipticColor}" stroke-width="1.5" stroke-dasharray="8,4"/>
</g>`
  }

  // Layer 5
  private renderConstellationLines(constellations: ConstellationLineProjected[], canvas: CanvasConfig, projType: 'stereographic' | 'polar', theme: YourSkyTheme): string {
    const color = theme.constellations || '#4682B440'
    const lines: string[] = ['<g clip-path="url(#sky-clip)">']

    for (const constellation of constellations) {
      for (const segment of constellation.segments) {
        const points: ProjectedPoint[] = []
        for (const { alt, az } of segment) {
          const p = project(alt, az, canvas, projType)
          if (p) points.push(p)
        }
        if (points.length >= 2) {
          const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
          lines.push(`  <path d="${d}" fill="none" stroke="${color}" stroke-width="0.8" opacity="0.5"/>`)
        }
      }
    }

    lines.push('</g>')
    return lines.join('\n')
  }

  // Layer 6
  private renderConstellationLabels(constellations: ConstellationLineProjected[], canvas: CanvasConfig, projType: 'stereographic' | 'polar', theme: YourSkyTheme): string {
    const labelColor = theme.constellationLabels || theme.constellations || '#4682B4'
    const fontSize = Math.max(10, canvas.radius * 0.025)
    const labels: string[] = ['<g clip-path="url(#sky-clip)">']

    for (const constellation of constellations) {
      // Find center of all points
      let sumAlt = 0, sumAz = 0, count = 0
      for (const segment of constellation.segments) {
        for (const { alt, az } of segment) {
          if (alt > 0) {
            sumAlt += alt
            // Handle azimuth wrapping
            sumAz += az
            count++
          }
        }
      }
      if (count === 0) continue

      const centerAlt = sumAlt / count
      const centerAz = sumAz / count
      const p = project(centerAlt, centerAz, canvas, projType)
      if (!p) continue

      const name = getConstellationName(constellation.id)
      labels.push(`  <text x="${p.x.toFixed(1)}" y="${(p.y - fontSize).toFixed(1)}" fill="${labelColor}" font-size="${fontSize}" font-family="sans-serif" text-anchor="middle" opacity="0.6">${name}</text>`)
    }

    labels.push('</g>')
    return labels.join('\n')
  }

  // Layer 7
  private renderStars(stars: VisibleStar[], canvas: CanvasConfig, projType: 'stereographic' | 'polar', theme: YourSkyTheme, colorMode: string): string {
    const elements: string[] = ['<g clip-path="url(#sky-clip)">']

    // Sort by magnitude descending (dim first, bright on top)
    const sorted = [...stars].sort((a, b) => b.mag - a.mag)

    for (const star of sorted) {
      const p = project(star.alt, star.az, canvas, projType)
      if (!p) continue

      // Size: brighter stars = larger
      const maxR = canvas.radius * 0.008
      const minR = canvas.radius * 0.001
      const r = Math.max(minR, maxR * Math.pow(10, -0.15 * star.mag))

      // Color
      let color: string
      if (colorMode === 'realistic' && theme.useSpectralColors) {
        color = bvToColor(star.bv)
      } else if (colorMode === 'temperature') {
        color = bvToColor(star.bv)
      } else {
        // monochrome / theme-based
        if (star.mag < 0) color = theme.stars.bright
        else if (star.mag < 2) color = theme.stars.main
        else color = theme.stars.dim
      }

      // Bright stars get glow
      const useGlow = star.mag < 2
      elements.push(`  <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r.toFixed(2)}" fill="${color}" opacity="0.9"${useGlow ? ' filter="url(#star-glow)"' : ''}/>`)

      // Named stars get label
      if (star.name && star.mag < 2) {
        const labelSize = Math.max(8, canvas.radius * 0.018)
        elements.push(`  <text x="${(p.x + r + 3).toFixed(1)}" y="${(p.y + 3).toFixed(1)}" fill="${theme.text}" font-size="${labelSize}" font-family="sans-serif" opacity="0.6">${star.name}</text>`)
      }
    }

    elements.push('</g>')
    return elements.join('\n')
  }

  // Layer 8
  private renderPlanets(planets: PlanetData[], canvas: CanvasConfig, projType: 'stereographic' | 'polar', theme: YourSkyTheme): string {
    const elements: string[] = ['<g clip-path="url(#sky-clip)">']

    for (const planet of planets) {
      if (planet.alt <= 0) continue

      const p = project(planet.alt, planet.az, canvas, projType)
      if (!p) continue

      const color = theme.planets[planet.id as keyof typeof theme.planets] || '#FFFFFF'
      const r = Math.max(canvas.radius * 0.004, canvas.radius * 0.01 * Math.pow(10, -0.15 * planet.mag))
      const labelSize = Math.max(10, canvas.radius * 0.022)

      elements.push(`  <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r.toFixed(2)}" fill="${color}" stroke="${theme.text}" stroke-width="0.5" filter="url(#star-glow)"/>`)
      elements.push(`  <text x="${(p.x + r + 4).toFixed(1)}" y="${(p.y + 4).toFixed(1)}" fill="${color}" font-size="${labelSize}" font-family="sans-serif">${planet.symbol} ${planet.name}</text>`)
    }

    elements.push('</g>')
    return elements.join('\n')
  }

  // Layer 9
  private renderMoon(moonData: MoonData, canvas: CanvasConfig, projType: 'stereographic' | 'polar', theme: YourSkyTheme): string {
    if (moonData.alt <= 0) return ''

    const p = project(moonData.alt, moonData.az, canvas, projType)
    if (!p) return ''

    const r = canvas.radius * 0.03
    const glowColor = theme.moonGlow || '#F0F0F030'

    // Compute crescent path based on phase
    const phase = moonData.phase
    const illum = moonData.illumination

    // Moon disc
    const elements: string[] = ['<g clip-path="url(#sky-clip)">']

    // Glow
    elements.push(`  <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(r * 2.5).toFixed(1)}" fill="${glowColor}" filter="url(#moon-glow)"/>`)

    // Base circle (dark side)
    elements.push(`  <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r.toFixed(1)}" fill="${theme.bg}" stroke="${theme.moon}" stroke-width="0.5"/>`)

    // Illuminated part using SVG arc
    if (illum > 0.01) {
      const crescentPath = this.moonCrescentPath(p.x, p.y, r, phase)
      elements.push(`  <path d="${crescentPath}" fill="${theme.moon}" opacity="0.9"/>`)
    }

    // Label
    const labelSize = Math.max(10, canvas.radius * 0.02)
    const phaseLabel = this.moonPhaseLabel(phase)
    elements.push(`  <text x="${(p.x + r + 5).toFixed(1)}" y="${(p.y + 4).toFixed(1)}" fill="${theme.text}" font-size="${labelSize}" font-family="sans-serif" opacity="0.7">${phaseLabel}</text>`)

    elements.push('</g>')
    return elements.join('\n')
  }

  private moonCrescentPath(cx: number, cy: number, r: number, phase: number): string {
    // phase: 0 = new moon, 90 = first quarter, 180 = full, 270 = last quarter
    // We draw the illuminated half

    if (phase >= 175 && phase <= 185) {
      // Full moon - just a circle
      return `M ${cx - r},${cy} A ${r},${r} 0 1,1 ${cx + r},${cy} A ${r},${r} 0 1,1 ${cx - r},${cy}`
    }

    // The terminator is an ellipse whose x-radius varies with phase
    const isWaxing = phase < 180
    const phaseAngle = isWaxing ? phase : 360 - phase

    // k ranges from 0 (new) to 1 (full)
    const k = (1 - Math.cos(phaseAngle * Math.PI / 180)) / 2
    const terminatorRx = r * Math.abs(2 * k - 1)
    const sweepOuter = isWaxing ? 1 : 0

    // The illuminated side
    const startY = cy - r
    const endY = cy + r

    // Outer arc (always a semicircle on the lit side)
    const outerSweep = isWaxing ? (phase < 90 ? 0 : 1) : (phase > 270 ? 1 : 0)

    if (k < 0.5) {
      // Crescent: both arcs curve same way
      return `M ${cx},${startY} A ${r},${r} 0 0,${isWaxing ? 1 : 0} ${cx},${endY} A ${terminatorRx},${r} 0 0,${isWaxing ? 0 : 1} ${cx},${startY}`
    } else {
      // Gibbous: arcs curve opposite ways
      return `M ${cx},${startY} A ${r},${r} 0 0,${isWaxing ? 1 : 0} ${cx},${endY} A ${terminatorRx},${r} 0 0,${isWaxing ? 1 : 0} ${cx},${startY}`
    }
  }

  private moonPhaseLabel(phase: number): string {
    if (phase < 22.5 || phase > 337.5) return 'New Moon'
    if (phase < 67.5) return 'Waxing Crescent'
    if (phase < 112.5) return 'First Quarter'
    if (phase < 157.5) return 'Waxing Gibbous'
    if (phase < 202.5) return 'Full Moon'
    if (phase < 247.5) return 'Waning Gibbous'
    if (phase < 292.5) return 'Last Quarter'
    return 'Waning Crescent'
  }

  // Layer 10
  private renderZodiac(positions: ZodiacPosition[], canvas: CanvasConfig, projType: 'stereographic' | 'polar', theme: YourSkyTheme): string {
    const color = theme.zodiac || '#FFD70060'
    const fontSize = Math.max(14, canvas.radius * 0.035)
    const elements: string[] = ['<g clip-path="url(#sky-clip)">']

    for (const pos of positions) {
      if (!pos.visible) continue
      const p = project(pos.alt, pos.az, canvas, projType)
      if (!p) continue

      elements.push(`  <text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" fill="${color}" font-size="${fontSize}" font-family="'Apple Symbols', 'Segoe UI Symbol', 'Noto Sans Symbols 2', sans-serif" text-anchor="middle" dominant-baseline="middle">${pos.symbol}</text>`)
    }

    elements.push('</g>')
    return elements.join('\n')
  }

  // Layer 11
  private renderHorizon(canvas: CanvasConfig, theme: YourSkyTheme): string {
    const horizonColor = theme.horizon || '#FFFFFF30'
    return `<circle cx="${canvas.centerX}" cy="${canvas.centerY}" r="${canvas.radius}" fill="none" stroke="${horizonColor}" stroke-width="2"/>`
  }

  // Layer 12
  private renderTitleBlock(
    config: YourSkyConfig,
    lat: number,
    lon: number,
    observationTime: Date,
    canvas: CanvasConfig,
    titleBlockHeight: number,
    theme: YourSkyTheme
  ): string {
    const y0 = canvas.height - titleBlockHeight
    const cityName = (config.city || '').toUpperCase()
    const country = config.country || ''
    const dateStr = observationTime.toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
    const timeStr = observationTime.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
    const coordStr = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}  ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`

    const titleSize = Math.max(24, canvas.radius * 0.07)
    const subtitleSize = Math.max(12, canvas.radius * 0.025)
    const detailSize = Math.max(10, canvas.radius * 0.02)
    const fontFamily = theme.fonts?.regular || 'sans-serif'

    return `<g>
  <rect x="0" y="${y0}" width="${canvas.width}" height="${titleBlockHeight}" fill="${theme.bg}" opacity="0.9"/>
  <line x1="${canvas.width * 0.15}" y1="${y0 + 10}" x2="${canvas.width * 0.85}" y2="${y0 + 10}" stroke="${theme.text}" stroke-width="0.5" opacity="0.3"/>
  <text x="${canvas.centerX}" y="${y0 + titleBlockHeight * 0.4}" fill="${theme.text}" font-size="${titleSize}" font-family="${fontFamily}" font-weight="bold" text-anchor="middle" letter-spacing="6">${cityName}</text>
  <text x="${canvas.centerX}" y="${y0 + titleBlockHeight * 0.6}" fill="${theme.text}" font-size="${subtitleSize}" font-family="${fontFamily}" text-anchor="middle" opacity="0.8">${country}</text>
  <text x="${canvas.centerX}" y="${y0 + titleBlockHeight * 0.8}" fill="${theme.text}" font-size="${detailSize}" font-family="${fontFamily}" text-anchor="middle" opacity="0.5" letter-spacing="2">${dateStr}  ·  ${timeStr}  ·  ${coordStr}</text>
</g>`
  }

  // ─── Helpers ────────────────────────────────────────────────────

  async calculateCelestialPositions(timestamp: string, lat: number, lon: number): Promise<CelestialObject[]> {
    const date = new Date(timestamp)
    const stars = await computeVisibleStars(date, lat, lon)
    return stars.map(s => ({
      id: String(s.id),
      type: 'star' as const,
      name: s.name || `HIP ${s.id}`,
      magnitude: s.mag,
      position: { ra: s.ra, dec: s.dec },
      horizontal: { alt: s.alt, az: s.az },
    }))
  }

  async fetchStarCatalog(magnitude: number): Promise<CelestialObject[]> {
    const { loadStarCatalog } = await import('./celestial-data.service')
    const catalog = await loadStarCatalog()
    return catalog.filter(s => s.mag <= magnitude).map(s => ({
      id: String(s.id),
      type: 'star' as const,
      name: s.name || `HIP ${s.id}`,
      magnitude: s.mag,
      position: { ra: s.ra, dec: s.dec },
      properties: { bv_color: s.bv },
    }))
  }

  private calculateDimensions(config: YourSkyConfig): { width: number; height: number } {
    if (config.widthCm && config.heightCm) {
      return {
        width: Math.round(config.widthCm / 2.54 * 300),
        height: Math.round(config.heightCm / 2.54 * 300),
      }
    }
    return { width: 3600, height: 3600 }
  }

  private loadTheme(themeName: string): YourSkyTheme {
    return SKY_THEMES[themeName] || SKY_THEMES.starry_night
  }

  private async savePoster(
    renderResult: { svgContent: string; width: number; height: number },
    config: YourSkyConfig
  ): Promise<{ filePath: string; thumbnailPath: string; fileSize: number }> {
    const outputDir = path.join(process.cwd(), '..', 'posters')
    await fs.mkdir(outputDir, { recursive: true })

    const posterId = config.posterId
    const format = config.format || 'svg'

    const filePath = path.join(outputDir, `${posterId}.${format}`)
    const thumbnailPath = path.join(outputDir, `${posterId}_thumb.png`)

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
      fileSize,
    }
  }

  async getProgress(jobId: string): Promise<PosterProgress | null> {
    return progressService.getProgress(jobId)
  }

  async renderYourSkyPoster(config: YourSkyConfig): Promise<PosterResult> {
    return this.createPoster(config)
  }

  private parseGoogleMapsURL(url: string): { lat: number; lon: number } | null {
    const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
    if (atMatch) return { lat: parseFloat(atMatch[1]), lon: parseFloat(atMatch[2]) }
    const dMatch = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/)
    if (dMatch) return { lat: parseFloat(dMatch[1]), lon: parseFloat(dMatch[2]) }
    return null
  }
}

export const yourSkyService = new YourSkyService()
