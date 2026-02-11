import { test, expect, describe } from 'bun:test'
import {
  stereographicProject,
  polarProject,
  buildCanvasConfig,
  project,
} from '../projection.service'

const canvas = buildCanvasConfig(1000, 1000, 100) // 1000x1000 with 100px title block

describe('buildCanvasConfig', () => {
  test('creates config with correct center', () => {
    expect(canvas.centerX).toBe(500)
    // Center should be in the middle of the available area (above title block)
    expect(canvas.centerY).toBeGreaterThan(0)
    expect(canvas.radius).toBeGreaterThan(0)
    expect(canvas.radius).toBeLessThanOrEqual(500)
  })
})

describe('stereographicProject', () => {
  test('zenith maps to center', () => {
    const p = stereographicProject(90, 0, canvas)
    expect(p).not.toBeNull()
    expect(p!.x).toBeCloseTo(canvas.centerX, 0)
    expect(p!.y).toBeCloseTo(canvas.centerY, 0)
  })

  test('horizon maps to edge circle', () => {
    const p = stereographicProject(0, 0, canvas)
    expect(p).not.toBeNull()
    // At az=0 (north), the point should be at the top of the circle
    const distFromCenter = Math.sqrt(
      (p!.x - canvas.centerX) ** 2 + (p!.y - canvas.centerY) ** 2
    )
    expect(distFromCenter).toBeCloseTo(canvas.radius, 1)
  })

  test('below horizon returns null', () => {
    const p = stereographicProject(-10, 0, canvas)
    expect(p).toBeNull()
  })

  test('different azimuths produce different positions', () => {
    const pN = stereographicProject(45, 0, canvas)
    const pE = stereographicProject(45, 90, canvas)
    const pS = stereographicProject(45, 180, canvas)

    expect(pN).not.toBeNull()
    expect(pE).not.toBeNull()
    expect(pS).not.toBeNull()

    // North should be above center, South below
    expect(pN!.y).toBeLessThan(canvas.centerY)
    expect(pS!.y).toBeGreaterThan(canvas.centerY)
    // East should be to the right
    expect(pE!.x).toBeGreaterThan(canvas.centerX)
  })

  test('higher altitude maps closer to center', () => {
    const low = stereographicProject(10, 0, canvas)
    const high = stereographicProject(80, 0, canvas)

    expect(low).not.toBeNull()
    expect(high).not.toBeNull()

    const distLow = Math.sqrt((low!.x - canvas.centerX) ** 2 + (low!.y - canvas.centerY) ** 2)
    const distHigh = Math.sqrt((high!.x - canvas.centerX) ** 2 + (high!.y - canvas.centerY) ** 2)

    expect(distHigh).toBeLessThan(distLow)
  })
})

describe('polarProject', () => {
  test('zenith maps to center', () => {
    const p = polarProject(90, 0, canvas)
    expect(p).not.toBeNull()
    expect(p!.x).toBeCloseTo(canvas.centerX, 0)
    expect(p!.y).toBeCloseTo(canvas.centerY, 0)
  })

  test('horizon maps to edge', () => {
    const p = polarProject(0, 0, canvas)
    expect(p).not.toBeNull()
    const dist = Math.sqrt((p!.x - canvas.centerX) ** 2 + (p!.y - canvas.centerY) ** 2)
    expect(dist).toBeCloseTo(canvas.radius, 1)
  })

  test('below horizon returns null', () => {
    const p = polarProject(-5, 90, canvas)
    expect(p).toBeNull()
  })

  test('linear mapping: 45° is halfway to edge', () => {
    const p = polarProject(45, 0, canvas)
    expect(p).not.toBeNull()
    const dist = Math.sqrt((p!.x - canvas.centerX) ** 2 + (p!.y - canvas.centerY) ** 2)
    expect(dist).toBeCloseTo(canvas.radius / 2, 1)
  })
})

describe('project', () => {
  test('delegates to stereographic by default', () => {
    const p1 = project(45, 90, canvas)
    const p2 = stereographicProject(45, 90, canvas)
    expect(p1).toEqual(p2)
  })

  test('delegates to polar when specified', () => {
    const p1 = project(45, 90, canvas, 'polar')
    const p2 = polarProject(45, 90, canvas)
    expect(p1).toEqual(p2)
  })
})
