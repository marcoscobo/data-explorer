import { describe, expect, it } from 'vitest'
import { sampleFile, sampleText } from '../test/samples'
import { parseCsv } from '../csv/parseCsv'
import { fileKind, importFile } from './importFile'

const f = (name: string, type = '') => new File(['x'], name, { type })

describe('fileKind', () => {
  it('recognizes each supported format by extension or type', () => {
    expect(fileKind(f('a.CSV'))).toBe('csv')
    expect(fileKind(f('a', 'text/csv'))).toBe('csv')
    expect(fileKind(f('a.json'))).toBe('json')
    expect(fileKind(f('a', 'application/json'))).toBe('json')
    expect(fileKind(f('a.XLSX'))).toBe('xlsx')
    expect(fileKind(f('a.xls'))).toBe('xls')
  })

  it('returns null for anything else', () => {
    expect(fileKind(f('photo.png', 'image/png'))).toBeNull()
    expect(fileKind(f('notes.txt'))).toBeNull()
  })
})

describe('importFile: CSV is unchanged', () => {
  it('gives exactly what parseCsv gives', async () => {
    const r = await importFile(sampleFile('sales.csv', 'text/csv'))
    expect(r).toEqual(parseCsv(sampleText('sales.csv')))
    expect(r.ok && r.rows).toHaveLength(250)
  })

  it('keeps CSV errors and warnings', async () => {
    expect(await importFile(sampleFile('empty.csv'))).toMatchObject({ ok: false, error: expect.stringMatching(/empty/) })
    expect(await importFile(sampleFile('unclosed-quote.csv'))).toMatchObject({ ok: false, error: expect.stringMatching(/quotation/) })
    const ragged = await importFile(sampleFile('ragged-rows.csv'))
    expect(ragged.ok && ragged.warnings[0]).toMatch(/different number of columns/)
  })
})

describe('importFile: JSON', () => {
  it('reads each JSON sample shape', async () => {
    const list = await importFile(sampleFile('sales.json'))
    expect(list.ok && list.rows).toHaveLength(250)
    expect(list.ok && list.headers[0]).toBe('order_id')
    const nested = await importFile(sampleFile('sales-nested.json'))
    expect(nested.ok && nested.headers).toContain('customer.name')
    expect(nested.ok && nested.headers).toContain('item.unit_price')
    const wrapped = await importFile(sampleFile('sales-wrapped.json'))
    expect(wrapped.ok && wrapped.rows).toHaveLength(40)
    const rows = await importFile(sampleFile('rows-array.json'))
    expect(rows.ok && rows.rows).toHaveLength(25)
  })

  it('gives the same table from JSON as from CSV for the same data', async () => {
    const csv = await importFile(sampleFile('sales.csv'))
    const json = await importFile(sampleFile('sales.json'))
    if (!csv.ok || !json.ok) throw new Error('import failed')
    expect(json.headers).toEqual(csv.headers)
    expect(json.rows).toHaveLength(csv.rows.length)
    expect(json.rows[0]![0]).toBe(csv.rows[0]![0])
    expect(json.rows[0]![3]).toBe(csv.rows[0]![3])
  })

  it('explains bad JSON files', async () => {
    expect(await importFile(sampleFile('invalid.json'))).toMatchObject({ ok: false, error: expect.stringMatching(/not valid JSON/) })
    expect(await importFile(sampleFile('empty-array.json'))).toMatchObject({ ok: false, error: expect.stringMatching(/empty list/) })
    expect(await importFile(sampleFile('no-records.json'))).toMatchObject({ ok: false, error: expect.stringMatching(/list of records/) })
  })
})

describe('importFile: Excel', () => {
  it('reads an .xlsx workbook like the CSV with the same data', async () => {
    const xlsx = await importFile(sampleFile('sales.xlsx'))
    const csv = await importFile(sampleFile('sales.csv'))
    if (!xlsx.ok || !csv.ok) throw new Error('import failed')
    expect(xlsx.headers).toEqual(csv.headers)
    expect(xlsx.rows).toHaveLength(250)
    expect(xlsx.rows[0]![1]).toBe(csv.rows[0]![1]) // dates match
    expect(xlsx.rows[0]![9]).toBe(csv.rows[0]![9]) // formula result matches
    expect(xlsx.sheets).toEqual(['Sales'])
  })

  it('switches sheets', async () => {
    const r = await importFile(sampleFile('multi-sheet.xlsx'), { sheet: 'Targets' })
    expect(r.ok && r.sheet).toBe('Targets')
    expect(r.ok && r.headers).toEqual(['region', 'target', 'quarter'])
  })

  it('explains a corrupt workbook', async () => {
    expect(await importFile(sampleFile('corrupt.xlsx'))).toMatchObject({ ok: false, error: expect.stringMatching(/Excel workbook/) })
  })
})

describe('importFile: unsupported', () => {
  it('explains legacy .xls files', async () => {
    const r = await importFile(sampleFile('legacy.xls'))
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/older Excel file \(\.xls\).*save it as \.xlsx or \.csv/) })
  })

  it('explains other file types and lists the supported ones', async () => {
    const r = await importFile(new File(['x'], 'photo.png', { type: 'image/png' }))
    expect(r).toMatchObject({ ok: false, error: '"photo.png" is not a supported file. Please choose a .csv, .xlsx or .json file.' })
  })
})
