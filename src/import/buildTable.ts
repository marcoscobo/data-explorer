export type TableResult =
  | { ok: true; headers: string[]; rows: string[][]; warnings: string[] }
  | { ok: false; error: string }

/**
 * Turns raw rows (first row = column names) into a table, with the same checks and warnings
 * for every file format: blank or duplicate column names, uneven rows and files without data.
 */
export function buildTable(data: string[][]): TableResult {
  const [headerRow, ...rows] = data
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
