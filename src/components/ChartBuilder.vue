<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ChartView from './ChartView.vue'
import { buildChartData } from '../charts/buildChartData'
import {
  AGGREGATIONS,
  AGG_LABELS,
  CHART_TYPES,
  CHART_TYPE_LABELS,
  defaultTitle,
  validateConfig,
  xColumns,
  yColumns,
  type Aggregation,
  type ChartConfig,
  type ChartType,
  type ColumnInfo,
} from '../charts/chartConfig'
import { newId } from '../charts/storage'
import type { ColumnType } from '../data/inferTypes'

const props = defineProps<{
  columns: ColumnInfo[]
  headers: string[]
  rows: string[][]
  types: ColumnType[]
  initial?: ChartConfig | null
}>()
const emit = defineEmits<{ save: [config: ChartConfig]; cancel: [] }>()

const HINTS: Record<ChartType, string> = {
  bar: 'Compare categories.',
  line: 'See how a number changes over time or along another number.',
  pie: 'Show the share of each category (up to 7, the rest grouped as "Other").',
  scatter: 'See the relationship between two number columns.',
}

const type = ref<ChartType>(props.initial?.type ?? 'bar')
const x = ref(props.initial?.x ?? '')
const y = ref(props.initial?.y ?? '')
const agg = ref<Aggregation>(props.initial?.agg ?? 'count')
const title = ref(props.initial?.title ?? '')

const xOptions = computed(() => xColumns(type.value, props.columns))
const yOptions = computed(() => yColumns(props.columns))
const isScatter = computed(() => type.value === 'scatter')
const needsY = computed(() => isScatter.value || agg.value !== 'count')

/** Keeps the selected columns valid for the chosen chart type. */
function distinctCount(name: string): number {
  const i = props.headers.indexOf(name)
  return new Set(props.rows.map((r) => r[i])).size
}

/** For bar and pie, prefer a text column with few distinct values (a real category) over an ID-like one. */
function defaultX(): string {
  if (type.value === 'bar' || type.value === 'pie') {
    const category = xOptions.value.find((c) => c.type === 'text' && distinctCount(c.name) <= 20)
    if (category) return category.name
  }
  return xOptions.value[0]?.name ?? ''
}

function normalize() {
  if (!xOptions.value.some((c) => c.name === x.value)) x.value = defaultX()
  if (needsY.value && !yOptions.value.some((c) => c.name === y.value)) {
    const other = yOptions.value.find((c) => c.name !== x.value) ?? yOptions.value[0]
    y.value = other?.name ?? ''
  }
}
normalize()
watch([type, agg, x], normalize)

const config = computed<ChartConfig>(() => {
  const base = {
    type: type.value,
    x: x.value,
    y: needsY.value ? y.value : undefined,
    agg: isScatter.value ? ('count' as const) : agg.value,
  }
  return {
    id: props.initial?.id ?? newId(),
    ...base,
    title: title.value.trim() || defaultTitle(base),
  }
})

const problem = computed(() => {
  if (xOptions.value.length === 0) {
    return isScatter.value
      ? 'A scatter chart needs two number columns, and this file has fewer.'
      : 'A line chart needs a date or number column, and this file has none.'
  }
  if (needsY.value && yOptions.value.length === 0) return 'This file has no number columns to summarize. Choose "Count of rows" instead.'
  return validateConfig(config.value, props.columns)
})

const preview = computed(() => (problem.value ? null : buildChartData(config.value, props.headers, props.rows, props.types)))
const notice = computed(() => (preview.value && 'notice' in preview.value ? preview.value.notice : undefined))
const typeLabel = (t: ChartType) => CHART_TYPE_LABELS[t]
</script>

<template>
  <form
    class="builder"
    @submit.prevent="!problem && emit('save', config)"
  >
    <h3>{{ initial ? 'Edit chart' : 'New chart' }}</h3>

    <fieldset class="types">
      <legend>Chart type</legend>
      <label
        v-for="t in CHART_TYPES"
        :key="t"
        :class="{ on: type === t }"
      >
        <input
          v-model="type"
          type="radio"
          name="chart-type"
          :value="t"
        >
        {{ typeLabel(t) }}
      </label>
    </fieldset>
    <p
      class="hint"
      data-testid="type-hint"
    >
      {{ HINTS[type] }}
    </p>

    <div class="fields">
      <label>
        {{ type === 'bar' || type === 'pie' ? 'Categories' : 'X axis' }}
        <select
          v-model="x"
          :disabled="xOptions.length === 0"
        >
          <option
            v-for="c in xOptions"
            :key="c.name"
            :value="c.name"
          >{{ c.name }}</option>
        </select>
      </label>

      <label v-if="!isScatter">
        Show
        <select v-model="agg">
          <option
            v-for="a in AGGREGATIONS"
            :key="a"
            :value="a"
          >{{ AGG_LABELS[a] }}</option>
        </select>
      </label>

      <label v-if="needsY">
        {{ isScatter ? 'Y axis' : 'Of column' }}
        <select
          v-model="y"
          :disabled="yOptions.length === 0"
        >
          <option
            v-for="c in yOptions"
            :key="c.name"
            :value="c.name"
          >{{ c.name }}</option>
        </select>
      </label>

      <label class="wide">
        Title
        <input
          v-model="title"
          type="text"
          maxlength="80"
          :placeholder="config.title"
        >
      </label>
    </div>

    <p
      v-if="problem"
      class="problem"
      role="alert"
      data-testid="builder-problem"
    >
      {{ problem }}
    </p>

    <div
      v-if="preview"
      class="preview"
    >
      <ChartView
        :data="preview"
        :config="config"
      />
      <p
        v-if="notice"
        class="notice"
        data-testid="builder-notice"
      >
        {{ notice }}
      </p>
    </div>

    <div class="buttons">
      <button
        type="submit"
        class="primary"
        :disabled="!!problem"
      >
        Save chart
      </button>
      <button
        type="button"
        @click="emit('cancel')"
      >
        Cancel
      </button>
    </div>
  </form>
</template>

<style scoped>
.builder {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 0 1.25rem 1rem;
  padding: 1rem 1.25rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-alt);
}
h3 {
  font-size: 1.0625rem;
}
.types {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  border: 0;
}
.types legend {
  margin-bottom: 0.375rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
  font-weight: 650;
}
.types label {
  display: inline-flex;
  align-items: center;
  padding: 0.4rem 0.875rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  font-weight: 600;
  cursor: pointer;
}
.types label.on {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}
.types input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
.types label:focus-within {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
}
.hint {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.9375rem;
}
.fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 0.75rem;
}
.fields label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
  font-weight: 650;
}
.fields .wide {
  grid-column: 1 / -1;
}
select,
input[type='text'] {
  padding: 0.5rem 0.625rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 400;
}
.problem {
  margin: 0;
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--warn-border);
  border-radius: 8px;
  background: var(--warn-bg);
  color: var(--warn-text);
  font-size: 0.9375rem;
}
.preview {
  min-height: 300px;
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
}
.notice {
  margin: 0.25rem 0 0;
  color: var(--text-muted);
  font-size: 0.8125rem;
}
.buttons {
  display: flex;
  gap: 0.5rem;
}
.buttons button {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.buttons .primary {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--on-accent);
}
.buttons button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
