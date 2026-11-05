import { describe, expect, it } from 'vitest'
import {
  defaultTitle,
  sanitizeConfigs,
  validateConfig,
  xColumns,
  yColumns,
  type ChartConfig,
  type ColumnInfo,
} from './chartConfig'

const columns: ColumnInfo[] = [
  { name: 'region', type: 'text' },
  { name: 'day', type: 'date' },
  { name: 'sales', type: 'number' },
  { name: 'units', type: 'number' },
]

const cfg = (over: Partial<ChartConfig>): ChartConfig => ({
  id: 'a1',
  type: 'bar',
  title: 't',
  x: 'region',
  agg: 'count',
  ...over,
})

describe('column choices', () => {
  it('offers the right X columns per chart type', () => {
    expect(xColumns('bar', columns)).toHaveLength(4)
    expect(xColumns('pie', columns)).toHaveLength(4)
    expect(xColumns('line', columns).map((c) => c.name)).toEqual(['day', 'sales', 'units'])
    expect(xColumns('scatter', columns).map((c) => c.name)).toEqual(['sales', 'units'])
  })

  it('offers only number columns as measures', () => {
    expect(yColumns(columns).map((c) => c.name)).toEqual(['sales', 'units'])
  })
})

describe('validateConfig', () => {
  it('accepts valid configs', () => {
    expect(validateConfig(cfg({}), columns)).toBeNull()
    expect(validateConfig(cfg({ agg: 'sum', y: 'sales' }), columns)).toBeNull()
    expect(validateConfig(cfg({ type: 'line', x: 'day', agg: 'avg', y: 'sales' }), columns)).toBeNull()
    expect(validateConfig(cfg({ type: 'scatter', x: 'sales', y: 'units' }), columns)).toBeNull()
  })

  it('rejects unknown columns', () => {
    expect(validateConfig(cfg({ x: 'nope' }), columns)).toMatch(/"nope" is not in this file/)
    expect(validateConfig(cfg({ agg: 'sum', y: 'gone' }), columns)).toMatch(/"gone" is not in this file/)
  })

  it('requires a number measure unless counting', () => {
    expect(validateConfig(cfg({ agg: 'sum' }), columns)).toMatch(/Choose the number column/)
    expect(validateConfig(cfg({ agg: 'sum', y: 'region' }), columns)).toMatch(/not a number column/)
  })

  it('enforces axis types for line and scatter', () => {
    expect(validateConfig(cfg({ type: 'line', x: 'region' }), columns)).toMatch(/date or number/)
    expect(validateConfig(cfg({ type: 'scatter', x: 'region', y: 'sales' }), columns)).toMatch(/two number columns/)
    expect(validateConfig(cfg({ type: 'scatter', x: 'sales' }), columns)).toMatch(/Y axis/)
  })
})

describe('defaultTitle', () => {
  it('describes each kind of chart', () => {
    expect(defaultTitle({ type: 'bar', x: 'region', agg: 'count' })).toBe('Count by region')
    expect(defaultTitle({ type: 'pie', x: 'region', agg: 'sum', y: 'sales' })).toBe('Sum of sales by region')
    expect(defaultTitle({ type: 'line', x: 'day', agg: 'avg', y: 'sales' })).toBe('Average of sales over day')
    expect(defaultTitle({ type: 'scatter', x: 'sales', y: 'units', agg: 'count' })).toBe('units vs sales')
  })
})

describe('sanitizeConfigs', () => {
  it('keeps valid configs and only the known fields', () => {
    const input = [{ ...cfg({ agg: 'sum', y: 'sales' }), rows: [['secret']], values: [1, 2, 3], data: 'x' }]
    const [out] = sanitizeConfigs(input)
    expect(out).toEqual({ id: 'a1', type: 'bar', title: 't', x: 'region', agg: 'sum', y: 'sales' })
    expect(JSON.stringify(out)).not.toContain('secret')
  })

  it('skips malformed entries', () => {
    const bad = [
      null,
      'text',
      { ...cfg({}), type: 'radar' },
      { ...cfg({}), agg: 'median' },
      { ...cfg({}), x: '' },
      { ...cfg({}), id: 5 },
      { ...cfg({}), y: 7 },
      { ...cfg({}), title: 'x'.repeat(500) },
    ]
    expect(sanitizeConfigs(bad)).toEqual([])
    expect(sanitizeConfigs('nope')).toEqual([])
    expect(sanitizeConfigs(undefined)).toEqual([])
  })

  it('limits the number of charts', () => {
    const many = Array.from({ length: 80 }, (_, i) => cfg({ id: `id${i}` }))
    expect(sanitizeConfigs(many)).toHaveLength(50)
  })
})
