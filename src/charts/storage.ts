import { sanitizeConfigs, validateConfig, type ChartConfig, type ColumnInfo } from './chartConfig'

/**
 * Only chart CONFIGURATION is ever stored or exported (chart type, column names, aggregation, title).
 * Rows and cell values are never written anywhere. Everything passes through sanitizeConfigs, which
 * keeps only the whitelisted fields.
 */

const STORAGE_PREFIX = 'data-explorer-dashboard:'
export const EXPORT_VERSION = 1
const MAX_IMPORT_CHARS = 1_000_000

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

/** Identifies "the same kind of file" by its column names and types (djb2 hash), never by content. */
export function fingerprint(columns: ColumnInfo[]): string {
  const text = columns.map((c) => `${c.name}:${c.type}`).join('\u0001')
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0
  return h.toString(16)
}

export function loadDashboard(fp: string): ChartConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + fp)
    return raw ? sanitizeConfigs(JSON.parse(raw)) : []
  } catch {
    return []
  }
}

/** Returns false when the browser blocks storage. */
export function saveDashboard(fp: string, charts: ChartConfig[]): boolean {
  try {
    localStorage.setItem(STORAGE_PREFIX + fp, JSON.stringify(sanitizeConfigs(charts)))
    return true
  } catch {
    return false
  }
}

export function exportConfig(charts: ChartConfig[]): string {
  return JSON.stringify({ version: EXPORT_VERSION, charts: sanitizeConfigs(charts) }, null, 2)
}

export type ImportResult = { ok: true; charts: ChartConfig[] } | { ok: false; error: string }

export function parseImport(text: string): ImportResult {
  if (text.length > MAX_IMPORT_CHARS) return { ok: false, error: 'This file is too large to be a chart configuration.' }
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'This file is not valid JSON, so it cannot be a chart configuration.' }
  }
  const obj = data as { version?: unknown; charts?: unknown } | null
  if (typeof obj !== 'object' || obj === null || !Array.isArray(obj.charts)) {
    return { ok: false, error: 'This file does not look like a Data Explorer chart configuration.' }
  }
  if (obj.version !== EXPORT_VERSION) {
    return { ok: false, error: 'This configuration was saved by an unsupported version of Data Explorer.' }
  }
  const charts = sanitizeConfigs(obj.charts)
  if (charts.length === 0 && obj.charts.length > 0) return { ok: false, error: 'No valid charts were found in this file.' }
  // Imported charts get fresh ids so they can never collide with existing ones.
  return { ok: true, charts: charts.map((c) => ({ ...c, id: newId() })) }
}

/** Splits charts into those that fit the current columns and those that refer to missing or wrong columns. */
export function partitionByColumns(charts: ChartConfig[], columns: ColumnInfo[]) {
  const valid: ChartConfig[] = []
  const skipped: { chart: ChartConfig; reason: string }[] = []
  for (const chart of charts) {
    const reason = validateConfig(chart, columns)
    if (reason) skipped.push({ chart, reason })
    else valid.push(chart)
  }
  return { valid, skipped }
}

/** Offers a text file for download. */
export function downloadText(filename: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
