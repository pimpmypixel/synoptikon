/**
 * Projection service for mapping alt/az coordinates to canvas x/y
 *
 * Zenith (alt=90) maps to canvas center.
 * Horizon (alt=0) maps to edge circle.
 * Below-horizon objects return null.
 */

export interface CanvasConfig {
  width: number
  height: number
  centerX: number
  centerY: number
  radius: number // radius of the horizon circle in pixels
}

export interface ProjectedPoint {
  x: number
  y: number
}

/**
 * Build a CanvasConfig from poster dimensions, reserving space for title block
 */
export function buildCanvasConfig(
  width: number,
  height: number,
  titleBlockHeight: number = 0,
  padding: number = 40
): CanvasConfig {
  const availableHeight = height - titleBlockHeight - padding * 2
  const availableWidth = width - padding * 2
  const radius = Math.min(availableWidth, availableHeight) / 2
  const centerX = width / 2
  const centerY = padding + availableHeight / 2

  return { width, height, centerX, centerY, radius }
}

/**
 * Stereographic projection: alt/az → canvas x/y
 *
 * Zenith at center, horizon at edge circle.
 * North is up (az=0 → top of circle).
 */
export function stereographicProject(
  alt: number,
  az: number,
  canvas: CanvasConfig
): ProjectedPoint | null {
  if (alt < 0) return null

  // Stereographic: r = cos(alt) / (1 + sin(alt))
  // This maps zenith (alt=90°) to r=0, horizon (alt=0°) to r=1
  const altRad = alt * Math.PI / 180
  const azRad = az * Math.PI / 180

  const r = Math.cos(altRad) / (1 + Math.sin(altRad))

  // Scale r to pixel radius
  const pixelR = r * canvas.radius

  // Azimuth: 0° = North (top), 90° = East (right) when looking up at sky
  // Mirror horizontally so East appears on right when looking up
  const x = canvas.centerX + pixelR * Math.sin(azRad)
  const y = canvas.centerY - pixelR * Math.cos(azRad)

  return { x, y }
}

/**
 * Polar (equidistant) projection: alt/az → canvas x/y
 *
 * Linear mapping: zenith at center, horizon at edge.
 */
export function polarProject(
  alt: number,
  az: number,
  canvas: CanvasConfig
): ProjectedPoint | null {
  if (alt < 0) return null

  // Linear: r = (90 - alt) / 90
  const r = (90 - alt) / 90
  const pixelR = r * canvas.radius

  const azRad = az * Math.PI / 180
  const x = canvas.centerX + pixelR * Math.sin(azRad)
  const y = canvas.centerY - pixelR * Math.cos(azRad)

  return { x, y }
}

/**
 * Project a point using the configured projection type
 */
export function project(
  alt: number,
  az: number,
  canvas: CanvasConfig,
  projectionType: 'stereographic' | 'polar' = 'stereographic'
): ProjectedPoint | null {
  if (projectionType === 'polar') {
    return polarProject(alt, az, canvas)
  }
  return stereographicProject(alt, az, canvas)
}
