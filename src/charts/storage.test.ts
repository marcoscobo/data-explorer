import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  downloadText,
  exportConfig,
  fingerprint,
  loadDashboard,
  parseImport,
  partitionByColumns,
  saveDashboard,
} from './storage'
import { buildChartData } from './buildChartData'
import type { ChartConfig, ColumnInfo } from './chartConfig'

const columns: ColumnInfo[] = [
  { name: 'region', type: 'text' },
  { name: 'sales', type: 'number' },
]
const chart = (over: Partial<ChartConfig> = {}): ChartConfig => ({
  id: 'c1',
  type: 'bar',
  title: 'Sales by region',
  x: 'region',
  y: 'sales',
  agg: 'sum',
  ...over,
})

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('fingerprint', () => {
  it('is stable and depends on column names and types only', () => {
    expect(fingerprint(columns)).toBe(fingerprint([...columns]))
    expect(fingerprint(columns)).not.toBe(fingerprint([columns[0]!, { name: 'sales', type: 'text' }]))
    expect(fingerprint(columns)).not.toBe(fingerprint([columns[1]!, columns[0]!]))
  })
})

describe('saving and loading', () => {
  it('round-trips charts per fingerprint', () => {
    expect(saveDashboard('fp1', [chart()])).toBe(true)
    expect(loadDashboard('fp1')).toEqual([chart()])
    expect(loadDashboard('other')).toEqual([])
  })

  it('returns nothing for corrupt stored data', () => {
    localStorage.setItem('data-explorer-dashboard:fp1', '{not json')
    expect(loadDashboard('fp1')).toEqual([])
    localStorage.setItem('data-explorer-dashboard:fp1', JSON.stringify([{ type: 'radar' }]))
    expect(loadDashboard('fp1')).toEqual([])
  })

  it('does not throw when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(saveDashboard('fp', [chart()])).toBe(false)
    expect(loadDashboard('fp')).toEqual([])
  })
})

describe('never stores data', () => {
  const secretRows = [
    ['Secretland', '987654321'],
    ['Hiddenia', '123456789'],
  ]

  it('keeps cell values out of storage and exports, even if a config carries extra fields', () => {
    const data = buildChartData(chart(), ['region', 'sales'], secretRows, ['text', 'number'])
    expect(data.kind).toBe('categories') // the data exists in memory...
    const dirty = { ...chart(), rows: secretRows, labels: ['Secretland'], values: [987654321], data } as unknown as ChartConfig
    saveDashboard('fp', [dirty])
    const exported = exportConfig([dirty])
    const everythingWritten = JSON.stringify(Object.entries(localStorage)) + exported
    for (const secret of ['Secretland', 'Hiddenia', '987654321', '123456789']) {
      expect(everythingWritten).not.toContain(secret) // ...but never leaves it
    }
  })

  it('stores only the whitelisted config fields', () => {
    saveDashboard('fp', [chart()])
    const stored = JSON.parse(localStorage.getItem('data-explorer-dashboard:fp') as string)[0]
    expect(Object.keys(stored).sort()).toEqual(['agg', 'id', 'title', 'type', 'x', 'y'])
  })
})

describe('export and import', () => {
  it('round-trips through JSON with fresh ids', () => {
    const result = parseImport(exportConfig([chart(), chart({ id: 'c2', type: 'pie' })]))
    expect(result.ok && result.charts).toHaveLength(2)
    expect(result.ok && result.charts[0]).toMatchObject({ type: 'bar', x: 'region', y: 'sales', agg: 'sum' })
    expect(result.ok && result.charts[0]!.id).not.toBe('c1')
  })

  it('explains invalid files', () => {
    expect(parseImport('not json')).toMatchObject({ ok: false, error: expect.stringMatching(/not valid JSON/) })
    expect(parseImport('{"hello":1}')).toMatchObject({ ok: false, error: expect.stringMatching(/does not look like/) })
    expect(parseImport('[1,2]')).toMatchObject({ ok: false })
    expect(parseImport('null')).toMatchObject({ ok: false })
    expect(parseImport('{"version":99,"charts":[]}')).toMatchObject({ ok: false, error: expect.stringMatching(/unsupported/) })
    expect(parseImport('{"version":1,"charts":[{"type":"x"}]}')).toMatchObject({ ok: false, error: expect.stringMatching(/No valid charts/) })
    expect(parseImport('x'.repeat(1_000_001))).toMatchObject({ ok: false, error: expect.stringMatching(/too large/) })
  })

  it('accepts an empty chart list', () => {
    expect(parseImport('{"version":1,"charts":[]}')).toEqual({ ok: true, charts: [] })
  })
})

describe('partitionByColumns', () => {
  it('skips charts that do not fit the current columns, with a reason', () => {
    const { valid, skipped } = partitionByColumns([chart(), chart({ id: 'c3', x: 'country' })], columns)
    expect(valid.map((c) => c.id)).toEqual(['c1'])
    expect(skipped).toHaveLength(1)
    expect(skipped[0]!.reason).toMatch(/"country" is not in this file/)
  })
})

describe('downloadText', () => {
  it('creates and clicks a download link, then cleans up', () => {
    const create = vi.fn(() => 'blob:x')
    const revoke = vi.fn()
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    downloadText('dashboard.json', '{}')
    expect(create).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
    expect(revoke).toHaveBeenCalledWith('blob:x')
    expect(document.querySelector('a[download]')).toBeNull()
  })
})
