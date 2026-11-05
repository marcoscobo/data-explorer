import { beforeEach, describe, expect, it, vi } from 'vitest'
import { initTheme, useTheme } from './useTheme'

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
  vi.restoreAllMocks()
})

describe('useTheme', () => {
  it('defaults to light', () => {
    initTheme()
    expect(useTheme().theme.value).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('toggles between light and dark and updates the page', () => {
    initTheme()
    const { theme, toggle } = useTheme()
    toggle()
    expect(theme.value).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    toggle()
    expect(theme.value).toBe('light')
  })

  it('saves the choice and restores it', () => {
    initTheme()
    useTheme().toggle()
    expect(localStorage.getItem('data-explorer-theme')).toBe('dark')
    initTheme()
    expect(useTheme().theme.value).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('ignores an invalid saved value', () => {
    localStorage.setItem('data-explorer-theme', 'purple')
    initTheme()
    expect(useTheme().theme.value).toBe('light')
  })

  it('still works when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => initTheme()).not.toThrow()
    const { theme, toggle } = useTheme()
    expect(theme.value).toBe('light')
    expect(() => toggle()).not.toThrow()
    expect(theme.value).toBe('dark')
  })
})
