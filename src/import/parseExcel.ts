import readXlsxFile from 'read-excel-file/universal'
import { buildTable, type TableResult } from './buildTable'

export type ExcelResult =
  | { ok: true; headers: string[]; rows: string[][]; warnings: string[]; sheets: string[]; sheet: string }
  | { ok: false; error: string }

const UNREADABLE =
  'This file could not be read as an Excel workbook (.xlsx). It may be damaged, password-protected or saved in another format.'

function cellText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ''
    const iso = value.toISOString()
    return iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : iso.slice(0, 19).replace('T', ' ')
  }
  return String(value)
}

const blank = (v: string) => v.trim() === ''

/** Removes rows and columns that are completely empty (common leftovers in spreadsheets). */
function trimEmpty(data: string[][]): string[][] {
  const rows = data.filter((row) => !row.every(blank))
  const width = Math.max(0, ...rows.map((r) => r.length))
  const keep: number[] = []
  for (let c = 0; c < width; c++) if (rows.some((r) => !blank(r[c] ?? ''))) keep.push(c)
  return rows.map((r) => keep.map((c) => r[c] ?? ''))
}

/**
 * Reads an .xlsx workbook in the browser. Uses the first sheet that has data unless `sheet` names one.
 * Dates become ISO dates, formulas use their stored result. Never throws.
 */
export async function parseExcel(buffer: ArrayBuffer, sheet?: string): Promise<ExcelResult> {
  let workbook: Awaited<ReturnType<typeof readXlsxFile>>
  try {
    workbook = await readXlsxFile(buffer)
  } catch {
    return { ok: false, error: UNREADABLE }
  }
  if (!Array.isArray(workbook) || workbook.length === 0) return { ok: false, error: UNREADABLE }

  const tables = workbook.map((s) => ({ name: s.sheet, data: trimEmpty(s.data.map((row) => row.map(cellText))) }))
  const chosen =
    tables.find((t) => t.name === sheet) ?? tables.find((t) => t.data.length > 0) ?? tables[0]!
  const table: TableResult = chosen.data.length === 0
    ? { ok: false, error: `The sheet "${chosen.name}" is empty.` }
    : buildTable(chosen.data)
  if (!table.ok) return table
  return { ...table, sheets: tables.map((t) => t.name), sheet: chosen.name }
}
