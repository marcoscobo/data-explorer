import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DataPreview from './DataPreview.vue'

const base = { fileName: 'data.csv', headers: ['a', 'b'], warnings: [] as string[] }

describe('DataPreview', () => {
  it('renders file name, counts, headers and rows', () => {
    const wrapper = mount(DataPreview, { props: { ...base, rows: [['1', '2'], ['3', '4']] } })
    expect(wrapper.text()).toContain('data.csv')
    expect(wrapper.get('[data-testid=summary]').text()).toBe('2 rows, 2 columns')
    expect(wrapper.findAll('th').map((t) => t.text())).toEqual(['a', 'b'])
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  it('truncates to the limit and says so', () => {
    const rows = Array.from({ length: 5 }, (_, i) => [String(i), 'x'])
    const wrapper = mount(DataPreview, { props: { ...base, rows, limit: 3 } })
    expect(wrapper.findAll('tbody tr')).toHaveLength(3)
    expect(wrapper.get('[data-testid=truncated]').text()).toBe('Showing the first 3 of 5 rows.')
  })

  it('pads short rows with empty cells', () => {
    const wrapper = mount(DataPreview, { props: { ...base, rows: [['1']] } })
    expect(wrapper.findAll('tbody td')).toHaveLength(2)
  })

  it('shows warnings when present', () => {
    const wrapper = mount(DataPreview, { props: { ...base, rows: [], warnings: ['careful'] } })
    expect(wrapper.get('[data-testid=warnings]').text()).toContain('careful')
  })
})
