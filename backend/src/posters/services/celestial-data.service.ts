import fs from 'fs/promises'
import path from 'path'

export interface StarCatalogEntry {
  id: number
  ra: number   // right ascension in degrees
  dec: number  // declination in degrees
  mag: number  // apparent magnitude
  bv: number   // B-V color index
  name?: string
  bayer?: string
  constellation?: string
}

export interface ConstellationLine {
  id: string      // 3-letter IAU abbreviation (e.g. "Ori")
  segments: Array<Array<[number, number]>> // each segment is array of [ra, dec] points
}

export interface ConstellationInfo {
  id: string
  name: string
  center: [number, number] // [ra, dec]
}

const DATA_DIR = path.join(process.cwd(), 'src', 'posters', 'data')

let _starCache: StarCatalogEntry[] | null = null
let _constellationLinesCache: ConstellationLine[] | null = null
let _starNamesCache: Map<number, { name: string; bayer: string; constellation: string }> | null = null

/**
 * Load and cache the star catalog from stars.6.json (d3-celestial format)
 */
export async function loadStarCatalog(): Promise<StarCatalogEntry[]> {
  if (_starCache) return _starCache

  const raw = await fs.readFile(path.join(DATA_DIR, 'stars.6.json'), 'utf-8')
  const geojson = JSON.parse(raw) as {
    features: Array<{
      id: number
      properties: { mag: number; bv: string }
      geometry: { coordinates: [number, number] }
    }>
  }

  const names = await loadStarNames()

  _starCache = geojson.features.map(f => {
    const nameInfo = names.get(f.id)
    return {
      id: f.id,
      ra: f.geometry.coordinates[0],   // d3-celestial uses degrees
      dec: f.geometry.coordinates[1],
      mag: f.properties.mag,
      bv: parseFloat(f.properties.bv) || 0,
      name: nameInfo?.name || undefined,
      bayer: nameInfo?.bayer || undefined,
      constellation: nameInfo?.constellation || undefined,
    }
  })

  return _starCache
}

/**
 * Load star names (keyed by HIP id)
 */
async function loadStarNames(): Promise<Map<number, { name: string; bayer: string; constellation: string }>> {
  if (_starNamesCache) return _starNamesCache

  const raw = await fs.readFile(path.join(DATA_DIR, 'starnames.json'), 'utf-8')
  const data = JSON.parse(raw) as Record<string, { name: string; bayer: string; c: string }>

  _starNamesCache = new Map()
  for (const [idStr, entry] of Object.entries(data)) {
    _starNamesCache.set(parseInt(idStr, 10), {
      name: entry.name || '',
      bayer: entry.bayer || '',
      constellation: entry.c || '',
    })
  }

  return _starNamesCache
}

/**
 * Load constellation line data (stick figures)
 */
export async function loadConstellationLines(): Promise<ConstellationLine[]> {
  if (_constellationLinesCache) return _constellationLinesCache

  const raw = await fs.readFile(path.join(DATA_DIR, 'constellations.lines.json'), 'utf-8')
  const geojson = JSON.parse(raw) as {
    features: Array<{
      id: string
      geometry: {
        type: string
        coordinates: Array<Array<[number, number]>>
      }
    }>
  }

  _constellationLinesCache = geojson.features.map(f => ({
    id: f.id,
    segments: f.geometry.coordinates,
  }))

  return _constellationLinesCache
}

/**
 * IAU constellation full names
 */
const CONSTELLATION_NAMES: Record<string, string> = {
  And: 'Andromeda', Ant: 'Antlia', Aps: 'Apus', Aqr: 'Aquarius', Aql: 'Aquila',
  Ara: 'Ara', Ari: 'Aries', Aur: 'Auriga', Boo: 'Boötes', Cae: 'Caelum',
  Cam: 'Camelopardalis', Cnc: 'Cancer', CVn: 'Canes Venatici', CMa: 'Canis Major',
  CMi: 'Canis Minor', Cap: 'Capricornus', Car: 'Carina', Cas: 'Cassiopeia',
  Cen: 'Centaurus', Cep: 'Cepheus', Cet: 'Cetus', Cha: 'Chamaeleon',
  Cir: 'Circinus', Col: 'Columba', Com: 'Coma Berenices', CrA: 'Corona Australis',
  CrB: 'Corona Borealis', Crv: 'Corvus', Crt: 'Crater', Cru: 'Crux',
  Cyg: 'Cygnus', Del: 'Delphinus', Dor: 'Dorado', Dra: 'Draco',
  Equ: 'Equuleus', Eri: 'Eridanus', For: 'Fornax', Gem: 'Gemini',
  Gru: 'Grus', Her: 'Hercules', Hor: 'Horologium', Hya: 'Hydra',
  Hyi: 'Hydrus', Ind: 'Indus', Lac: 'Lacerta', Leo: 'Leo',
  LMi: 'Leo Minor', Lep: 'Lepus', Lib: 'Libra', Lup: 'Lupus',
  Lyn: 'Lynx', Lyr: 'Lyra', Men: 'Mensa', Mic: 'Microscopium',
  Mon: 'Monoceros', Mus: 'Musca', Nor: 'Norma', Oct: 'Octans',
  Oph: 'Ophiuchus', Ori: 'Orion', Pav: 'Pavo', Peg: 'Pegasus',
  Per: 'Perseus', Phe: 'Phoenix', Pic: 'Pictor', Psc: 'Pisces',
  PsA: 'Piscis Austrinus', Pup: 'Puppis', Pyx: 'Pyxis', Ret: 'Reticulum',
  Sge: 'Sagitta', Sgr: 'Sagittarius', Sco: 'Scorpius', Scl: 'Sculptor',
  Sct: 'Scutum', Ser: 'Serpens', Sex: 'Sextans', Tau: 'Taurus',
  Tel: 'Telescopium', Tri: 'Triangulum', TrA: 'Triangulum Australe',
  Tuc: 'Tucana', UMa: 'Ursa Major', UMi: 'Ursa Minor', Vel: 'Vela',
  Vir: 'Virgo', Vol: 'Volans', Vul: 'Vulpecula',
}

export function getConstellationName(abbr: string): string {
  return CONSTELLATION_NAMES[abbr] || abbr
}

/**
 * Zodiac sign data along the ecliptic
 */
export const ZODIAC_SIGNS = [
  { symbol: '\u2648', name: 'Aries',       eclipticLon: 15 },
  { symbol: '\u2649', name: 'Taurus',      eclipticLon: 45 },
  { symbol: '\u264A', name: 'Gemini',      eclipticLon: 75 },
  { symbol: '\u264B', name: 'Cancer',      eclipticLon: 105 },
  { symbol: '\u264C', name: 'Leo',         eclipticLon: 135 },
  { symbol: '\u264D', name: 'Virgo',       eclipticLon: 165 },
  { symbol: '\u264E', name: 'Libra',       eclipticLon: 195 },
  { symbol: '\u264F', name: 'Scorpio',     eclipticLon: 225 },
  { symbol: '\u2650', name: 'Sagittarius', eclipticLon: 255 },
  { symbol: '\u2651', name: 'Capricorn',   eclipticLon: 285 },
  { symbol: '\u2652', name: 'Aquarius',    eclipticLon: 315 },
  { symbol: '\u2653', name: 'Pisces',      eclipticLon: 345 },
] as const

/**
 * B-V color index to RGB hex color for spectral star coloring
 */
export function bvToColor(bv: number): string {
  // Approximate B-V to temperature to color mapping
  // Based on Ballesteros (2012) formula + color temperature to sRGB
  const t = 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62))

  let r: number, g: number, b: number

  if (t >= 6600) {
    r = 255
    g = Math.min(255, Math.max(0, 329.698727446 * Math.pow(((t - 6000) / 100), -0.1332047592)))
    b = Math.min(255, Math.max(0, 138.5177312231 * Math.log((t - 6000) / 100) - 305.0447927307))
  } else {
    r = Math.min(255, Math.max(0, 329.698727446 * Math.pow((t / 100), -0.1332047592)))
    g = Math.min(255, Math.max(0, 99.4708025861 * Math.log(t / 100) - 161.1195681661))
    b = t <= 1900 ? 0 : Math.min(255, Math.max(0, 138.5177312231 * Math.log(t / 100 - 10) - 305.0447927307))
  }

  const hex = (v: number) => Math.round(v).toString(16).padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}`
}
