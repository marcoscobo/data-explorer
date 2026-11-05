import Papa from 'papaparse'

export type CsvResult =
  | { ok: true; headers: string[]; rows: string[][]; warnings: string[] }
  | { ok: false; error: string }

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

  const [headerRow, ...rows] = parsed.data
  if (!headerRow || headerRow.every((cell) => cell.trim() === '')) {
    return { ok: false, error: 'The file is empty or has no header row. The first row must contain column names.' }
  }

  const warnings: string[] = []

  const headers = headerRow.map((cell, i) => (cell.trim() === '' ? `Column ${i + 1}` : cell.trim()))
  if (headerRow.some((cell) => cell.trim() === '')) {
    warnings.push('Some column names were blank and have been named "Column N".')
  }

  const duplicates = headers.filter((h, i) => headers.indexOf(h) !== i)
  if (duplicates.length > 0) {
    warnings.push(`Duplicate column names found: ${[...new Set(duplicates)].join(', ')}.`)
  }

  const mismatched = rows
    .map((row, i) => ({ row, line: i + 2 }))
    .filter(({ row }) => row.length !== headers.length)
  if (mismatched.length > 0) {
    warnings.push(
      `${mismatched.length} row(s) have a different number of columns than the header (first one at row ${mismatched[0]!.line}).`,
    )
  }

  if (rows.length === 0) {
    warnings.push('The file has column names but no data rows.')
  }

  return { ok: true, headers, rows, warnings }
}
