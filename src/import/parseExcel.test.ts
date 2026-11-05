import { describe, expect, it } from 'vitest'
import { sampleBuffer as sample } from '../test/samples'
import { parseExcel } from './parseExcel'

describe('parseExcel: sales.xlsx', () => {
  it('reads all rows and columns with the original headers', async () => {
    const r = await parseExcel(sample('sales.xlsx'))
    if (!r.ok) throw new Error(r.error)
    expect(r.headers).toEqual([
      'order_id', 'order_date', 'customer', 'region', 'product', 'category', 'quantity', 'unit_price', 'discount', 'total', 'notes',
    ])
    expect(r.rows).toHaveLength(250)
    expect(r.sheets).toEqual(['Sales'])
    expect(r.sheet).toBe('Sales')
    expect(r.warnings).toEqual([])
  })

  it('turns date cells into ISO dates and keeps numbers as numbers', async () => {
    const r = await parseExcel(sample('sales.xlsx'))
    if (!r.ok) throw new Error(r.error)
    expect(r.rows[0]![0]).toBe('ORD-1001')
    expect(r.rows[0]![1]).toBe('2025-03-13')
    expect(r.rows[0]![6]).toBe('1') // quantity
    expect(r.rows[0]![7]).toBe('215.05') // unit_price
  })

  it('uses the stored result of formulas', async () => {
    const r = await parseExcel(sample('sales.xlsx'))
    if (!r.ok) throw new Error(r.error)
    expect(r.rows[0]![9]).toBe('182.79')
  })

  it('leaves empty cells empty', async () => {
    const r = await parseExcel(sample('sales.xlsx'))
    if (!r.ok) throw new Error(r.error)
    expect(r.rows[36]![3]).toBe('') // row ORD-1037 has no region
  })
})

describe('parseExcel: multi-sheet.xlsx', () => {
  it('lists every sheet and reads the first one by default', async () => {
    const r = await parseExcel(sample('multi-sheet.xlsx'))
    if (!r.ok) throw new Error(r.error)
    expect(r.sheets).toEqual(['Sales', 'Targets', 'Empty'])
    expect(r.sheet).toBe('Sales')
    expect(r.rows).toHaveLength(30)
  })

  it('reads the sheet that is asked for', async () => {
    const r = await parseExcel(sample('multi-sheet.xlsx'), 'Targets')
    if (!r.ok) throw new Error(r.error)
    expect(r.sheet).toBe('Targets')
    expect(r.headers).toEqual(['region', 'target', 'quarter'])
    expect(r.rows).toHaveLength(5)
    expect(r.rows[0]).toEqual(['North', '12000', '2025-Q1'])
  })

  it('explains an empty sheet', async () => {
    const r = await parseExcel(sample('multi-sheet.xlsx'), 'Empty')
    expect(r).toMatchObject({ ok: false, error: 'The sheet "Empty" is empty.' })
  })

  it('falls back to the first sheet with data when the requested name does not exist', async () => {
    const r = await parseExcel(sample('multi-sheet.xlsx'), 'Nope')
    expect(r.ok && r.sheet).toBe('Sales')
  })
})

describe('parseExcel: bad files', () => {
  it('explains a file that is not a workbook', async () => {
    const r = await parseExcel(sample('corrupt.xlsx'))
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/could not be read as an Excel workbook/) })
  })

  it('explains an empty buffer', async () => {
    const r = await parseExcel(new ArrayBuffer(0))
    expect(r.ok).toBe(false)
  })
})
