import { buildTable, type TableResult } from './buildTable'

const MAX_DEPTH = 5

type Json = null | boolean | number | string | Json[] | { [key: string]: Json }
const isRecord = (v: unknown): v is { [key: string]: Json } => typeof v === 'object' && v !== null && !Array.isArray(v)

function cell(value: Json | undefined): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/** Nested objects become dotted columns (address.city); arrays are kept as JSON text. */
function flatten(obj: { [key: string]: Json }, prefix = '', depth = 0, out: Record<string, string> = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const name = prefix ? `${prefix}.${key}` : key
    if (isRecord(value) && depth < MAX_DEPTH && Object.keys(value).length > 0) flatten(value, name, depth + 1, out)
    else out[name] = cell(value)
  }
  return out
}

const NOT_A_LIST =
  'This JSON file does not contain a list of records. Expected a list of objects, such as [{"name": "Ana", "age": 30}], or an object that holds one.'

/** Parses JSON text into a table. Never throws; returns an error result instead. */
export function parseJson(text: string): TableResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'This file is not valid JSON. Check for missing commas, quotes or brackets.' }
  }

  let list: unknown = data
  if (isRecord(data)) list = Object.values(data).find(Array.isArray)
  if (!Array.isArray(list)) return { ok: false, error: NOT_A_LIST }
  if (list.length === 0) return { ok: false, error: 'The JSON file has an empty list, so there are no records to show.' }

  if (list.every(isRecord)) {
    const records = list.map((r) => flatten(r))
    const headers: string[] = []
    const seen = new Set<string>()
    for (const r of records) {
      for (const key of Object.keys(r)) {
        if (!seen.has(key)) {
          seen.add(key)
          headers.push(key)
        }
      }
    }
    if (headers.length === 0) return { ok: false, error: 'The records in this JSON file have no fields.' }
    return buildTable([headers, ...records.map((r) => headers.map((h) => r[h] ?? ''))])
  }

  if (list.every(Array.isArray)) {
    return buildTable((list as Json[][]).map((row) => row.map(cell)))
  }

  return { ok: false, error: 'The list in this JSON file mixes different kinds of items. Use a list of objects, or a list of rows.' }
}
