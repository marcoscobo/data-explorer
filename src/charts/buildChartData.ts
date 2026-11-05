import type { EChartsOption } from 'echarts'
import { isMissing, parseDate, parseNumber, type ColumnType } from '../data/inferTypes'
import { AGG_LABELS, type Aggregation, type ChartConfig } from './chartConfig'

export type ChartData =
  | { kind: 'empty'; message: string }
  | { kind: 'categories'; labels: string[]; values: number[]; notice?: string }
  | { kind: 'series'; points: [number, number][]; xIsDate: boolean }
  | { kind: 'points'; points: [number, number][]; notice?: string }

export const BAR_LIMIT = 20
/** Pie slices use the categorical palette, which has 8 slots: 7 categories + "Other". */
export const PIE_LIMIT = 7
export const SCATTER_LIMIT = 5000
export const OTHER = 'Other'

const nf = new Intl.NumberFormat('en-US')
const empty = (message = 'There is no data to show for this selection.'): ChartData => ({ kind: 'empty', message })

interface Acc {
  rows: number
  n: number
  sum: number
  min: number
  max: number
}

const newAcc = (): Acc => ({ rows: 0, n: 0, sum: 0, min: Infinity, max: -Infinity })

function add(acc: Acc, y: number | null) {
  acc.rows++
  if (y === null) return
  acc.n++
  acc.sum += y
  acc.min = Math.min(acc.min, y)
  acc.max = Math.max(acc.max, y)
}

function merge(target: Acc, other: Acc) {
  target.rows += other.rows
  target.n += other.n
  target.sum += other.sum
  target.min = Math.min(target.min, other.min)
  target.max = Math.max(target.max, other.max)
}

/** The aggregated value, or null when there is nothing to aggregate. */
function valueOf(acc: Acc, agg: Aggregation): number | null {
  if (agg === 'count') return acc.rows
  if (acc.n === 0) return null
  if (agg === 'sum') return acc.sum
  if (agg === 'avg') return acc.sum / acc.n
  return agg === 'min' ? acc.min : acc.max
}

function categories(config: ChartConfig, x: number, y: number, rows: string[][]): ChartData {
  const groups = new Map<string, Acc>()
  for (const row of rows) {
    if (isMissing(row[x])) continue
    const key = (row[x] as string).trim()
    const acc = groups.get(key) ?? newAcc()
    add(acc, y >= 0 ? parseNumber(row[y]) : null)
    groups.set(key, acc)
  }
  let entries = [...groups.entries()]
    .map(([label, acc]) => ({ label, acc, value: valueOf(acc, config.agg) }))
    .filter((e): e is { label: string; acc: Acc; value: number } => e.value !== null)
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))

  const notices: string[] = []
  if (config.type === 'pie') {
    const before = entries.length
    entries = entries.filter((e) => e.value > 0)
    if (entries.length < before) notices.push('Zero and negative values are not shown in a pie chart.')
  }

  const limit = config.type === 'pie' ? PIE_LIMIT : BAR_LIMIT
  if (entries.length > limit + 1) {
    const rest = entries.slice(limit)
    const acc = newAcc()
    rest.forEach((e) => merge(acc, e.acc))
    const value = valueOf(acc, config.agg)
    entries = entries.slice(0, limit)
    if (value !== null) entries.push({ label: OTHER, acc, value })
    notices.push(`The ${nf.format(rest.length)} smallest categories are grouped as "${OTHER}".`)
  }
  if (entries.length === 0) return empty()
  return {
    kind: 'categories',
    labels: entries.map((e) => e.label),
    values: entries.map((e) => e.value),
    ...(notices.length ? { notice: notices.join(' ') } : {}),
  }
}

function series(config: ChartConfig, x: number, y: number, rows: string[][], xType: ColumnType): ChartData {
  const parseX = xType === 'date' ? parseDate : parseNumber
  const groups = new Map<number, Acc>()
  for (const row of rows) {
    const key = parseX(row[x])
    if (key === null) continue
    const acc = groups.get(key) ?? newAcc()
    add(acc, y >= 0 ? parseNumber(row[y]) : null)
    groups.set(key, acc)
  }
  const points = [...groups.entries()]
    .map(([key, acc]) => [key, valueOf(acc, config.agg)] as const)
    .filter((p): p is readonly [number, number] => p[1] !== null)
    .sort((a, b) => a[0] - b[0])
    .map((p): [number, number] => [p[0], p[1]])
  return points.length ? { kind: 'series', points, xIsDate: xType === 'date' } : empty()
}

function scatter(x: number, y: number, rows: string[][]): ChartData {
  const all: [number, number][] = []
  for (const row of rows) {
    const px = parseNumber(row[x])
    const py = parseNumber(row[y])
    if (px !== null && py !== null) all.push([px, py])
  }
  if (all.length === 0) return empty()
  if (all.length <= SCATTER_LIMIT) return { kind: 'points', points: all }
  const step = all.length / SCATTER_LIMIT
  const points = Array.from({ length: SCATTER_LIMIT }, (_, i) => all[Math.floor(i * step)]!)
  return { kind: 'points', points, notice: `Showing ${nf.format(SCATTER_LIMIT)} of ${nf.format(all.length)} points (evenly sampled).` }
}

/** Turns the (already filtered) rows into the numbers a chart needs. Nothing here is ever saved. */
export function buildChartData(config: ChartConfig, headers: string[], rows: string[][], types: ColumnType[]): ChartData {
  const x = headers.indexOf(config.x)
  const y = config.y ? headers.indexOf(config.y) : -1
  if (x < 0) return empty('Choose the columns for this chart.')
  const needsY = config.type === 'scatter' || config.agg !== 'count'
  if (needsY && y < 0) return empty('Choose the columns for this chart.')
  if (rows.length === 0) return empty('No rows to chart. Clear the filters or load more data.')
  if (config.type === 'scatter') return scatter(x, y, rows)
  if (config.type === 'line') return series(config, x, y, rows, types[x] ?? 'number')
  return categories(config, x, y, rows)
}

export interface ChartStyle {
  text: string
  muted: string
  border: string
  surface: string
  /** Categorical colors in fixed order. */
  series: string[]
  other: string
}

const measureLabel = (c: ChartConfig) => (c.agg === 'count' || !c.y ? 'Rows' : `${AGG_LABELS[c.agg]} of ${c.y}`)

/** Maps prepared data to an ECharts option. */
export function chartOption(data: ChartData, config: ChartConfig, s: ChartStyle): EChartsOption {
  const axisText = { color: s.muted }
  const axisLine = { lineStyle: { color: s.border } }
  const split = { lineStyle: { color: s.border, opacity: 0.6 } }
  const base = {
    aria: { enabled: true },
    textStyle: { color: s.text },
    grid: { left: 8, right: 16, top: 24, bottom: config.type === 'scatter' ? 30 : 8, containLabel: true },
  }
  if (data.kind === 'empty') return base

  if (data.kind === 'categories' && config.type === 'pie') {
    return {
      ...base,
      tooltip: { trigger: 'item' },
      legend: { bottom: 0, textStyle: { color: s.text } },
      series: [
        {
          type: 'pie',
          radius: ['0%', '68%'],
          center: ['50%', '45%'],
          label: { show: false },
          labelLine: { show: false },
          itemStyle: { borderColor: s.surface, borderWidth: 2 },
          data: data.labels.map((name, i) => ({
            name,
            value: data.values[i]!,
            itemStyle: { color: name === OTHER ? s.other : s.series[i % s.series.length] },
          })),
        },
      ],
    }
  }

  if (data.kind === 'categories') {
    return {
      ...base,
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'category', data: data.labels, axisLabel: { ...axisText, rotate: data.labels.length > 6 ? 30 : 0 }, axisLine },
      yAxis: { type: 'value', name: measureLabel(config), nameTextStyle: axisText, axisLabel: axisText, splitLine: split },
      series: [
        {
          type: 'bar',
          barMaxWidth: 40,
          itemStyle: { color: s.series[0], borderRadius: [4, 4, 0, 0] },
          data: data.values.map((value, i) => (data.labels[i] === OTHER ? { value, itemStyle: { color: s.other } } : value)),
        },
      ],
    }
  }

  if (data.kind === 'series') {
    return {
      ...base,
      tooltip: { trigger: 'axis' },
      xAxis: { type: data.xIsDate ? 'time' : 'value', scale: true, axisLabel: axisText, axisLine, splitLine: { show: false } },
      yAxis: { type: 'value', name: measureLabel(config), nameTextStyle: axisText, axisLabel: axisText, splitLine: split },
      series: [
        {
          type: 'line',
          data: data.points,
          showSymbol: data.points.length <= 60,
          symbolSize: 8,
          lineStyle: { width: 2, color: s.series[0] },
          itemStyle: { color: s.series[0], borderColor: s.surface, borderWidth: 2 },
        },
      ],
    }
  }

  return {
    ...base,
    tooltip: { trigger: 'item' },
    xAxis: { type: 'value', scale: true, name: config.x, nameLocation: 'middle', nameGap: 28, nameTextStyle: axisText, axisLabel: axisText, axisLine, splitLine: split },
    yAxis: { type: 'value', scale: true, name: config.y ?? '', nameTextStyle: axisText, axisLabel: axisText, splitLine: split },
    series: [
      {
        type: 'scatter',
        data: data.points,
        symbolSize: 8,
        itemStyle: { color: s.series[0], opacity: 0.75, borderColor: s.surface, borderWidth: 1 },
      },
    ],
  }
}
