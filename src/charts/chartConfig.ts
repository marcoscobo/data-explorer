import type { ColumnType } from '../data/inferTypes'

export type ChartType = 'bar' | 'line' | 'pie' | 'scatter'
export type Aggregation = 'count' | 'sum' | 'avg' | 'min' | 'max'

/**
 * A saved chart. It holds ONLY choices (type, column names, aggregation, title) and never any
 * cell value from the data. Every saved or exported chart passes through sanitizeConfigs.
 */
export interface ChartConfig {
  id: string
  type: ChartType
  title: string
  /** Column name for the X axis / categories. */
  x: string
  /** Column name for the measure (Y axis). Not used when agg is "count" (except scatter). */
  y?: string
  agg: Aggregation
}

export interface ColumnInfo {
  name: string
  type: ColumnType
}

export const CHART_TYPES: ChartType[] = ['bar', 'line', 'pie', 'scatter']
export const AGGREGATIONS: Aggregation[] = ['count', 'sum', 'avg', 'min', 'max']

export const MAX_CHARTS = 50
const MAX_TEXT = 200

export const CHART_TYPE_LABELS: Record<ChartType, string> = {
  bar: 'Bar',
  line: 'Line',
  pie: 'Pie',
  scatter: 'Scatter',
}

export const AGG_LABELS: Record<Aggregation, string> = {
  count: 'Count of rows',
  sum: 'Sum',
  avg: 'Average',
  min: 'Minimum',
  max: 'Maximum',
}

/** Columns that can be used as X for each chart type. */
export function xColumns(type: ChartType, columns: ColumnInfo[]): ColumnInfo[] {
  if (type === 'line') return columns.filter((c) => c.type === 'date' || c.type === 'number')
  if (type === 'scatter') return columns.filter((c) => c.type === 'number')
  return columns
}

/** Columns that can be used as the measure. */
export function yColumns(columns: ColumnInfo[]): ColumnInfo[] {
  return columns.filter((c) => c.type === 'number')
}

export function defaultTitle(c: Pick<ChartConfig, 'type' | 'x' | 'y' | 'agg'>): string {
  if (c.type === 'scatter') return `${c.y ?? ''} vs ${c.x}`
  const what = c.agg === 'count' || !c.y ? 'Count' : `${AGG_LABELS[c.agg]} of ${c.y}`
  return c.type === 'line' ? `${what} over ${c.x}` : `${what} by ${c.x}`
}

/** Returns a plain-language problem with the config for these columns, or null when it is valid. */
export function validateConfig(config: ChartConfig, columns: ColumnInfo[]): string | null {
  const col = (name: string | undefined) => columns.find((c) => c.name === name)
  const x = col(config.x)
  if (!x) return `The column "${config.x}" is not in this file.`
  if (!xColumns(config.type, columns).includes(x)) {
    return config.type === 'scatter'
      ? 'A scatter chart needs two number columns.'
      : 'A line chart needs a date or number column on the X axis.'
  }
  if (config.type === 'scatter' || config.agg !== 'count') {
    const y = col(config.y)
    if (!config.y) return config.type === 'scatter' ? 'Choose the column for the Y axis.' : 'Choose the number column to summarize.'
    if (!y) return `The column "${config.y}" is not in this file.`
    if (y.type !== 'number') return `"${y.name}" is not a number column.`
  }
  return null
}

const isString = (v: unknown, max = MAX_TEXT): v is string => typeof v === 'string' && v.length <= max

/**
 * Rebuilds configs from untrusted input (storage or an imported file), keeping ONLY the known fields.
 * Anything else, such as extra keys that could carry data, is dropped. Invalid entries are skipped.
 */
export function sanitizeConfigs(input: unknown): ChartConfig[] {
  if (!Array.isArray(input)) return []
  const out: ChartConfig[] = []
  for (const raw of input.slice(0, MAX_CHARTS)) {
    if (typeof raw !== 'object' || raw === null) continue
    const r = raw as Record<string, unknown>
    if (!CHART_TYPES.includes(r.type as ChartType) || !AGGREGATIONS.includes(r.agg as Aggregation)) continue
    if (!isString(r.id, 64) || !isString(r.title) || !isString(r.x) || r.x === '') continue
    if (r.y !== undefined && !isString(r.y)) continue
    const cfg: ChartConfig = { id: r.id, type: r.type as ChartType, title: r.title, x: r.x, agg: r.agg as Aggregation }
    if (typeof r.y === 'string' && r.y !== '') cfg.y = r.y
    out.push(cfg)
  }
  return out
}
