import { isMissing, parseDate, parseNumber, type ColumnType } from './inferTypes'

export interface NumberStats {
  min: number
  max: number
  mean: number
  median: number
  /** Sample standard deviation (n - 1); null with fewer than 2 values. */
  stdDev: number | null
}

export interface ColumnStats {
  name: string
  type: ColumnType
  /** Non-empty cells. */
  filled: number
  /** Empty cells. */
  missing: number
  /** Distinct non-empty values. */
  unique: number
  numbers?: NumberStats
  /** Earliest and latest date, as ISO strings (YYYY-MM-DD). */
  dates?: { min: string; max: string }
  /** Most frequent values of a text column. */
  top?: { value: string; count: number }[]
}

const TOP_N = 5

function numberStats(values: number[]): NumberStats | undefined {
  if (values.length === 0) return undefined
  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  const mean = sorted.reduce((s, v) => s + v, 0) / n
  const mid = Math.floor(n / 2)
  const median = n % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
  const variance = n > 1 ? sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1) : null
  return { min: sorted[0]!, max: sorted[n - 1]!, mean, median, stdDev: variance === null ? null : Math.sqrt(variance) }
}

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)

export function computeStats(headers: string[], rows: string[][], types: ColumnType[]): ColumnStats[] {
  return headers.map((name, c) => {
    const type = types[c] ?? 'text'
    const cells = rows.map((r) => r[c])
    const filledCells = cells.filter((v) => !isMissing(v)).map((v) => (v as string).trim())
    const stats: ColumnStats = {
      name,
      type,
      filled: filledCells.length,
      missing: cells.length - filledCells.length,
      unique: new Set(filledCells).size,
    }
    if (type === 'number') {
      const ns = numberStats(filledCells.map(parseNumber).filter((n): n is number => n !== null))
      if (ns) stats.numbers = ns
    } else if (type === 'date') {
      const ds = filledCells.map(parseDate).filter((d): d is number => d !== null)
      if (ds.length) stats.dates = { min: iso(Math.min(...ds)), max: iso(Math.max(...ds)) }
    } else {
      const counts = new Map<string, number>()
      for (const v of filledCells) counts.set(v, (counts.get(v) ?? 0) + 1)
      stats.top = [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, TOP_N)
        .map(([value, count]) => ({ value, count }))
    }
    return stats
  })
}
