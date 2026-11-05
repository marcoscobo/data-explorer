import { describe, expect, it } from 'vitest'
import { parseJson } from './parseJson'

const ok = (text: string) => {
  const r = parseJson(text)
  if (!r.ok) throw new Error(r.error)
  return r
}

describe('parseJson: list of objects', () => {
  it('uses keys as columns and values as rows', () => {
    const r = ok('[{"name":"Ana","age":30},{"name":"Luis","age":25}]')
    expect(r.headers).toEqual(['name', 'age'])
    expect(r.rows).toEqual([['Ana', '30'], ['Luis', '25']])
    expect(r.warnings).toEqual([])
  })

  it('takes the union of keys in first-seen order and leaves gaps empty', () => {
    const r = ok('[{"a":1},{"b":2,"a":3},{"c":null}]')
    expect(r.headers).toEqual(['a', 'b', 'c'])
    expect(r.rows).toEqual([['1', '', ''], ['3', '2', ''], ['', '', '']])
  })

  it('writes booleans and numbers as text, and null as empty', () => {
    expect(ok('[{"ok":true,"n":1.5,"x":null}]').rows).toEqual([['true', '1.5', '']])
  })

  it('flattens nested objects with dotted names and keeps arrays as JSON text', () => {
    const r = ok('[{"id":1,"address":{"city":"Madrid","geo":{"lat":40.4}},"tags":["a","b"],"empty":{}}]')
    expect(r.headers).toEqual(['id', 'address.city', 'address.geo.lat', 'tags', 'empty'])
    expect(r.rows[0]).toEqual(['1', 'Madrid', '40.4', '["a","b"]', '{}'])
  })
})

describe('parseJson: other shapes', () => {
  it('reads a list of rows where the first row is the header', () => {
    const r = ok('[["name","age"],["Ana",30],["Luis"]]')
    expect(r.headers).toEqual(['name', 'age'])
    expect(r.rows).toEqual([['Ana', '30'], ['Luis']])
    expect(r.warnings[0]).toMatch(/different number of columns/)
  })

  it('finds the list inside a wrapping object', () => {
    const r = ok('{"meta":{"count":2},"data":[{"a":1},{"a":2}]}')
    expect(r.headers).toEqual(['a'])
    expect(r.rows).toHaveLength(2)
  })
})

describe('parseJson: errors', () => {
  const error = (text: string) => {
    const r = parseJson(text)
    return r.ok ? '' : r.error
  }

  it('explains invalid JSON', () => {
    expect(error('{oops')).toMatch(/not valid JSON/)
    expect(error('')).toMatch(/not valid JSON/)
  })

  it('explains when there is no list of records', () => {
    expect(error('{"a":1}')).toMatch(/list of records/)
    expect(error('42')).toMatch(/list of records/)
    expect(error('null')).toMatch(/list of records/)
    expect(error('"text"')).toMatch(/list of records/)
  })

  it('explains an empty list and empty records', () => {
    expect(error('[]')).toMatch(/empty list/)
    expect(error('[{},{}]')).toMatch(/no fields/)
  })

  it('explains mixed or primitive lists', () => {
    expect(error('[1,2,3]')).toMatch(/mixes different kinds/)
    expect(error('[{"a":1},[1]]')).toMatch(/mixes different kinds/)
  })
})
