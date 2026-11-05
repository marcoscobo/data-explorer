import { isCsvFile, parseCsv } from '../csv/parseCsv'
import type { TableResult } from './buildTable'
import { parseJson } from './parseJson'

export type ImportResult =
  | (Extract<TableResult, { ok: true }> & { sheets?: string[]; sheet?: string })
  | Extract<TableResult, { ok: false }>

export type FileKind = 'csv' | 'json' | 'xlsx' | 'xls'

/** Value for the file picker's `accept` attribute. */
export const ACCEPT = '.csv,.xlsx,.json,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export function fileKind(file: File): FileKind | null {
  const name = file.name.toLowerCase()
  if (isCsvFile(file)) return 'csv'
  if (name.endsWith('.json') || file.type === 'application/json') return 'json'
  if (name.endsWith('.xlsx')) return 'xlsx'
  if (name.endsWith('.xls')) return 'xls'
  return null
}

const READ_ERROR = 'The file could not be read. Please try again or choose another file.'

/** Reads a CSV, Excel (.xlsx) or JSON file in the browser. Never throws; returns an error result instead. */
export async function importFile(file: File, options: { sheet?: string } = {}): Promise<ImportResult> {
  const kind = fileKind(file)
  if (kind === null) {
    return { ok: false, error: `"${file.name}" is not a supported file. Please choose a .csv, .xlsx or .json file.` }
  }
  if (kind === 'xls') {
    return {
      ok: false,
      error: `"${file.name}" is an older Excel file (.xls), which is not supported. Open it in Excel, save it as .xlsx or .csv, and try again.`,
    }
  }
  try {
    if (kind === 'csv') return parseCsv(await file.text())
    if (kind === 'json') return parseJson(await file.text())
    // Loaded on demand: the Excel reader is only downloaded when someone opens a workbook.
    const { parseExcel } = await import('./parseExcel')
    return await parseExcel(await file.arrayBuffer(), options.sheet)
  } catch {
    return { ok: false, error: READ_ERROR }
  }
}
