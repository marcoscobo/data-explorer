import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DataPreview from './DataPreview.vue'

const base = { fileName: 'data.csv', headers: ['a', 'b'], warnings: [] as string[] }

describe('DataPreview', () => {
  it('renders file name, stat chips, headers and rows', () => {
    const wrapper = mount(DataPreview, { props: { ...base, rows: [['1', '2'], ['3', '4']] } })
    expect(wrapper.text()).toContain('data.csv')
    expect(wrapper.get('[data-testid=rows]').text()).toBe('2 rows')
    expect(wrapper.get('[data-testid=columns]').text()).toBe('2 columns')
    expect(wrapper.findAll('th').map((t) => t.text())).toEqual(['a', 'b'])
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  it('uses singular and formats large numbers', () => {
    const one = mount(DataPreview, { props: { ...base, headers: ['a'], rows: [['1']] } })
    expect(one.get('[data-testid=rows]').text()).toBe('1 row')
    expect(one.get('[data-testid=columns]').text()).toBe('1 column')
    const many = mount(DataPreview, { props: { ...base, rows: Array.from({ length: 1234 }, () => ['x', 'y']) } })
    expect(many.get('[data-testid=rows]').text()).toBe('1,234 rows')
  })

  it('shows the file size in readable units', () => {
    const size = (n: number) =>
      mount(DataPreview, { props: { ...base, rows: [], fileSize: n } }).get('[data-testid=size]').text()
    expect(size(500)).toBe('500 B')
    expect(size(2048)).toBe('2.0 KB')
    expect(size(3 * 1024 * 1024)).toBe('3.0 MB')
  })

  it('omits the size when not provided', () => {
    const wrapper = mount(DataPreview, { props: { ...base, rows: [] } })
    expect(wrapper.find('[data-testid=size]').exists()).toBe(false)
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

  it('shows warnings as an accessible status banner', () => {
    const wrapper = mount(DataPreview, { props: { ...base, rows: [], warnings: ['careful'] } })
    const banner = wrapper.get('[data-testid=warnings]')
    expect(banner.attributes('role')).toBe('status')
    expect(banner.text()).toContain('careful')
  })

  it('makes the scrollable table keyboard-focusable', () => {
    const wrapper = mount(DataPreview, { props: { ...base, rows: [['1', '2']] } })
    expect(wrapper.get('[role=region]').attributes('tabindex')).toBe('0')
  })
})
