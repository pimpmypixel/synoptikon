import type { ApiRouteConfig } from 'motia'
import { listPosters, type PosterRecord } from './db'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'ListPosters',
  path: '/posters/list',
  method: 'GET',
  emits: [],
  flows: ['poster-creation-flow'],
}

export const handler = async (req: any, context: any) => {
  try {
    const records = listPosters()

    const posters = records.map((r: PosterRecord) => ({
      id: r.id,
      filename: r.filename,
      type: r.type,
      city: r.city,
      country: r.country,
      theme: r.theme,
      format: r.format,
      distance: r.distance,
      landscape: r.landscape,
      titleFont: r.titleFont,
      subtitleFont: r.subtitleFont,
      paperSize: r.paperSize,
      rotation: r.rotation,
      border: r.border,
      lat: r.lat,
      lon: r.lon,
      widthCm: r.widthCm,
      heightCm: r.heightCm,
      createdAt: r.createdAt,
      fileSize: r.fileSize || 0,
      url: `/posters-files/${r.filename}`,
      thumbnailUrl: r.thumbnail ? `/posters-files/${r.thumbnail}` : undefined,
    }))

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
