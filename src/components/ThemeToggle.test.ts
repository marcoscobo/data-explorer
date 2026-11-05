import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ThemeToggle from './ThemeToggle.vue'
import { initTheme } from '../composables/useTheme'

beforeEach(() => {
  localStorage.clear()
  initTheme()
})

describe('ThemeToggle', () => {
  it('starts in light and offers the dark theme', () => {
    const wrapper = mount(ThemeToggle)
    expect(wrapper.get('button').attributes('aria-label')).toBe('Switch to dark theme')
    expect(wrapper.find('[data-testid=icon-moon]').exists()).toBe(true)
  })

  it('switches theme on click and updates label and icon', async () => {
    const wrapper = mount(ThemeToggle)
    await wrapper.get('button').trigger('click')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(wrapper.get('button').attributes('aria-label')).toBe('Switch to light theme')
    expect(wrapper.find('[data-testid=icon-sun]').exists()).toBe(true)
  })
})
