import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('vue-echarts', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      props: { option: { type: Object, required: true } },
      setup: (props) => () => h('div', { 'data-testid': 'vchart', 'data-option': JSON.stringify(props.option) }),
    }),
  }
})

import ChartView from './ChartView.vue'
import { initTheme, useTheme } from '../composables/useTheme'
import type { ChartData } from '../charts/buildChartData'
import type { ChartConfig } from '../charts/chartConfig'

const config: ChartConfig = { id: 'a', type: 'bar', title: 'Count by region', x: 'region', agg: 'count' }
const data: ChartData = { kind: 'categories', labels: ['A', 'B'], values: [2, 1] }
const optionOf = (w: ReturnType<typeof mount>) => JSON.parse(w.get('[data-testid=vchart]').attributes('data-option')!)

beforeEach(() => {
  localStorage.clear()
  initTheme()
})

describe('ChartView', () => {
  it('renders a chart with an accessible label', () => {
    const wrapper = mount(ChartView, { props: { data, config } })
    expect(wrapper.get('figure').attributes('aria-label')).toBe('Count by region')
    expect(optionOf(wrapper).series[0].type).toBe('bar')
  })

  it('shows the message instead of a chart when there is no data', () => {
    const wrapper = mount(ChartView, { props: { data: { kind: 'empty', message: 'Nothing here' }, config } })
    expect(wrapper.get('[data-testid=chart-empty]').text()).toBe('Nothing here')
    expect(wrapper.find('[data-testid=vchart]').exists()).toBe(false)
  })

  it('uses the light palette first and switches colors with the theme', async () => {
    const wrapper = mount(ChartView, { props: { data, config } })
    expect(optionOf(wrapper).series[0].itemStyle.color).toBe('#2a78d6')
    useTheme().toggle()
    await nextTick()
    expect(optionOf(wrapper).series[0].itemStyle.color).toBe('#3987e5')
  })
})
