import { describe, expect, it } from 'vitest'
import {
  BAR_LIMIT,
  buildChartData,
  chartOption,
  OTHER,
  PIE_LIMIT,
  SCATTER_LIMIT,
  type ChartData,
  type ChartStyle,
} from './buildChartData'
import type { ChartConfig } from './chartConfig'
import type { ColumnType } from '../data/inferTypes'

const headers = ['region', 'day', 'sales', 'units']
const types: ColumnType[] = ['text', 'date', 'number', 'number']
const rows = [
  ['North', '2025-01-02', '10', '1'],
  ['South', '2025-01-01', '30', '3'],
  ['North', '2025-01-02', '20', '2'],
  ['', '2025-01-03', '5', '5'],
  ['South', '2025-01-03', '', '4'],
]
const cfg = (over: Partial<ChartConfig>): ChartConfig => ({ id: 'a', type: 'bar', title: 't', x: 'region', agg: 'count', ...over })
const build = (c: ChartConfig, r = rows) => buildChartData(c, headers, r, types)

describe('categories (bar and pie)', () => {
  it('counts rows per category, biggest first, ignoring empty categories', () => {
    expect(build(cfg({}))).toEqual({ kind: 'categories', labels: ['North', 'South'], values: [2, 2] })
  })

  it('aggregates a number column', () => {
    const sum = build(cfg({ agg: 'sum', y: 'sales' }))
    expect(sum).toEqual({ kind: 'categories', labels: ['North', 'South'], values: [30, 30] }) // tie: alphabetical
  })

  it('computes avg, min and max, skipping empty numbers', () => {
    const by = (agg: ChartConfig['agg']) => {
      const d = build(cfg({ agg, y: 'sales' }))
      return d.kind === 'categories' ? Object.fromEntries(d.labels.map((l, i) => [l, d.values[i]])) : null
    }
    expect(by('avg')).toEqual({ North: 15, South: 30 })
    expect(by('min')).toEqual({ North: 10, South: 30 })
    expect(by('max')).toEqual({ North: 20, South: 30 })
  })

  it('groups the smallest bar categories as Other with exact aggregates', () => {
    const many = Array.from({ length: BAR_LIMIT + 5 }, (_, i) => [`c${String(i).padStart(2, '0')}`, '2025-01-01', '1', '1'])
    const d = build(cfg({}), many)
    expect(d.kind === 'categories' && d.labels).toHaveLength(BAR_LIMIT + 1)
    expect(d.kind === 'categories' && d.labels.at(-1)).toBe(OTHER)
    expect(d.kind === 'categories' && d.values.at(-1)).toBe(5)
    expect(d.kind === 'categories' && d.notice).toMatch(/5 smallest categories/)
  })

  it('does not create an Other group for a single extra category', () => {
    const rows21 = Array.from({ length: BAR_LIMIT + 1 }, (_, i) => [`c${i}`, '2025-01-01', '1', '1'])
    const d = build(cfg({}), rows21)
    expect(d.kind === 'categories' && d.labels).toHaveLength(BAR_LIMIT + 1)
    expect(d.kind === 'categories' && d.labels).not.toContain(OTHER)
  })

  it('limits pie charts to the palette size and drops non-positive values', () => {
    const many = Array.from({ length: PIE_LIMIT + 4 }, (_, i) => [`c${i}`, '2025-01-01', String(i - 1), '1'])
    const d = build(cfg({ type: 'pie', agg: 'sum', y: 'sales' }), many)
    expect(d.kind === 'categories' && d.notice).toMatch(/negative/i)
    expect(d.kind === 'categories' && d.values.every((v) => v > 0)).toBe(true)
    expect(d.kind === 'categories' && d.labels.length).toBeLessThanOrEqual(PIE_LIMIT + 1)
  })

  it('is empty when no category has a value', () => {
    expect(build(cfg({ agg: 'sum', y: 'sales' }), [['A', '2025-01-01', '', '1']]).kind).toBe('empty')
  })
})

describe('line', () => {
  it('aggregates per date and sorts chronologically', () => {
    const d = build(cfg({ type: 'line', x: 'day', agg: 'sum', y: 'sales' }))
    expect(d).toEqual({
      kind: 'series',
      xIsDate: true,
      points: [
        [Date.UTC(2025, 0, 1), 30],
        [Date.UTC(2025, 0, 2), 30],
        [Date.UTC(2025, 0, 3), 5],
      ],
    })
  })

  it('works with a number X axis and counts', () => {
    const d = build(cfg({ type: 'line', x: 'units', agg: 'count' }))
    expect(d.kind === 'series' && d.xIsDate).toBe(false)
    expect(d.kind === 'series' && d.points.map((p) => p[0])).toEqual([1, 2, 3, 4, 5])
  })
})

describe('scatter', () => {
  it('uses rows where both values are numbers', () => {
    const d = build(cfg({ type: 'scatter', x: 'units', y: 'sales' }))
    expect(d).toEqual({ kind: 'points', points: [[1, 10], [3, 30], [2, 20], [5, 5]] })
  })

  it('samples evenly above the limit and says so', () => {
    const big = Array.from({ length: SCATTER_LIMIT * 2 }, (_, i) => ['A', '2025-01-01', String(i), String(i)])
    const d = build(cfg({ type: 'scatter', x: 'units', y: 'sales' }), big)
    expect(d.kind === 'points' && d.points).toHaveLength(SCATTER_LIMIT)
    expect(d.kind === 'points' && d.points[0]).toEqual([0, 0])
    expect(d.kind === 'points' && d.notice).toMatch(/5,000 of 10,000 points/)
  })
})

describe('edge cases', () => {
  it('returns an empty result with a helpful message', () => {
    expect(build(cfg({}), [])).toMatchObject({ kind: 'empty', message: expect.stringMatching(/No rows/) })
    expect(build(cfg({ x: 'nope' }))).toMatchObject({ kind: 'empty' })
    expect(build(cfg({ agg: 'sum' }))).toMatchObject({ kind: 'empty' })
    expect(build(cfg({ type: 'scatter', x: 'sales' }))).toMatchObject({ kind: 'empty' })
  })
})

const style: ChartStyle = { text: '#111', muted: '#666', border: '#ddd', surface: '#fff', series: ['#1', '#2', '#3'], other: '#999' }

describe('chartOption', () => {
  it('maps bar data with the first series color and Other in gray', () => {
    const data: ChartData = { kind: 'categories', labels: ['A', OTHER], values: [2, 1] }
    const o = chartOption(data, cfg({}), style) as { series: { type: string; itemStyle: { color: string }; data: unknown[] }[] }
    expect(o.series[0]!.type).toBe('bar')
    expect(o.series[0]!.itemStyle.color).toBe('#1')
    expect(o.series[0]!.data[1]).toEqual({ value: 1, itemStyle: { color: '#999' } })
  })

  it('maps pie data using colors in fixed order with a legend', () => {
    const data: ChartData = { kind: 'categories', labels: ['A', 'B', OTHER], values: [3, 2, 1] }
    const o = chartOption(data, cfg({ type: 'pie' }), style) as { legend: unknown; series: { type: string; data: { itemStyle: { color: string } }[] }[] }
    expect(o.legend).toBeTruthy()
    expect(o.series[0]!.type).toBe('pie')
    expect(o.series[0]!.data.map((d) => d.itemStyle.color)).toEqual(['#1', '#2', '#999'])
  })

  it('uses a time axis for date lines and 2px line width', () => {
    const data: ChartData = { kind: 'series', xIsDate: true, points: [[1, 2]] }
    const o = chartOption(data, cfg({ type: 'line', x: 'day' }), style) as { xAxis: { type: string }; series: { lineStyle: { width: number } }[] }
    expect(o.xAxis.type).toBe('time')
    expect(o.series[0]!.lineStyle.width).toBe(2)
  })

  it('names both axes for scatter and enables aria', () => {
    const data: ChartData = { kind: 'points', points: [[1, 2]] }
    const o = chartOption(data, cfg({ type: 'scatter', x: 'units', y: 'sales' }), style) as { xAxis: { name: string }; yAxis: { name: string }; aria: { enabled: boolean } }
    expect(o.xAxis.name).toBe('units')
    expect(o.yAxis.name).toBe('sales')
    expect(o.aria.enabled).toBe(true)
  })

  it('returns a bare option for empty data', () => {
    const o = chartOption({ kind: 'empty', message: 'm' }, cfg({}), style) as { series?: unknown }
    expect(o.series).toBeUndefined()
  })
})
