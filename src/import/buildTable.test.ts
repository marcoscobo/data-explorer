import { describe, expect, it } from 'vitest'
import { buildTable } from './buildTable'

describe('buildTable', () => {
  it('builds a table from a header row and data rows', () => {
    expect(buildTable([['a', 'b'], ['1', '2']])).toEqual({ ok: true, headers: ['a', 'b'], rows: [['1', '2']], warnings: [] })
  })

  it('fails on no data or a blank header row', () => {
    expect(buildTable([])).toMatchObject({ ok: false })
    expect(buildTable([['', ' ']])).toMatchObject({ ok: false, error: expect.stringMatching(/empty/) })
  })

  it('warns about blank and duplicate names, uneven rows and missing data rows', () => {
    const t = buildTable([['a', 'a', ''], ['1', '2', '3'], ['4']])
    expect(t.ok && t.headers).toEqual(['a', 'a', 'Column 3'])
    expect(t.ok && t.warnings).toHaveLength(3)
    const header = buildTable([['a']])
    expect(header.ok && header.warnings[0]).toMatch(/no data rows/)
  })
})
