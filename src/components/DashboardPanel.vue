<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ChartBuilder from './ChartBuilder.vue'
import ChartView from './ChartView.vue'
import { buildChartData } from '../charts/buildChartData'
import { MAX_CHARTS, type ChartConfig, type ColumnInfo } from '../charts/chartConfig'
import {
  downloadText,
  exportConfig,
  fingerprint,
  loadDashboard,
  parseImport,
  partitionByColumns,
  saveDashboard,
} from '../charts/storage'
import type { ColumnType } from '../data/inferTypes'

const props = defineProps<{ headers: string[]; rows: string[][]; types: ColumnType[]; total: number }>()

const columns = computed<ColumnInfo[]>(() => props.headers.map((name, i) => ({ name, type: props.types[i] ?? 'text' })))
const fp = computed(() => fingerprint(columns.value))

const charts = ref<ChartConfig[]>(loadDashboard(fp.value))
const editing = ref<'new' | string | null>(null)
const message = ref<{ kind: 'error' | 'info'; text: string } | null>(null)
const storageBlocked = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

watch(
  charts,
  (value) => {
    storageBlocked.value = !saveDashboard(fp.value, value)
  },
  { deep: true },
)

const prepared = computed(
  () => new Map(charts.value.map((c) => [c.id, buildChartData(c, props.headers, props.rows, props.types)])),
)
const editingChart = computed(() => charts.value.find((c) => c.id === editing.value) ?? null)
const nf = new Intl.NumberFormat('en-US')
const noticeOf = (id: string) => {
  const d = prepared.value.get(id)
  return d && 'notice' in d ? d.notice : undefined
}

function onSave(config: ChartConfig) {
  const i = charts.value.findIndex((c) => c.id === config.id)
  if (i >= 0) charts.value[i] = config
  else if (charts.value.length < MAX_CHARTS) charts.value.push(config)
  else message.value = { kind: 'error', text: `A dashboard can hold up to ${MAX_CHARTS} charts.` }
  editing.value = null
}

function remove(id: string) {
  charts.value = charts.value.filter((c) => c.id !== id)
  if (editing.value === id) editing.value = null
}

function exportFile() {
  downloadText('data-explorer-dashboard.json', exportConfig(charts.value))
  message.value = { kind: 'info', text: 'Saved the chart settings to a file. It contains no data.' }
}

async function onImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  let text: string
  try {
    text = await file.text()
  } catch {
    message.value = { kind: 'error', text: 'The file could not be read.' }
    return
  }
  const result = parseImport(text)
  if (!result.ok) {
    message.value = { kind: 'error', text: result.error }
    return
  }
  const { valid, skipped } = partitionByColumns(result.charts, columns.value)
  const room = MAX_CHARTS - charts.value.length
  charts.value.push(...valid.slice(0, room))
  const parts = [`Added ${valid.slice(0, room).length} chart(s).`]
  if (valid.length > room) parts.push(`${valid.length - room} more did not fit (limit ${MAX_CHARTS}).`)
  if (skipped.length) {
    parts.push(`Skipped ${skipped.length} that do not match this file: ${skipped.map((s) => `"${s.chart.title}" (${s.reason})`).join(' ')}`)
  }
  message.value = { kind: skipped.length || valid.length > room ? 'error' : 'info', text: parts.join(' ') }
}
</script>

<template>
  <div class="panel">
    <div class="bar">
      <button
        type="button"
        class="primary"
        @click="editing = 'new'"
      >
        Add chart
      </button>
      <button
        type="button"
        :disabled="charts.length === 0"
        @click="exportFile"
      >
        Save configuration
      </button>
      <button
        type="button"
        @click="fileInput?.click()"
      >
        Load configuration
      </button>
      <input
        ref="fileInput"
        class="file"
        type="file"
        accept=".json,application/json"
        aria-label="Load configuration file"
        @change="onImport"
      >
      <p
        class="basis"
        data-testid="charts-basis"
      >
        <template v-if="rows.length === total">
          Charts use all {{ nf.format(total) }} rows.
        </template>
        <template v-else>
          Charts use the {{ nf.format(rows.length) }} of {{ nf.format(total) }} filtered rows.
        </template>
        Only chart settings are saved, never your data.
      </p>
    </div>

    <p
      v-if="message"
      class="message"
      :class="message.kind"
      :role="message.kind === 'error' ? 'alert' : 'status'"
      data-testid="dashboard-message"
    >
      {{ message.text }}
      <button
        type="button"
        class="dismiss"
        aria-label="Dismiss message"
        @click="message = null"
      >
        ×
      </button>
    </p>
    <p
      v-if="storageBlocked"
      class="message error"
      role="alert"
      data-testid="storage-blocked"
    >
      Your browser is blocking storage, so this dashboard won't be remembered. You can still save it as a file.
    </p>

    <ChartBuilder
      v-if="editing"
      :key="editing"
      :columns="columns"
      :headers="headers"
      :rows="rows"
      :types="types"
      :initial="editingChart"
      @save="onSave"
      @cancel="editing = null"
    />

    <p
      v-if="charts.length === 0 && !editing"
      class="empty"
      data-testid="dashboard-empty"
    >
      No charts yet. Choose "Add chart" to build your first one.
    </p>

    <div
      v-if="charts.length"
      class="grid"
    >
      <section
        v-for="c in charts"
        :key="c.id"
        class="card"
        data-testid="chart-card"
      >
        <header>
          <h3>{{ c.title }}</h3>
          <span class="actions">
            <button
              type="button"
              :aria-label="`Edit ${c.title}`"
              @click="editing = c.id"
            >Edit</button>
            <button
              type="button"
              :aria-label="`Delete ${c.title}`"
              @click="remove(c.id)"
            >Delete</button>
          </span>
        </header>
        <div class="chartbox">
          <ChartView
            :data="prepared.get(c.id)!"
            :config="c"
          />
        </div>
        <p
          v-if="noticeOf(c.id)"
          class="notice"
        >
          {{ noticeOf(c.id) }}
        </p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.panel {
  padding: 0.75rem 0 1.25rem;
}
.bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0 1.25rem 0.75rem;
}
.bar button,
.card button {
  padding: 0.4rem 0.875rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
}
.bar .primary {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--on-accent);
}
.bar button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.file {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
.basis {
  flex: 1 1 18rem;
  margin: 0;
  color: var(--text-muted);
  font-size: 0.875rem;
}
.message {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin: 0 1.25rem 0.75rem;
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.9375rem;
}
.message.info {
  background: var(--accent-soft);
  color: var(--text);
}
.message.error {
  border-color: var(--error-border);
  background: var(--error-bg);
  color: var(--error-text);
}
.message .dismiss {
  padding: 0 0.5rem;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 1.25rem;
  line-height: 1.2;
  cursor: pointer;
}
.empty {
  margin: 0;
  padding: 2.5rem 1.25rem;
  color: var(--text-muted);
  text-align: center;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 24rem), 1fr));
  gap: 1rem;
  padding: 0 1.25rem;
}
.card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}
.card header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.75rem 1rem 0;
}
.card h3 {
  font-size: 1rem;
  overflow-wrap: anywhere;
}
.actions {
  display: inline-flex;
  gap: 0.375rem;
}
.actions button {
  padding: 0.25rem 0.625rem;
  font-size: 0.8125rem;
}
.chartbox {
  height: 300px;
  padding: 0.5rem;
}
.notice {
  margin: 0;
  padding: 0 1rem 0.75rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
}
</style>
