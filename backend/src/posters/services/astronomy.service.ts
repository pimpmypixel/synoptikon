import * as Astronomy from 'astronomy-engine'
import {
  loadStarCatalog,
  loadConstellationLines,
  ZODIAC_SIGNS,
  type StarCatalogEntry,
  type ConstellationLine,
} from './celestial-data.service'

export interface HorizontalCoord {
  alt: number  // altitude in degrees (0 = horizon, 90 = zenith)
  az: number   // azimuth in degrees (0 = north, 90 = east)
}

export interface VisibleStar {
  id: number
  name?: string
  bayer?: string
  constellation?: string
  ra: number
  dec: number
  mag: number
  bv: number
  alt: number
  az: number
}

export interface PlanetData {
  id: string
  name: string
  symbol: string
  ra: number
  dec: number
  mag: number
  alt: number
  az: number
}

export interface MoonData {
  ra: number
  dec: number
  alt: number
  az: number
  phase: number         // 0-360 degrees, 0=new, 180=full
  illumination: number  // 0-1 fraction illuminated
}

export interface ConstellationLineProjected {
  id: string
  segments: Array<Array<{ alt: number; az: number }>>
}

export interface ZodiacPosition {
  symbol: string
  name: string
  alt: number
  az: number
  visible: boolean
}

function makeObserver(lat: number, lon: number): Astronomy.Observer {
  return new Astronomy.Observer(lat, lon, 0)
}

function makeAstroTime(date: Date): Astronomy.AstroTime {
  return Astronomy.MakeTime(date)
}

/**
 * Convert equatorial RA/Dec to horizontal alt/az for an observer at given time
 */
function equatorialToHorizontal(
  ra: number,  // degrees
  dec: number, // degrees
  date: Date,
  lat: number,
  lon: number
): HorizontalCoord {
  const observer = makeObserver(lat, lon)
  const time = makeAstroTime(date)

  // Convert RA from degrees to hours for astronomy-engine
  const raHours = ra / 15

  const hor = Astronomy.Horizon(time, observer, raHours, dec, 'normal')

  return {
    alt: hor.altitude,
    az: hor.azimuth,
  }
}

/**
 * Get visible stars for a given date, location, and minimum magnitude
 */
export async function computeVisibleStars(
  date: Date,
  lat: number,
  lon: number,
  maxMag: number = 6.5
): Promise<VisibleStar[]> {
  const catalog = await loadStarCatalog()

  const visibleStars: VisibleStar[] = []

  for (const star of catalog) {
    if (star.mag > maxMag) continue

    const { alt, az } = equatorialToHorizontal(star.ra, star.dec, date, lat, lon)

    if (alt > 0) {
      visibleStars.push({
        id: star.id,
        name: star.name,
        bayer: star.bayer,
        constellation: star.constellation,
        ra: star.ra,
        dec: star.dec,
        mag: star.mag,
        bv: star.bv,
        alt,
        az,
      })
    }
  }

  return visibleStars
}

const PLANET_BODIES: Array<{ body: Astronomy.Body; id: string; name: string; symbol: string }> = [
  { body: Astronomy.Body.Mercury, id: 'mercury', name: 'Mercury', symbol: '\u263F' },
  { body: Astronomy.Body.Venus,   id: 'venus',   name: 'Venus',   symbol: '\u2640' },
  { body: Astronomy.Body.Mars,    id: 'mars',    name: 'Mars',    symbol: '\u2642' },
  { body: Astronomy.Body.Jupiter, id: 'jupiter', name: 'Jupiter', symbol: '\u2643' },
  { body: Astronomy.Body.Saturn,  id: 'saturn',  name: 'Saturn',  symbol: '\u2644' },
  { body: Astronomy.Body.Uranus,  id: 'uranus',  name: 'Uranus',  symbol: '\u26E2' },
  { body: Astronomy.Body.Neptune, id: 'neptune', name: 'Neptune', symbol: '\u2646' },
]

/**
 * Compute planet positions (RA/Dec + alt/az + magnitude)
 */
export function computePlanetPositions(
  date: Date,
  lat: number,
  lon: number
): PlanetData[] {
  const observer = makeObserver(lat, lon)
  const time = makeAstroTime(date)
  const planets: PlanetData[] = []

  for (const { body, id, name, symbol } of PLANET_BODIES) {
    const equatorial = Astronomy.Equator(body, time, observer, true, true)
    const horizon = Astronomy.Horizon(time, observer, equatorial.ra, equatorial.dec, 'normal')

    let mag = 0
    try {
      const illum = Astronomy.Illumination(body, time)
      mag = illum.mag
    } catch {
      // Some bodies may not have illumination data
    }

    planets.push({
      id,
      name,
      symbol,
      ra: equatorial.ra * 15, // hours to degrees
      dec: equatorial.dec,
      mag,
      alt: horizon.altitude,
      az: horizon.azimuth,
    })
  }

  return planets
}

/**
 * Compute moon position, phase, and illumination
 */
export function computeMoonData(
  date: Date,
  lat: number,
  lon: number
): MoonData {
  const observer = makeObserver(lat, lon)
  const time = makeAstroTime(date)

  const equatorial = Astronomy.Equator(Astronomy.Body.Moon, time, observer, true, true)
  const horizon = Astronomy.Horizon(time, observer, equatorial.ra, equatorial.dec, 'normal')

  const moonIllum = Astronomy.Illumination(Astronomy.Body.Moon, time)
  const moonPhase = Astronomy.MoonPhase(time)

  return {
    ra: equatorial.ra * 15,
    dec: equatorial.dec,
    alt: horizon.altitude,
    az: horizon.azimuth,
    phase: moonPhase,
    illumination: moonIllum.phase_fraction,
  }
}

/**
 * Project constellation line vertices to alt/az and filter to visible ones
 */
export async function computeConstellationLines(
  date: Date,
  lat: number,
  lon: number
): Promise<ConstellationLineProjected[]> {
  const lines = await loadConstellationLines()
  const result: ConstellationLineProjected[] = []

  for (const constellation of lines) {
    const projectedSegments: Array<Array<{ alt: number; az: number }>> = []

    for (const segment of constellation.segments) {
      const projectedPoints: Array<{ alt: number; az: number }> = []

      for (const [ra, dec] of segment) {
        const { alt, az } = equatorialToHorizontal(ra, dec, date, lat, lon)
        projectedPoints.push({ alt, az })
      }

      // Include segment if at least one point is above horizon
      if (projectedPoints.some(p => p.alt > 0)) {
        projectedSegments.push(projectedPoints)
      }
    }

    if (projectedSegments.length > 0) {
      result.push({
        id: constellation.id,
        segments: projectedSegments,
      })
    }
  }

  return result
}

/**
 * Compute zodiac sign positions along the ecliptic
 */
export function computeZodiacPositions(
  date: Date,
  lat: number,
  lon: number
): ZodiacPosition[] {
  const time = makeAstroTime(date)
  const obliquity = 23.4393 // Earth's axial tilt in degrees (approximate)

  return ZODIAC_SIGNS.map(sign => {
    // Convert ecliptic longitude to equatorial RA/Dec
    const eclLon = sign.eclipticLon * Math.PI / 180
    const ra = Math.atan2(
      Math.sin(eclLon) * Math.cos(obliquity * Math.PI / 180),
      Math.cos(eclLon)
    ) * 180 / Math.PI
    const dec = Math.asin(
      Math.sin(eclLon) * Math.sin(obliquity * Math.PI / 180)
    ) * 180 / Math.PI

    const raDeg = ((ra % 360) + 360) % 360
    const { alt, az } = equatorialToHorizontal(raDeg, dec, date, lat, lon)

    return {
      symbol: sign.symbol,
      name: sign.name,
      alt,
      az,
      visible: alt > 0,
    }
  })
}

/**
 * Compute sun position (to check if it's nighttime)
 */
export function computeSunPosition(
  date: Date,
  lat: number,
  lon: number
): HorizontalCoord {
  const observer = makeObserver(lat, lon)
  const time = makeAstroTime(date)

  const equatorial = Astronomy.Equator(Astronomy.Body.Sun, time, observer, true, true)
  const horizon = Astronomy.Horizon(time, observer, equatorial.ra, equatorial.dec, 'normal')

  return {
    alt: horizon.altitude,
    az: horizon.azimuth,
  }
}

/**
 * Compute ecliptic path points projected to alt/az
 */
export function computeEclipticPath(
  date: Date,
  lat: number,
  lon: number,
  numPoints: number = 72
): Array<{ alt: number; az: number }> {
  const obliquity = 23.4393
  const points: Array<{ alt: number; az: number }> = []

  for (let i = 0; i < numPoints; i++) {
    const eclLon = (i * 360 / numPoints) * Math.PI / 180
    const ra = Math.atan2(
      Math.sin(eclLon) * Math.cos(obliquity * Math.PI / 180),
      Math.cos(eclLon)
    ) * 180 / Math.PI
    const dec = Math.asin(
      Math.sin(eclLon) * Math.sin(obliquity * Math.PI / 180)
    ) * 180 / Math.PI

    const raDeg = ((ra % 360) + 360) % 360
    const { alt, az } = equatorialToHorizontal(raDeg, dec, date, lat, lon)
    points.push({ alt, az })
  }

  return points
}
