import { describe, expect, it } from 'vitest'
import { inferType, inferTypes, isMissing, parseDate, parseNumber } from './inferTypes'

describe('parseNumber', () => {
  it('parses integers, decimals, signs and exponents', () => {
    expect(parseNumber('42')).toBe(42)
    expect(parseNumber(' -3.5 ')).toBe(-3.5)
    expect(parseNumber('.5')).toBe(0.5)
    expect(parseNumber('1e3')).toBe(1000)
  })

  it('rejects other formats', () => {
    for (const v of ['', 'abc', '45,50', '1,000', '12abc', '--1', undefined]) {
      expect(parseNumber(v)).toBeNull()
    }
  })
})

describe('parseDate', () => {
  it('parses valid ISO dates', () => {
    expect(parseDate('2025-03-13')).toBe(Date.UTC(2025, 2, 13))
  })

  it('rejects other formats and impossible dates', () => {
    for (const v of ['13/03/2025', '2025-13-01', '2025-02-30', '2025-3-1', 'x', '', undefined]) {
      expect(parseDate(v)).toBeNull()
    }
  })
})

describe('isMissing', () => {
  it('treats empty and whitespace as missing', () => {
    expect(isMissing('')).toBe(true)
    expect(isMissing('  ')).toBe(true)
    expect(isMissing(undefined)).toBe(true)
    expect(isMissing('0')).toBe(false)
  })
})

describe('inferType', () => {
  it('detects numbers, dates and text', () => {
    expect(inferType(['1', '2.5', '3'])).toBe('number')
    expect(inferType(['2025-01-01', '2025-02-01'])).toBe('date')
    expect(inferType(['a', 'b'])).toBe('text')
  })

  it('ignores missing values', () => {
    expect(inferType(['1', '', '2', undefined])).toBe('number')
  })

  it('tolerates up to 10% non-matching values', () => {
    const nineOfTen = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'n/a']
    expect(inferType(nineOfTen)).toBe('number')
    expect(inferType(['1', '2', 'x', 'y'])).toBe('text')
  })

  it('treats an all-empty column as text', () => {
    expect(inferType(['', ' '])).toBe('text')
  })

  it('treats comma decimals as text', () => {
    expect(inferType(['45,50', '25,00'])).toBe('text')
  })
})

describe('inferTypes', () => {
  it('infers one type per column and handles short rows', () => {
    const rows = [['Ana', '30', '2025-01-01'], ['Luis', '25']]
    expect(inferTypes(['n', 'age', 'since'], rows)).toEqual(['text', 'number', 'date'])
  })
})
