import { describe, expect, it } from 'vitest'
import { computeStats } from './computeStats'
import type { ColumnType } from './inferTypes'

describe('computeStats', () => {
  it('counts filled, missing and unique values', () => {
    const [s] = computeStats(['a'], [['x'], ['x'], [''], ['y'], []], ['text'])
    expect(s).toMatchObject({ name: 'a', type: 'text', filled: 3, missing: 2, unique: 2 })
  })

  it('computes numeric statistics (odd count)', () => {
    const [s] = computeStats(['n'], [['1'], ['2'], ['3'], ['4'], ['10']], ['number'])
    expect(s!.numbers).toMatchObject({ min: 1, max: 10, mean: 4, median: 3 })
    expect(s!.numbers!.stdDev).toBeCloseTo(3.5355, 3)
  })

  it('computes the median of an even count', () => {
    const [s] = computeStats(['n'], [['1'], ['2'], ['3'], ['4']], ['number'])
    expect(s!.numbers!.median).toBe(2.5)
  })

  it('uses null std dev for a single value and skips missing numbers', () => {
    const [s] = computeStats(['n'], [['5'], ['']], ['number'])
    expect(s!.numbers).toMatchObject({ min: 5, max: 5, mean: 5, median: 5, stdDev: null })
    expect(s!.missing).toBe(1)
  })

  it('ignores unparseable values in a number column', () => {
    const [s] = computeStats(['n'], [['1'], ['3'], ['n/a']], ['number'])
    expect(s!.numbers).toMatchObject({ min: 1, max: 3, mean: 2 })
    expect(s!.filled).toBe(3)
  })

  it('gives earliest and latest dates', () => {
    const [s] = computeStats(['d'], [['2025-03-01'], ['2024-12-31'], ['2025-01-15']], ['date'])
    expect(s!.dates).toEqual({ min: '2024-12-31', max: '2025-03-01' })
  })

  it('lists the top 5 text values by frequency, ties alphabetical', () => {
    const rows = ['b', 'a', 'a', 'c', 'c', 'c', 'd', 'e', 'f', 'g'].map((v) => [v])
    const [s] = computeStats(['t'], rows, ['text'])
    expect(s!.top).toEqual([
      { value: 'c', count: 3 },
      { value: 'a', count: 2 },
      { value: 'b', count: 1 },
      { value: 'd', count: 1 },
      { value: 'e', count: 1 },
    ])
  })

  it('handles empty data and several columns', () => {
    const types: ColumnType[] = ['text', 'number']
    const stats = computeStats(['a', 'b'], [], types)
    expect(stats).toHaveLength(2)
    expect(stats[1]).toMatchObject({ filled: 0, missing: 0, unique: 0 })
    expect(stats[1]!.numbers).toBeUndefined()
  })
})
