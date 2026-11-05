import { describe, expect, it } from 'vitest'
import { nextSort, sortRows } from './sortRows'

const col = (rows: string[][]) => rows.map((r) => r[0])

describe('sortRows', () => {
  it('sorts numbers numerically, not alphabetically', () => {
    const rows = [['10'], ['9'], ['100']]
    expect(col(sortRows(rows, 0, 'number', 'asc'))).toEqual(['9', '10', '100'])
    expect(col(sortRows(rows, 0, 'number', 'desc'))).toEqual(['100', '10', '9'])
  })

  it('sorts dates chronologically', () => {
    const rows = [['2025-12-01'], ['2025-02-15'], ['2024-12-31']]
    expect(col(sortRows(rows, 0, 'date', 'asc'))).toEqual(['2024-12-31', '2025-02-15', '2025-12-01'])
  })

  it('sorts text case-insensitively', () => {
    const rows = [['banana'], ['Apple'], ['cherry']]
    expect(col(sortRows(rows, 0, 'text', 'asc'))).toEqual(['Apple', 'banana', 'cherry'])
    expect(col(sortRows(rows, 0, 'text', 'desc'))).toEqual(['cherry', 'banana', 'Apple'])
  })

  it('puts missing and unparseable values last in both directions', () => {
    const rows = [[''], ['2'], ['n/a'], ['1']]
    expect(col(sortRows(rows, 0, 'number', 'asc'))).toEqual(['1', '2', '', 'n/a'])
    expect(col(sortRows(rows, 0, 'number', 'desc'))).toEqual(['2', '1', '', 'n/a'])
  })

  it('is stable for equal keys', () => {
    const rows = [['1', 'a'], ['1', 'b'], ['0', 'c']]
    expect(sortRows(rows, 0, 'number', 'asc').map((r) => r[1])).toEqual(['c', 'a', 'b'])
  })

  it('handles short rows and does not mutate the input', () => {
    const rows = [['2', 'x'], ['1']]
    const copy = rows.map((r) => [...r])
    expect(sortRows(rows, 1, 'text', 'asc').map((r) => r[0])).toEqual(['2', '1'])
    expect(rows).toEqual(copy)
  })
})

describe('nextSort', () => {
  it('cycles ascending, descending, none', () => {
    const a = nextSort(null, 2)
    expect(a).toEqual({ column: 2, direction: 'asc' })
    const d = nextSort(a, 2)
    expect(d).toEqual({ column: 2, direction: 'desc' })
    expect(nextSort(d, 2)).toBeNull()
  })

  it('starts ascending when another column is chosen', () => {
    expect(nextSort({ column: 1, direction: 'desc' }, 3)).toEqual({ column: 3, direction: 'asc' })
  })
})
