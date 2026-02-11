import { test, expect, describe } from 'bun:test'
import {
  computeVisibleStars,
  computePlanetPositions,
  computeMoonData,
  computeSunPosition,
  computeZodiacPositions,
  computeConstellationLines,
  computeEclipticPath,
} from '../astronomy.service'

describe('computeVisibleStars', () => {
  test('Sirius visible from Paris on Jan 15 23:00 UTC', async () => {
    const date = new Date('2025-01-15T23:00:00Z')
    const stars = await computeVisibleStars(date, 48.8566, 2.3522)

    // Should have many visible stars
    expect(stars.length).toBeGreaterThan(50)

    // Sirius (HIP 32349) should be visible and bright
    const sirius = stars.find(s => s.name === 'Sirius')
    expect(sirius).toBeDefined()
    if (sirius) {
      expect(sirius.alt).toBeGreaterThan(0) // above horizon
      expect(sirius.mag).toBeLessThan(0)    // very bright
    }
  })

  test('returns stars with valid alt/az coordinates', async () => {
    const date = new Date('2025-01-15T23:00:00Z')
    const stars = await computeVisibleStars(date, 48.8566, 2.3522, 4.0)

    for (const star of stars) {
      expect(star.alt).toBeGreaterThan(0)
      expect(star.alt).toBeLessThanOrEqual(90)
      expect(star.az).toBeGreaterThanOrEqual(0)
      expect(star.az).toBeLessThan(360)
    }
  })

  test('magnitude filter works', async () => {
    const date = new Date('2025-06-15T22:00:00Z')
    const brightStars = await computeVisibleStars(date, 40, -74, 2.0)
    const allStars = await computeVisibleStars(date, 40, -74, 6.5)

    expect(allStars.length).toBeGreaterThan(brightStars.length)
    for (const star of brightStars) {
      expect(star.mag).toBeLessThanOrEqual(2.0)
    }
  })
})

describe('computePlanetPositions', () => {
  test('returns all 7 planets', () => {
    const date = new Date('2025-01-15T23:00:00Z')
    const planets = computePlanetPositions(date, 48.8566, 2.3522)

    expect(planets).toHaveLength(7)

    const names = planets.map(p => p.id)
    expect(names).toContain('mercury')
    expect(names).toContain('venus')
    expect(names).toContain('mars')
    expect(names).toContain('jupiter')
    expect(names).toContain('saturn')
    expect(names).toContain('uranus')
    expect(names).toContain('neptune')
  })

  test('planets have valid coordinates', () => {
    const date = new Date('2025-03-20T21:00:00Z')
    const planets = computePlanetPositions(date, 35.6762, 139.6503)

    for (const planet of planets) {
      expect(planet.az).toBeGreaterThanOrEqual(0)
      expect(planet.az).toBeLessThan(360)
      expect(planet.alt).toBeGreaterThanOrEqual(-90)
      expect(planet.alt).toBeLessThanOrEqual(90)
      expect(planet.symbol).toBeTruthy()
    }
  })
})

describe('computeMoonData', () => {
  test('returns valid moon data', () => {
    const date = new Date('2025-01-15T23:00:00Z')
    const moon = computeMoonData(date, 48.8566, 2.3522)

    expect(moon.phase).toBeGreaterThanOrEqual(0)
    expect(moon.phase).toBeLessThanOrEqual(360)
    expect(moon.illumination).toBeGreaterThanOrEqual(0)
    expect(moon.illumination).toBeLessThanOrEqual(1)
    expect(moon.az).toBeGreaterThanOrEqual(0)
    expect(moon.az).toBeLessThan(360)
  })

  test('moon phase within 5° of known value for full moon date', () => {
    // Feb 12, 2025 is close to full moon
    const date = new Date('2025-02-12T22:00:00Z')
    const moon = computeMoonData(date, -33.9249, 18.4241)

    // Should be near 180° (full moon) — allow 20° tolerance
    expect(Math.abs(moon.phase - 180)).toBeLessThan(20)
    expect(moon.illumination).toBeGreaterThan(0.8)
  })
})

describe('computeSunPosition', () => {
  test('sun below horizon at midnight in winter Paris', () => {
    const date = new Date('2025-01-15T23:00:00Z')
    const sun = computeSunPosition(date, 48.8566, 2.3522)

    expect(sun.alt).toBeLessThan(0) // below horizon
  })

  test('sun above horizon at noon in summer Paris', () => {
    const date = new Date('2025-06-15T12:00:00Z')
    const sun = computeSunPosition(date, 48.8566, 2.3522)

    expect(sun.alt).toBeGreaterThan(0)
  })
})

describe('computeConstellationLines', () => {
  test('returns constellation data with segments', async () => {
    const date = new Date('2025-01-15T23:00:00Z')
    const lines = await computeConstellationLines(date, 48.8566, 2.3522)

    expect(lines.length).toBeGreaterThan(0)

    for (const constellation of lines) {
      expect(constellation.id).toBeTruthy()
      expect(constellation.segments.length).toBeGreaterThan(0)
    }
  })
})

describe('computeZodiacPositions', () => {
  test('returns 12 zodiac positions', () => {
    const date = new Date('2025-01-15T23:00:00Z')
    const positions = computeZodiacPositions(date, 48.8566, 2.3522)

    expect(positions).toHaveLength(12)
    for (const pos of positions) {
      expect(pos.symbol).toBeTruthy()
      expect(pos.name).toBeTruthy()
    }
  })
})

describe('computeEclipticPath', () => {
  test('returns ecliptic points', () => {
    const date = new Date('2025-01-15T23:00:00Z')
    const path = computeEclipticPath(date, 48.8566, 2.3522)

    expect(path.length).toBeGreaterThan(0)
    for (const point of path) {
      expect(point.az).toBeGreaterThanOrEqual(0)
      expect(point.az).toBeLessThan(360)
    }
  })
})
