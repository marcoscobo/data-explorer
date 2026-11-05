import Papa from 'papaparse'
import { buildTable, type TableResult } from '../import/buildTable'

export type CsvResult = TableResult

export function isCsvFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv'
}

/** Parses CSV text entirely in the browser. Never throws; returns an error result instead. */
export function parseCsv(text: string): CsvResult {
  const parsed = Papa.parse<string[]>(text, { header: false, skipEmptyLines: 'greedy' })

  const quoteError = parsed.errors.find((e) => e.type === 'Quotes')
  if (quoteError) {
    const where = quoteError.row !== undefined ? ` near row ${quoteError.row + 1}` : ''
    return {
      ok: false,
      error: `The file has an unclosed or misplaced quotation mark${where}. Check that every opening " has a closing ".`,
    }
  }

  return buildTable(parsed.data)
}
