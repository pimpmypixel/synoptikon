import { ApiRouteConfig } from 'motia'
import fs from 'fs/promises'
import path from 'path'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'ListPosters',
  path: '/posters/list',
  method: 'GET',
  emits: [],
  flows: ['poster-creation-flow'],
}

interface PosterInfo {
  filename: string
  city: string
  country: string
  theme: string
  format: string
  distance: number
  landscape: boolean
  titleFont?: string
  subtitleFont?: string
  createdAt: string
  fileSize: number
  url: string
}

// Parse filename to extract metadata
// Format: {city}_{theme}_{YYYYMMDD}_{HHMMSS}.{format}
// Example: paris_noir_20260208_143022.png
function parseFilename(filename: string): Partial<PosterInfo> | null {
  const match = filename.match(/^(.+?)_([a-z_]+)_(\d{8})_(\d{6})\.(png|svg|pdf)$/i)
  if (!match) return null

  const [, cityRaw, theme, dateStr, timeStr, format] = match

  // Parse city (replace underscores with spaces, capitalize)
  const city = cityRaw
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')

  // Parse date
  const year = dateStr.slice(0, 4)
  const month = dateStr.slice(4, 6)
  const day = dateStr.slice(6, 8)
  const hour = timeStr.slice(0, 2)
  const minute = timeStr.slice(2, 4)
  const second = timeStr.slice(4, 6)
  const createdAt = `${year}-${month}-${day}T${hour}:${minute}:${second}`

  return {
    filename,
    city,
    theme,
    format,
    createdAt,
  }
}

// Try to read metadata from a sidecar JSON file if it exists
async function readMetadata(postersDir: string, filename: string): Promise<Partial<PosterInfo>> {
  const metaPath = path.join(postersDir, filename.replace(/\.(png|svg|pdf)$/i, '.json'))
  try {
    const content = await fs.readFile(metaPath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return {}
  }
}

export const handler = async (req: any, context: any) => {
  const postersDir = path.join(process.cwd(), '..', 'posters')

  try {
    // Ensure directory exists
    try {
      await fs.access(postersDir)
    } catch {
      return {
        status: 200,
        body: { posters: [] },
      }
    }

    // Read all files in posters directory
    const files = await fs.readdir(postersDir)

    // Filter for image/pdf files and parse metadata
    const posters: PosterInfo[] = []

    for (const filename of files) {
      // Skip non-poster files
      if (!/\.(png|svg|pdf)$/i.test(filename)) continue

      // Parse filename for basic info
      const parsed = parseFilename(filename)
      if (!parsed) continue

      // Get file stats
      const filePath = path.join(postersDir, filename)
      const stats = await fs.stat(filePath)

      // Try to read sidecar metadata
      const metadata = await readMetadata(postersDir, filename)

      posters.push({
        filename,
        city: metadata.city || parsed.city || 'Unknown',
        country: metadata.country || 'Unknown',
        theme: metadata.theme || parsed.theme || 'unknown',
        format: parsed.format || 'png',
        distance: metadata.distance || 10000,
        landscape: metadata.landscape || false,
        titleFont: metadata.titleFont,
        subtitleFont: metadata.subtitleFont,
        createdAt: parsed.createdAt || stats.mtime.toISOString(),
        fileSize: stats.size,
        url: `/posters-files/${filename}`,
      })
    }

    // Sort by creation date (newest first)
    posters.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return {
      status: 200,
      body: { posters },
    }
  } catch (error) {
    context.logger.error('Failed to list posters', { error })
    return {
      status: 500,
      body: { error: 'Failed to list posters' },
    }
  }
}
