export type ColumnType = 'number' | 'date' | 'text'

/** A column is number/date only if at least this share of its non-empty values match. */
const MATCH_THRESHOLD = 0.9

export function isMissing(value: string | undefined): boolean {
  return value === undefined || value.trim() === ''
}

const NUMBER_RE = /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/

/** Dot-decimal numbers only, no thousands separators. Returns null if not a number. */
export function parseNumber(value: string | undefined): number | null {
  if (value === undefined) return null
  const v = value.trim()
  return NUMBER_RE.test(v) ? Number(v) : null
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/** ISO dates (YYYY-MM-DD) only. Returns UTC milliseconds, or null if not a valid date. */
export function parseDate(value: string | undefined): number | null {
  if (value === undefined) return null
  const m = DATE_RE.exec(value.trim())
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const ms = Date.UTC(y, mo - 1, d)
  const check = new Date(ms)
  return check.getUTCFullYear() === y && check.getUTCMonth() === mo - 1 && check.getUTCDate() === d ? ms : null
}

export function inferType(values: (string | undefined)[]): ColumnType {
  const filled = values.filter((v) => !isMissing(v))
  if (filled.length === 0) return 'text'
  const share = (parse: (v: string) => number | null) =>
    filled.filter((v) => parse(v as string) !== null).length / filled.length
  if (share(parseNumber) >= MATCH_THRESHOLD) return 'number'
  if (share(parseDate) >= MATCH_THRESHOLD) return 'date'
  return 'text'
}

export function inferTypes(headers: string[], rows: string[][]): ColumnType[] {
  return headers.map((_, c) => inferType(rows.map((r) => r[c])))
}
