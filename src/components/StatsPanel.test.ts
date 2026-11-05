import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import StatsPanel from './StatsPanel.vue'
import { computeStats } from '../data/computeStats'

const stats = computeStats(
  ['city', 'sales', 'day'],
  [['Madrid', '10.5', '2025-01-01'], ['Madrid', '20', '2025-01-05'], ['Leon', '', '2025-01-03']],
  ['text', 'number', 'date'],
)

describe('StatsPanel', () => {
  it('shows one row per column with its type', () => {
    const wrapper = mount(StatsPanel, { props: { stats, total: 3, filtered: 3 } })
    const rows = wrapper.findAll('[data-testid=stats-row]')
    expect(rows).toHaveLength(3)
    expect(rows[0]!.text()).toContain('city')
    expect(rows[1]!.text()).toContain('number')
    expect(rows[2]!.text()).toContain('date')
  })

  it('shows numeric, date and top-value summaries', () => {
    const wrapper = mount(StatsPanel, { props: { stats, total: 3, filtered: 3 } })
    const [text, num, date] = wrapper.findAll('[data-testid=stats-row]').map((r) => r.findAll('td').map((c) => c.text()))
    expect(text![9]).toBe('Madrid (2), Leon (1)') // most frequent
    expect(num).toContain('10.5')
    expect(num).toContain('15.25') // mean
    expect(date).toContain('2025-01-01')
    expect(date).toContain('2025-01-05')
  })

  it('states the basis of the numbers', () => {
    const all = mount(StatsPanel, { props: { stats, total: 1200, filtered: 1200 } })
    expect(all.get('[data-testid=stats-basis]').text()).toBe('Based on all 1,200 rows.')
    const some = mount(StatsPanel, { props: { stats, total: 1200, filtered: 30 } })
    expect(some.get('[data-testid=stats-basis]').text()).toBe('Based on 30 of 1,200 rows (filters applied).')
  })
})
