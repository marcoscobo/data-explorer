import { describe, expect, it, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import handler from './health'

describe('api/health', () => {
  it('responds 200 with status ok', () => {
    const json = vi.fn()
    const status = vi.fn(() => ({ json }))
    handler({} as VercelRequest, { status } as unknown as VercelResponse)
    expect(status).toHaveBeenCalledWith(200)
    expect(json).toHaveBeenCalledWith({ status: 'ok' })
  })
})
