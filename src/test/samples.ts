import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Reads a file from the `samples/` folder (tests run from the project root).
 * The bytes are copied into an ArrayBuffer created in the test (jsdom) realm: a Node Buffer's own
 * ArrayBuffer comes from another realm and fails `instanceof ArrayBuffer` checks in libraries.
 */
export function sampleBuffer(name: string): ArrayBuffer {
  const bytes = readFileSync(join(process.cwd(), 'samples', name))
  const out = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(out).set(bytes)
  return out
}

export function sampleText(name: string): string {
  return readFileSync(join(process.cwd(), 'samples', name), 'utf-8')
}

export function sampleFile(name: string, type = ''): File {
  return new File([sampleBuffer(name)], name, { type })
}
