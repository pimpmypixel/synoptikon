import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), '..', 'posters.db')

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')
    _db.exec(`
      CREATE TABLE IF NOT EXISTS posters (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'map',
        city TEXT NOT NULL,
        country TEXT NOT NULL,
        theme TEXT NOT NULL DEFAULT 'feature_based',
        format TEXT NOT NULL DEFAULT 'png',
        distance INTEGER NOT NULL DEFAULT 10000,
        landscape INTEGER NOT NULL DEFAULT 0,
        title_font TEXT,
        subtitle_font TEXT,
        paper_size TEXT,
        rotation REAL DEFAULT 0,
        border REAL DEFAULT 0,
        lat REAL,
        lon REAL,
        width_cm REAL,
        height_cm REAL,
        file_size INTEGER,
        thumbnail TEXT,
        created_at TEXT NOT NULL
      )
    `)

    // Migration: add type column to existing databases
    const columns = _db.pragma('table_info(posters)') as { name: string }[]
    if (!columns.some(c => c.name === 'type')) {
      _db.exec(`ALTER TABLE posters ADD COLUMN type TEXT NOT NULL DEFAULT 'map'`)
    }

    // Migration: rename night-sky → your-sky
    _db.exec(`UPDATE posters SET type='your-sky' WHERE type='night-sky'`)
  }
  return _db
}

export function generatePosterId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

export interface PosterRecord {
  id: string
  filename: string
  type: 'map' | 'your-sky'
  city: string
  country: string
  theme: string
  format: string
  distance: number
  landscape: boolean
  titleFont?: string
  subtitleFont?: string
  paperSize?: string
  rotation?: number
  border?: number
  lat?: number
  lon?: number
  widthCm?: number
  heightCm?: number
  fileSize?: number
  thumbnail?: string
  createdAt: string
}

export function listPosters(): PosterRecord[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM posters ORDER BY created_at DESC').all() as any[]
  return rows.map(rowToRecord)
}

export function getPoster(id: string): PosterRecord | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM posters WHERE id = ?').get(id) as any
  return row ? rowToRecord(row) : null
}

export function getPosterByFilename(filename: string): PosterRecord | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM posters WHERE filename = ?').get(filename) as any
  return row ? rowToRecord(row) : null
}

export function insertPoster(record: PosterRecord): void {
  const db = getDb()
  db.prepare(`
    INSERT INTO posters (id, filename, type, city, country, theme, format, distance, landscape,
      title_font, subtitle_font, paper_size, rotation, border, lat, lon,
      width_cm, height_cm, file_size, thumbnail, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    record.id,
    record.filename,
    record.type,
    record.city,
    record.country,
    record.theme,
    record.format,
    record.distance,
    record.landscape ? 1 : 0,
    record.titleFont ?? null,
    record.subtitleFont ?? null,
    record.paperSize ?? null,
    record.rotation ?? 0,
    record.border ?? 0,
    record.lat ?? null,
    record.lon ?? null,
    record.widthCm ?? null,
    record.heightCm ?? null,
    record.fileSize ?? null,
    record.thumbnail ?? null,
    record.createdAt,
  )
}

export function deletePoster(id: string): void {
  const db = getDb()
  db.prepare('DELETE FROM posters WHERE id = ?').run(id)
}

export function deletePosterByFilename(filename: string): void {
  const db = getDb()
  db.prepare('DELETE FROM posters WHERE filename = ?').run(filename)
}

function rowToRecord(row: any): PosterRecord {
  return {
    id: row.id,
    filename: row.filename,
    type: row.type || 'map',
    city: row.city,
    country: row.country,
    theme: row.theme,
    format: row.format,
    distance: row.distance,
    landscape: !!row.landscape,
    titleFont: row.title_font,
    subtitleFont: row.subtitle_font,
    paperSize: row.paper_size,
    rotation: row.rotation,
    border: row.border,
    lat: row.lat,
    lon: row.lon,
    widthCm: row.width_cm,
    heightCm: row.height_cm,
    fileSize: row.file_size,
    thumbnail: row.thumbnail,
    createdAt: row.created_at,
  }
}
