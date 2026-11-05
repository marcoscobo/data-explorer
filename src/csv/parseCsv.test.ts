import { describe, expect, it } from 'vitest'
import { isCsvFile, parseCsv } from './parseCsv'

describe('parseCsv', () => {
  it('parses a valid CSV', () => {
    const r = parseCsv('name,age\nAna,30\nLuis,25\n')
    expect(r).toEqual({ ok: true, headers: ['name', 'age'], rows: [['Ana', '30'], ['Luis', '25']], warnings: [] })
  })

  it('detects a semicolon delimiter', () => {
    const r = parseCsv('a;b\n1;2\n')
    expect(r.ok && r.headers).toEqual(['a', 'b'])
  })

  it('handles quoted fields containing commas', () => {
    const r = parseCsv('city,note\nX,"a, b"\n')
    expect(r.ok && r.rows).toEqual([['X', 'a, b']])
  })

  it('errors on an empty file', () => {
    const r = parseCsv('')
    expect(r.ok).toBe(false)
    expect(!r.ok && r.error).toMatch(/empty/i)
  })

  it('errors on a file with only blank lines', () => {
    expect(parseCsv('\n\n  \n').ok).toBe(false)
  })

  it('errors on an unclosed quotation mark', () => {
    const r = parseCsv('a,b\n1,"oops\n')
    expect(r.ok).toBe(false)
    expect(!r.ok && r.error).toMatch(/quotation/i)
  })

  it('warns when there are no data rows', () => {
    const r = parseCsv('a,b\n')
    expect(r.ok && r.warnings.join(' ')).toMatch(/no data rows/)
  })

  it('warns on rows with a different column count', () => {
    const r = parseCsv('a,b\n1,2\n3\n')
    expect(r.ok && r.warnings[0]).toMatch(/1 row\(s\).*row 3/)
  })

  it('warns on duplicate column names', () => {
    const r = parseCsv('a,a\n1,2\n')
    expect(r.ok && r.warnings[0]).toMatch(/Duplicate.*a/)
  })

  it('names blank columns and warns', () => {
    const r = parseCsv('a,\n1,2\n')
    expect(r.ok && r.headers).toEqual(['a', 'Column 2'])
    expect(r.ok && r.warnings[0]).toMatch(/blank/)
  })
})

describe('isCsvFile', () => {
  it('accepts .csv by name or text/csv type', () => {
    expect(isCsvFile(new File([''], 'DATA.CSV'))).toBe(true)
    expect(isCsvFile(new File([''], 'data', { type: 'text/csv' }))).toBe(true)
  })

  it('rejects other files', () => {
    expect(isCsvFile(new File([''], 'photo.png', { type: 'image/png' }))).toBe(false)
  })
})
