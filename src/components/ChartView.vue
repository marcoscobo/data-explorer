<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { BarChart, LineChart, PieChart, ScatterChart } from 'echarts/charts'
import { AriaComponent, GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { chartOption, type ChartData, type ChartStyle } from '../charts/buildChartData'
import type { ChartConfig } from '../charts/chartConfig'
import { useTheme } from '../composables/useTheme'

use([BarChart, LineChart, PieChart, ScatterChart, GridComponent, TooltipComponent, LegendComponent, AriaComponent, CanvasRenderer])

const props = defineProps<{ data: ChartData; config: ChartConfig }>()
const { theme } = useTheme()

// Categorical palette in fixed order (blue, orange, aqua, yellow, magenta, green, violet, red),
// stepped separately for each surface.
const PALETTE = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
}
const OTHER_COLOR = { light: '#8b8a85', dark: '#7c8399' }
const FALLBACK = {
  light: { text: '#0f172a', muted: '#566175', border: '#e2e8f0', surface: '#ffffff' },
  dark: { text: '#e8ecf6', muted: '#9aa6c0', border: '#26304a', surface: '#131a2e' },
}

const style = computed<ChartStyle>(() => {
  const mode = theme.value
  const css = getComputedStyle(document.documentElement)
  const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback
  const f = FALLBACK[mode]
  return {
    text: token('--text', f.text),
    muted: token('--text-muted', f.muted),
    border: token('--border', f.border),
    surface: token('--surface', f.surface),
    series: PALETTE[mode],
    other: OTHER_COLOR[mode],
  }
})

const option = computed(() => chartOption(props.data, props.config, style.value))
</script>

<template>
  <figure
    class="view"
    :aria-label="config.title"
  >
    <p
      v-if="data.kind === 'empty'"
      class="empty"
      data-testid="chart-empty"
    >
      {{ data.message }}
    </p>
    <VChart
      v-else
      class="chart"
      :option="option"
      autoresize
    />
  </figure>
</template>

<style scoped>
.view {
  height: 100%;
  min-height: 260px;
  margin: 0;
}
.chart {
  width: 100%;
  height: 100%;
  min-height: 260px;
}
.empty {
  display: grid;
  place-items: center;
  height: 100%;
  min-height: 260px;
  margin: 0;
  padding: 1rem;
  color: var(--text-muted);
  text-align: center;
}
</style>
