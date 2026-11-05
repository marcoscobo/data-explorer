import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('vue-echarts', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      props: { option: { type: Object, required: true } },
      setup: (props) => () => h('div', { 'data-testid': 'vchart', 'data-option': JSON.stringify(props.option) }),
    }),
  }
})

import ChartBuilder from './ChartBuilder.vue'
import type { ChartConfig, ColumnInfo } from '../charts/chartConfig'
import type { ColumnType } from '../data/inferTypes'

const headers = ['region', 'day', 'sales', 'units']
const types: ColumnType[] = ['text', 'date', 'number', 'number']
const columns: ColumnInfo[] = headers.map((name, i) => ({ name, type: types[i]! }))
const rows = [
  ['North', '2025-01-01', '10', '1'],
  ['South', '2025-01-02', '30', '3'],
  ['North', '2025-01-03', '20', '2'],
]
const props = { columns, headers, rows, types }

const optionOf = (w: ReturnType<typeof mount>) => JSON.parse(w.get('[data-testid=vchart]').attributes('data-option')!)
const options = (w: ReturnType<typeof mount>, label: string) =>
  w.findAll('label').find((l) => l.text().startsWith(label))!.findAll('option').map((o) => o.text())

describe('ChartBuilder', () => {
  it('starts as a valid bar chart with a live preview', () => {
    const wrapper = mount(ChartBuilder, { props })
    expect(wrapper.text()).toContain('New chart')
    expect(wrapper.find('[data-testid=builder-problem]').exists()).toBe(false)
    expect(optionOf(wrapper).series[0].type).toBe('bar')
    expect(wrapper.get('button[type=submit]').attributes('disabled')).toBeUndefined()
  })

  it('saves the choices with an automatic title, and no data', async () => {
    const wrapper = mount(ChartBuilder, { props })
    await wrapper.get('form').trigger('submit')
    const [config] = wrapper.emitted('save')![0] as [ChartConfig]
    expect(config).toMatchObject({ type: 'bar', x: 'region', agg: 'count', title: 'Count by region' })
    expect(JSON.stringify(config)).not.toContain('North')
  })

  it('uses a custom title when given', async () => {
    const wrapper = mount(ChartBuilder, { props })
    await wrapper.get('input[type=text]').setValue('  My chart  ')
    await wrapper.get('form').trigger('submit')
    expect((wrapper.emitted('save')![0] as [ChartConfig])[0].title).toBe('My chart')
  })

  it('asks for a number column when summing', async () => {
    const wrapper = mount(ChartBuilder, { props })
    const show = wrapper.findAll('select')[1]!
    await show.setValue('sum')
    expect(options(wrapper, 'Of column')).toEqual(['sales', 'units'])
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('save')![0]![0]).toMatchObject({ agg: 'sum', y: 'sales', title: 'Sum of sales by region' })
  })

  it('offers only suitable columns per chart type', async () => {
    const wrapper = mount(ChartBuilder, { props })
    expect(options(wrapper, 'Categories')).toEqual(['region', 'day', 'sales', 'units'])
    await wrapper.findAll('input[type=radio]')[1]!.setValue(true) // line
    expect(options(wrapper, 'X axis')).toEqual(['day', 'sales', 'units'])
    expect(wrapper.get('[data-testid=type-hint]').text()).toMatch(/over time/)
    await wrapper.findAll('input[type=radio]')[3]!.setValue(true) // scatter
    expect(options(wrapper, 'X axis')).toEqual(['sales', 'units'])
    expect(options(wrapper, 'Y axis')).toEqual(['sales', 'units'])
    expect(wrapper.findAll('label').some((l) => l.text().startsWith('Show'))).toBe(false)
  })

  it('picks different default columns for a scatter chart and saves it', async () => {
    const wrapper = mount(ChartBuilder, { props })
    await wrapper.findAll('input[type=radio]')[3]!.setValue(true)
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('save')![0]![0]).toMatchObject({ type: 'scatter', x: 'sales', y: 'units' })
  })

  it('explains and blocks a chart the file cannot support', async () => {
    const textOnly = { ...props, columns: [columns[0]!], headers: ['region'], types: ['text' as ColumnType], rows: [['A']] }
    const wrapper = mount(ChartBuilder, { props: textOnly })
    await wrapper.findAll('input[type=radio]')[3]!.setValue(true)
    expect(wrapper.get('[data-testid=builder-problem]').text()).toMatch(/two number columns/)
    expect(wrapper.get('button[type=submit]').attributes('disabled')).toBeDefined()
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('save')).toBeUndefined()
    await wrapper.findAll('input[type=radio]')[1]!.setValue(true)
    expect(wrapper.get('[data-testid=builder-problem]').text()).toMatch(/date or number/)
  })

  it('edits an existing chart and keeps its id', async () => {
    const initial: ChartConfig = { id: 'keep-me', type: 'pie', title: 'Old', x: 'region', agg: 'count' }
    const wrapper = mount(ChartBuilder, { props: { ...props, initial } })
    expect(wrapper.text()).toContain('Edit chart')
    expect((wrapper.get('input[type=text]').element as HTMLInputElement).value).toBe('Old')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('save')![0]![0]).toMatchObject({ id: 'keep-me', type: 'pie', title: 'Old' })
  })

  it('emits cancel', async () => {
    const wrapper = mount(ChartBuilder, { props })
    await wrapper.findAll('button').find((b) => b.text() === 'Cancel')!.trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('shows a notice from the preview, such as grouped categories', () => {
    const many = Array.from({ length: 30 }, (_, i) => [`c${String(i).padStart(2, '0')}`, '2025-01-01', '1', '1'])
    const wrapper = mount(ChartBuilder, { props: { ...props, rows: many } })
    expect(wrapper.get('[data-testid=builder-notice]').text()).toMatch(/grouped as "Other"/)
  })

  it('defaults bar and pie to a real category column, not an ID-like one', () => {
    const cols: ColumnInfo[] = [
      { name: 'id', type: 'text' },
      { name: 'segment', type: 'text' },
      { name: 'amount', type: 'number' },
    ]
    const data = Array.from({ length: 40 }, (_, i) => [`ID-${i}`, i % 2 ? 'A' : 'B', String(i)])
    const wrapper = mount(ChartBuilder, { props: { columns: cols, headers: ['id', 'segment', 'amount'], rows: data, types: ['text', 'text', 'number'] as ColumnType[] } })
    expect((wrapper.findAll('select')[0]!.element as HTMLSelectElement).value).toBe('segment')
  })
})
