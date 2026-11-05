import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DataPreview from './DataPreview.vue'

const base = { fileName: 'data.csv', headers: ['a', 'b'], warnings: [] as string[] }

const people = {
  fileName: 'people.csv',
  headers: ['name', 'age', 'since'],
  warnings: [] as string[],
  rows: [
    ['Ana', '30', '2025-01-10'],
    ['Luis', '9', '2025-02-20'],
    ['Marta', '100', '2024-12-31'],
    ['Pedro', '', '2025-03-05'],
  ],
}

const names = (w: ReturnType<typeof mount>) => w.findAll('tbody tr').map((r) => r.findAll('td')[0]!.text())

describe('DataPreview basics', () => {
  it('renders file name, stat chips, headers and rows', () => {
    const wrapper = mount(DataPreview, { props: { ...base, rows: [['1', '2'], ['3', '4']] } })
    expect(wrapper.text()).toContain('data.csv')
    expect(wrapper.get('[data-testid=rows]').text()).toBe('2 rows')
    expect(wrapper.get('[data-testid=columns]').text()).toBe('2 columns')
    expect(wrapper.findAll('thead tr:first-child th').map((t) => t.text())).toEqual(['a', 'b'])
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  it('uses singular and formats large numbers', () => {
    const one = mount(DataPreview, { props: { ...base, headers: ['a'], rows: [['1']] } })
    expect(one.get('[data-testid=rows]').text()).toBe('1 row')
    expect(one.get('[data-testid=columns]').text()).toBe('1 column')
    const many = mount(DataPreview, { props: { ...base, rows: Array.from({ length: 1234 }, () => ['x', 'y']) } })
    expect(many.get('[data-testid=rows]').text()).toBe('1,234 rows')
  })

  it('shows the file size in readable units, or nothing', () => {
    const size = (n: number) =>
      mount(DataPreview, { props: { ...base, rows: [], fileSize: n } }).get('[data-testid=size]').text()
    expect(size(500)).toBe('500 B')
    expect(size(2048)).toBe('2.0 KB')
    expect(size(3 * 1024 * 1024)).toBe('3.0 MB')
    expect(mount(DataPreview, { props: { ...base, rows: [] } }).find('[data-testid=size]').exists()).toBe(false)
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

  it('makes the scrollable area keyboard-focusable', () => {
    const wrapper = mount(DataPreview, { props: { ...base, rows: [['1', '2']] } })
    expect(wrapper.get('[role=region]').attributes('tabindex')).toBe('0')
  })

  it('says when the file has no data rows', () => {
    const wrapper = mount(DataPreview, { props: { ...base, rows: [] } })
    expect(wrapper.get('[data-testid=no-match]').text()).toBe('This file has no data rows.')
  })
})

describe('DataPreview sorting', () => {
  it('sorts by a numeric column ascending, descending, then back to original order', async () => {
    const wrapper = mount(DataPreview, { props: people })
    const ageButton = () => wrapper.findAll('button.sort')[1]!
    expect(names(wrapper)).toEqual(['Ana', 'Luis', 'Marta', 'Pedro'])
    await ageButton().trigger('click')
    expect(names(wrapper)).toEqual(['Luis', 'Ana', 'Marta', 'Pedro']) // 9, 30, 100, missing last
    expect(wrapper.findAll('th')[1]!.attributes('aria-sort')).toBe('ascending')
    await ageButton().trigger('click')
    expect(names(wrapper)).toEqual(['Marta', 'Ana', 'Luis', 'Pedro'])
    expect(wrapper.findAll('th')[1]!.attributes('aria-sort')).toBe('descending')
    await ageButton().trigger('click')
    expect(names(wrapper)).toEqual(['Ana', 'Luis', 'Marta', 'Pedro'])
    expect(wrapper.findAll('th')[1]!.attributes('aria-sort')).toBe('none')
  })

  it('sorts dates chronologically', async () => {
    const wrapper = mount(DataPreview, { props: people })
    await wrapper.findAll('button.sort')[2]!.trigger('click')
    expect(names(wrapper)).toEqual(['Marta', 'Ana', 'Luis', 'Pedro'])
  })
})

describe('DataPreview filtering', () => {
  it('searches across all columns and updates the row chip', async () => {
    const wrapper = mount(DataPreview, { props: people })
    await wrapper.get('input[type=search]').setValue('2025-0')
    expect(names(wrapper)).toEqual(['Ana', 'Luis', 'Pedro'])
    expect(wrapper.get('[data-testid=rows]').text()).toBe('3 of 4 rows')
  })

  it('filters a text column by contains', async () => {
    const wrapper = mount(DataPreview, { props: people })
    await wrapper.get('input[aria-label="Filter name"]').setValue('a')
    expect(names(wrapper)).toEqual(['Ana', 'Marta'])
  })

  it('filters a number column by min and max', async () => {
    const wrapper = mount(DataPreview, { props: people })
    await wrapper.get('input[aria-label="Minimum age"]').setValue('10')
    expect(names(wrapper)).toEqual(['Ana', 'Marta'])
    await wrapper.get('input[aria-label="Maximum age"]').setValue('50')
    expect(names(wrapper)).toEqual(['Ana'])
    await wrapper.get('input[aria-label="Minimum age"]').setValue('')
    expect(names(wrapper)).toEqual(['Ana', 'Luis']) // max 50 only
  })

  it('filters a date column by contains', async () => {
    const wrapper = mount(DataPreview, { props: people })
    await wrapper.get('input[aria-label="Filter since"]').setValue('2025-02')
    expect(names(wrapper)).toEqual(['Luis'])
  })

  it('shows a message when nothing matches and clears everything with one button', async () => {
    const wrapper = mount(DataPreview, { props: people })
    expect(wrapper.find('button.clear').exists()).toBe(false)
    await wrapper.get('input[type=search]').setValue('zzz')
    expect(wrapper.get('[data-testid=no-match]').text()).toBe('No rows match your filters.')
    await wrapper.get('input[aria-label="Filter name"]').setValue('a')
    await wrapper.get('button.clear').trigger('click')
    expect(names(wrapper)).toHaveLength(4)
    expect((wrapper.get('input[type=search]').element as HTMLInputElement).value).toBe('')
    expect(wrapper.find('button.clear').exists()).toBe(false)
    expect(wrapper.get('[data-testid=rows]').text()).toBe('4 rows')
  })

  it('keeps the sort while filtering', async () => {
    const wrapper = mount(DataPreview, { props: people })
    await wrapper.findAll('button.sort')[1]!.trigger('click')
    await wrapper.get('input[aria-label="Filter name"]').setValue('a')
    expect(names(wrapper)).toEqual(['Ana', 'Marta'])
  })
})

describe('DataPreview pagination', () => {
  const rows = Array.from({ length: 5 }, (_, i) => [`r${i + 1}`, String(i + 1)])
  const props = { ...base, rows, pageSize: 2 }

  it('shows one page at a time and moves between pages', async () => {
    const wrapper = mount(DataPreview, { props })
    expect(names(wrapper)).toEqual(['r1', 'r2'])
    expect(wrapper.get('[data-testid=pager-label]').text()).toBe('Rows 1–2 of 5')
    expect(wrapper.get('[data-testid=page-label]').text()).toBe('Page 1 of 3')
    const [prev, next] = wrapper.findAll('.pages button')
    expect(prev!.attributes('disabled')).toBeDefined()
    await next!.trigger('click')
    await next!.trigger('click')
    expect(names(wrapper)).toEqual(['r5'])
    expect(wrapper.get('[data-testid=pager-label]').text()).toBe('Rows 5–5 of 5')
    expect(next!.attributes('disabled')).toBeDefined()
  })

  it('sorts all rows, not just the visible page', async () => {
    const wrapper = mount(DataPreview, { props })
    const sortB = wrapper.findAll('button.sort')[1]!
    await sortB.trigger('click')
    await sortB.trigger('click') // descending
    expect(names(wrapper)).toEqual(['r5', 'r4'])
  })

  it('returns to page 1 when filters change', async () => {
    const wrapper = mount(DataPreview, { props })
    await wrapper.findAll('.pages button')[1]!.trigger('click')
    expect(wrapper.get('[data-testid=page-label]').text()).toBe('Page 2 of 3')
    await wrapper.get('input[type=search]').setValue('r')
    expect(wrapper.get('[data-testid=page-label]').text()).toBe('Page 1 of 3')
  })

  it('hides page buttons when everything fits on one page', () => {
    const wrapper = mount(DataPreview, { props: { ...base, rows, pageSize: 100 } })
    expect(wrapper.find('.pages').exists()).toBe(false)
    expect(wrapper.get('[data-testid=pager-label]').text()).toBe('Rows 1–5 of 5')
  })
})

describe('DataPreview statistics tab', () => {
  it('switches to statistics for all columns', async () => {
    const wrapper = mount(DataPreview, { props: people })
    await wrapper.findAll('[role=tab]')[1]!.trigger('click')
    expect(wrapper.findAll('[data-testid=stats-row]')).toHaveLength(3)
    expect(wrapper.get('[role=region]').attributes('aria-label')).toBe('Column statistics')
    expect(wrapper.find('[data-testid=pager-label]').exists()).toBe(false)
    expect(wrapper.get('[data-testid=stats-basis]').text()).toBe('Based on all 4 rows.')
  })

  it('computes statistics on the filtered rows', async () => {
    const wrapper = mount(DataPreview, { props: people })
    await wrapper.get('input[aria-label="Filter name"]').setValue('a')
    await wrapper.findAll('[role=tab]')[1]!.trigger('click')
    expect(wrapper.get('[data-testid=stats-basis]').text()).toBe('Based on 2 of 4 rows (filters applied).')
    const age = wrapper.findAll('[data-testid=stats-row]')[1]!.findAll('td').map((c) => c.text())
    expect(age).toContain('65') // mean of 30 and 100
  })

  it('goes back to the data and keeps filters', async () => {
    const wrapper = mount(DataPreview, { props: people })
    await wrapper.get('input[type=search]').setValue('luis')
    const [data, stats] = wrapper.findAll('[role=tab]')
    await stats!.trigger('click')
    await data!.trigger('click')
    expect(names(wrapper)).toEqual(['Luis'])
  })
})

describe('DataPreview charts tab', () => {
  beforeEach(() => localStorage.clear())

  it('has three tabs and opens the dashboard', async () => {
    const wrapper = mount(DataPreview, { props: people })
    const tabs = wrapper.findAll('[role=tab]')
    expect(tabs.map((t) => t.text())).toEqual(['Data', 'Statistics', 'Charts'])
    await tabs[2]!.trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[data-testid=dashboard-empty]').exists()).toBe(true), { timeout: 5000 })
    expect(wrapper.get('[role=region]').attributes('aria-label')).toBe('Chart dashboard')
    expect(wrapper.find('[data-testid=pager-label]').exists()).toBe(false)
  })

  it('charts the filtered rows', async () => {
    const wrapper = mount(DataPreview, { props: people })
    await wrapper.get('input[type=search]').setValue('luis')
    await wrapper.findAll('[role=tab]')[2]!.trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[data-testid=charts-basis]').exists()).toBe(true), { timeout: 5000 })
    expect(wrapper.get('[data-testid=charts-basis]').text()).toContain('Charts use the 1 of 4 filtered rows.')
  })
})
