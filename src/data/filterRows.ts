import { isMissing, parseNumber, type ColumnType } from './inferTypes'

/** Text/date columns: case-insensitive "contains". Number columns: inclusive min/max. */
export type ColumnFilter = { contains?: string } | { min?: number; max?: number }

export interface FilterState {
  search: string
  columns: Record<number, ColumnFilter>
}

export const emptyFilters = (): FilterState => ({ search: '', columns: {} })

function hasContains(f: ColumnFilter): f is { contains?: string } {
  return 'contains' in f
}

function isActive(f: ColumnFilter): boolean {
  if (hasContains(f)) return !!f.contains?.trim()
  const r = f as { min?: number; max?: number }
  return isFiniteNumber(r.min) || isFiniteNumber(r.max)
}

function isFiniteNumber(n: number | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

export function hasActiveFilters(state: FilterState): boolean {
  return !!state.search.trim() || Object.values(state.columns).some(isActive)
}

function matchesColumn(value: string | undefined, filter: ColumnFilter, type: ColumnType): boolean {
  if (!isActive(filter)) return true
  if (hasContains(filter)) {
    return (value ?? '').toLowerCase().includes((filter.contains as string).trim().toLowerCase())
  }
  if (type !== 'number' || isMissing(value)) return false
  const n = parseNumber(value)
  if (n === null) return false
  if (isFiniteNumber(filter.min) && n < filter.min) return false
  if (isFiniteNumber(filter.max) && n > filter.max) return false
  return true
}

/** Returns the rows that satisfy the global search AND every active column filter. */
export function filterRows(rows: string[][], types: ColumnType[], state: FilterState): string[][] {
  const search = state.search.trim().toLowerCase()
  const active = Object.entries(state.columns)
    .map(([c, f]) => [Number(c), f] as const)
    .filter(([, f]) => isActive(f))
  if (!search && active.length === 0) return rows
  return rows.filter(
    (row) =>
      (!search || row.some((cell) => cell.toLowerCase().includes(search))) &&
      active.every(([c, f]) => matchesColumn(row[c], f, types[c] ?? 'text')),
  )
}
