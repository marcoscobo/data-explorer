import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

vi.mock('vue-echarts', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      props: { option: { type: Object, required: true } },
      setup: (props) => () => h('div', { 'data-testid': 'vchart', 'data-option': JSON.stringify(props.option) }),
    }),
  }
})

import DashboardPanel from './DashboardPanel.vue'
import { exportConfig } from '../charts/storage'
import type { ChartConfig } from '../charts/chartConfig'
import type { ColumnType } from '../data/inferTypes'

const headers = ['region', 'sales']
const types: ColumnType[] = ['text', 'number']
const rows = [['Secretland', '987654'], ['Hiddenia', '123456'], ['Secretland', '5']]
const props = { headers, rows, types, total: 3 }

const barChart = (over: Partial<ChartConfig> = {}): ChartConfig => ({
  id: 'c1', type: 'bar', title: 'Count by region', x: 'region', agg: 'count', ...over,
})

const button = (w: ReturnType<typeof mount>, label: string) => w.findAll('button').find((b) => b.text() === label)!
const cards = (w: ReturnType<typeof mount>) => w.findAll('[data-testid=chart-card]')

async function importText(wrapper: ReturnType<typeof mount>, text: string) {
  const input = wrapper.get('input[type=file]')
  Object.defineProperty(input.element, 'files', { value: [new File([text], 'cfg.json', { type: 'application/json' })], configurable: true })
  await input.trigger('change')
  await flushPromises()
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('DashboardPanel', () => {
  it('starts empty with a clear call to action', () => {
    const wrapper = mount(DashboardPanel, { props })
    expect(wrapper.get('[data-testid=dashboard-empty]').text()).toMatch(/No charts yet/)
    expect(button(wrapper, 'Save configuration').attributes('disabled')).toBeDefined()
  })

  it('states which rows the charts use', () => {
    expect(mount(DashboardPanel, { props }).get('[data-testid=charts-basis]').text()).toContain('Charts use all 3 rows.')
    const filtered = mount(DashboardPanel, { props: { ...props, rows: rows.slice(0, 1) } })
    expect(filtered.get('[data-testid=charts-basis]').text()).toContain('Charts use the 1 of 3 filtered rows.')
    expect(filtered.get('[data-testid=charts-basis]').text()).toContain('never your data')
  })

  it('adds a chart through the builder', async () => {
    const wrapper = mount(DashboardPanel, { props })
    await button(wrapper, 'Add chart').trigger('click')
    expect(wrapper.text()).toContain('New chart')
    await wrapper.get('form').trigger('submit')
    expect(cards(wrapper)).toHaveLength(1)
    expect(cards(wrapper)[0]!.text()).toContain('Count by region')
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('cancels without adding', async () => {
    const wrapper = mount(DashboardPanel, { props })
    await button(wrapper, 'Add chart').trigger('click')
    await button(wrapper, 'Cancel').trigger('click')
    expect(cards(wrapper)).toHaveLength(0)
  })

  it('stores only the configuration, and restores the dashboard for the same columns', async () => {
    const wrapper = mount(DashboardPanel, { props })
    await button(wrapper, 'Add chart').trigger('click')
    await wrapper.get('form').trigger('submit')
    const stored = JSON.stringify(Object.entries(localStorage))
    expect(stored).toContain('region')
    for (const secret of ['Secretland', 'Hiddenia', '987654', '123456']) expect(stored).not.toContain(secret)
    wrapper.unmount()
    const again = mount(DashboardPanel, { props: { ...props, rows: [['Other', '1']] } })
    expect(cards(again)).toHaveLength(1)
  })

  it('does not restore charts for a file with different columns', async () => {
    const wrapper = mount(DashboardPanel, { props })
    await button(wrapper, 'Add chart').trigger('click')
    await wrapper.get('form').trigger('submit')
    wrapper.unmount()
    const other = mount(DashboardPanel, { props: { headers: ['a', 'b'], rows: [['1', '2']], types: ['number', 'number'] as ColumnType[], total: 1 } })
    expect(cards(other)).toHaveLength(0)
  })

  it('edits a chart in place', async () => {
    const wrapper = mount(DashboardPanel, { props })
    await button(wrapper, 'Add chart').trigger('click')
    await wrapper.get('form').trigger('submit')
    await wrapper.get('[aria-label="Edit Count by region"]').trigger('click')
    expect(wrapper.text()).toContain('Edit chart')
    await wrapper.get('input[type=text]').setValue('Renamed')
    await wrapper.get('form').trigger('submit')
    expect(cards(wrapper)).toHaveLength(1)
    expect(cards(wrapper)[0]!.text()).toContain('Renamed')
  })

  it('deletes a chart', async () => {
    const wrapper = mount(DashboardPanel, { props })
    await button(wrapper, 'Add chart').trigger('click')
    await wrapper.get('form').trigger('submit')
    await wrapper.get('[aria-label="Delete Count by region"]').trigger('click')
    expect(cards(wrapper)).toHaveLength(0)
    expect(wrapper.find('[data-testid=dashboard-empty]').exists()).toBe(true)
  })

  it('exports a configuration file without any data', async () => {
    let blob: Blob | undefined
    Object.assign(URL, { createObjectURL: (b: Blob) => ((blob = b), 'blob:x'), revokeObjectURL: vi.fn() })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const wrapper = mount(DashboardPanel, { props })
    await button(wrapper, 'Add chart').trigger('click')
    await wrapper.get('form').trigger('submit')
    await button(wrapper, 'Save configuration').trigger('click')
    const text = await blob!.text()
    expect(JSON.parse(text).charts).toHaveLength(1)
    for (const secret of ['Secretland', 'Hiddenia', '987654']) expect(text).not.toContain(secret)
    expect(wrapper.get('[data-testid=dashboard-message]').text()).toContain('contains no data')
  })

  it('imports charts from a configuration file', async () => {
    const wrapper = mount(DashboardPanel, { props })
    await importText(wrapper, exportConfig([barChart(), barChart({ id: 'c2', type: 'pie', title: 'Pie' })]))
    expect(cards(wrapper)).toHaveLength(2)
    expect(wrapper.get('[data-testid=dashboard-message]').text()).toContain('Added 2 chart(s).')
  })

  it('skips imported charts that do not match the columns, and says why', async () => {
    const wrapper = mount(DashboardPanel, { props })
    await importText(wrapper, exportConfig([barChart(), barChart({ id: 'c2', title: 'Gone', x: 'country' })]))
    expect(cards(wrapper)).toHaveLength(1)
    const msg = wrapper.get('[data-testid=dashboard-message]').text()
    expect(msg).toContain('Skipped 1')
    expect(msg).toContain('"country" is not in this file')
  })

  it('shows a clear error for an invalid file and keeps the dashboard', async () => {
    const wrapper = mount(DashboardPanel, { props })
    await button(wrapper, 'Add chart').trigger('click')
    await wrapper.get('form').trigger('submit')
    await importText(wrapper, 'this is not json')
    expect(wrapper.get('[role=alert]').text()).toMatch(/not valid JSON/)
    expect(cards(wrapper)).toHaveLength(1)
  })

  it('lets the user dismiss messages', async () => {
    const wrapper = mount(DashboardPanel, { props })
    await importText(wrapper, 'nope')
    await wrapper.get('button[aria-label="Dismiss message"]').trigger('click')
    expect(wrapper.find('[data-testid=dashboard-message]').exists()).toBe(false)
  })

  it('warns when the browser blocks storage', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const wrapper = mount(DashboardPanel, { props })
    await button(wrapper, 'Add chart').trigger('click')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('[data-testid=storage-blocked]').text()).toMatch(/blocking storage/)
    expect(cards(wrapper)).toHaveLength(1)
  })

  it('shows chart notices such as sampling or grouping', async () => {
    const many = Array.from({ length: 30 }, (_, i) => [`c${String(i).padStart(2, '0')}`, '1'])
    const wrapper = mount(DashboardPanel, { props: { ...props, rows: many, total: 30 } })
    await importText(wrapper, exportConfig([barChart()]))
    expect(cards(wrapper)[0]!.text()).toMatch(/grouped as "Other"/)
  })
})
