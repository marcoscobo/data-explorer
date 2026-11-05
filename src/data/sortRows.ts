import { isMissing, parseDate, parseNumber, type ColumnType } from './inferTypes'

export type SortDirection = 'asc' | 'desc'
export interface SortState {
  column: number
  direction: SortDirection
}

function key(value: string | undefined, type: ColumnType): number | string | null {
  if (isMissing(value)) return null
  if (type === 'number') return parseNumber(value)
  if (type === 'date') return parseDate(value)
  return (value as string).trim()
}

/** Returns a new, stably sorted array. Missing (and unparseable) values always go last. */
export function sortRows(rows: string[][], column: number, type: ColumnType, direction: SortDirection): string[][] {
  const sign = direction === 'asc' ? 1 : -1
  return rows
    .map((row) => ({ row, k: key(row[column], type) }))
    .sort((a, b) => {
      if (a.k === null && b.k === null) return 0
      if (a.k === null) return 1
      if (b.k === null) return -1
      if (typeof a.k === 'number' && typeof b.k === 'number') return sign * (a.k - b.k)
      return sign * String(a.k).localeCompare(String(b.k), undefined, { sensitivity: 'base' })
    })
    .map(({ row }) => row)
}

/** Click cycle for a column header: ascending, then descending, then back to the original order. */
export function nextSort(current: SortState | null, column: number): SortState | null {
  if (!current || current.column !== column) return { column, direction: 'asc' }
  return current.direction === 'asc' ? { column, direction: 'desc' } : null
}
