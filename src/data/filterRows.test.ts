import { describe, expect, it } from 'vitest'
import { emptyFilters, filterRows, hasActiveFilters } from './filterRows'
import type { ColumnType } from './inferTypes'

const types: ColumnType[] = ['text', 'number', 'date']
const rows = [
  ['Ana', '30', '2025-01-10'],
  ['Luis', '25', '2025-02-20'],
  ['Marta', '', '2025-02-25'],
  ['anabel', '41', ''],
]
const names = (r: string[][]) => r.map((x) => x[0])

describe('filterRows', () => {
  it('returns all rows when nothing is active', () => {
    expect(filterRows(rows, types, emptyFilters())).toBe(rows)
    expect(filterRows(rows, types, { search: '  ', columns: { 0: { contains: ' ' } } })).toBe(rows)
  })

  it('searches every column, case-insensitively', () => {
    expect(names(filterRows(rows, types, { search: 'ANA', columns: {} }))).toEqual(['Ana', 'anabel'])
    expect(names(filterRows(rows, types, { search: '2025-02', columns: {} }))).toEqual(['Luis', 'Marta'])
  })

  it('filters text columns by contains', () => {
    expect(names(filterRows(rows, types, { search: '', columns: { 0: { contains: 'a' } } }))).toEqual([
      'Ana', 'Marta', 'anabel',
    ])
  })

  it('filters date columns by contains', () => {
    expect(names(filterRows(rows, types, { search: '', columns: { 2: { contains: '2025-02' } } }))).toEqual([
      'Luis', 'Marta',
    ])
  })

  it('filters numbers by inclusive min and max and drops missing values', () => {
    const f = (min?: number, max?: number) => names(filterRows(rows, types, { search: '', columns: { 1: { min, max } } }))
    expect(f(25, 30)).toEqual(['Ana', 'Luis'])
    expect(f(31)).toEqual(['anabel'])
    expect(f(undefined, 25)).toEqual(['Luis'])
  })

  it('ignores non-finite bounds', () => {
    expect(filterRows(rows, types, { search: '', columns: { 1: { min: NaN, max: undefined } } })).toBe(rows)
  })

  it('combines search and column filters with AND', () => {
    const state = { search: 'ana', columns: { 1: { min: 35 } } }
    expect(names(filterRows(rows, types, state))).toEqual(['anabel'])
  })

  it('returns no rows when nothing matches and handles short rows', () => {
    expect(filterRows(rows, types, { search: 'zzz', columns: {} })).toEqual([])
    expect(filterRows([['Ana']], types, { search: '', columns: { 1: { min: 1 } } })).toEqual([])
  })
})

describe('hasActiveFilters', () => {
  it('detects active filters', () => {
    expect(hasActiveFilters(emptyFilters())).toBe(false)
    expect(hasActiveFilters({ search: 'x', columns: {} })).toBe(true)
    expect(hasActiveFilters({ search: '', columns: { 1: { min: 0 } } })).toBe(true)
    expect(hasActiveFilters({ search: '', columns: { 0: { contains: '' } } })).toBe(false)
  })
})
