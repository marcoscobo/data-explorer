<script setup lang="ts">
import { computed, defineAsyncComponent, reactive, ref, watch } from 'vue'
import StatsPanel from './StatsPanel.vue'
import { computeStats } from '../data/computeStats'
import {
  emptyFilters,
  filterRows,
  hasActiveFilters,
  isContainsFilter,
  isRangeFilter,
  type ColumnFilter,
} from '../data/filterRows'
import { inferTypes } from '../data/inferTypes'
import { nextSort, sortRows, type SortState } from '../data/sortRows'

const props = withDefaults(
  defineProps<{
    fileName: string
    fileSize?: number
    headers: string[]
    rows: string[][]
    warnings: string[]
    pageSize?: number
    /** Sheet names when the file is a workbook, and the one being shown. */
    sheets?: string[]
    sheet?: string
  }>(),
  { fileSize: undefined, pageSize: 100, sheets: undefined, sheet: undefined },
)
const emit = defineEmits<{ sheet: [name: string] }>()

// Loaded on demand so ECharts is not part of the initial download.
const DashboardPanel = defineAsyncComponent(() => import('./DashboardPanel.vue'))

const nf = new Intl.NumberFormat('en-US')
const tab = ref<'data' | 'stats' | 'charts'>('data')
const REGION_LABELS = { data: 'Data preview table', stats: 'Column statistics', charts: 'Chart dashboard' }
const filters = reactive(emptyFilters())
const sort = ref<SortState | null>(null)
const page = ref(1)

const types = computed(() => inferTypes(props.headers, props.rows))
const filtered = computed(() => filterRows(props.rows, types.value, filters))
const sorted = computed(() =>
  sort.value ? sortRows(filtered.value, sort.value.column, types.value[sort.value.column] ?? 'text', sort.value.direction) : filtered.value,
)
const pageCount = computed(() => Math.max(1, Math.ceil(sorted.value.length / props.pageSize)))
const pageRows = computed(() => sorted.value.slice((page.value - 1) * props.pageSize, page.value * props.pageSize))
const stats = computed(() => computeStats(props.headers, filtered.value, types.value))
const filtering = computed(() => hasActiveFilters(filters))
const firstShown = computed(() => (sorted.value.length === 0 ? 0 : (page.value - 1) * props.pageSize + 1))
const lastShown = computed(() => Math.min(page.value * props.pageSize, sorted.value.length))

watch([() => filters.search, () => filters.columns, sort], () => (page.value = 1), { deep: true })

function plural(n: number, one: string) {
  return `${nf.format(n)} ${n === 1 ? one : one + 's'}`
}

const rowsLabel = computed(() =>
  filtering.value ? `${nf.format(filtered.value.length)} of ${plural(props.rows.length, 'row')}` : plural(props.rows.length, 'row'),
)

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function ariaSort(c: number) {
  if (sort.value?.column !== c) return 'none'
  return sort.value.direction === 'asc' ? 'ascending' : 'descending'
}

function containsValue(c: number): string {
  const f = filters.columns[c]
  return f && isContainsFilter(f) ? (f.contains ?? '') : ''
}

function boundValue(c: number, bound: 'min' | 'max'): string {
  const f = filters.columns[c]
  const v = f && isRangeFilter(f) ? f[bound] : undefined
  return v === undefined ? '' : String(v)
}

function setContains(c: number, value: string) {
  filters.columns[c] = { contains: value }
}

function setBound(c: number, bound: 'min' | 'max', raw: string) {
  const current = filters.columns[c]
  const base: ColumnFilter = current && isRangeFilter(current) ? current : {}
  filters.columns[c] = { ...base, [bound]: raw.trim() === '' ? undefined : Number(raw) }
}

function clearFilters() {
  filters.search = ''
  filters.columns = {}
}
</script>

<template>
  <section class="card">
    <header class="head">
      <div class="file">
        <h2>{{ fileName }}</h2>
        <span
          v-if="fileSize !== undefined"
          class="size"
          data-testid="size"
        >{{ formatSize(fileSize) }}</span>
        <label
          v-if="sheets && sheets.length > 1"
          class="sheet"
        >
          Sheet
          <select
            :value="sheet"
            @change="emit('sheet', ($event.target as HTMLSelectElement).value)"
          >
            <option
              v-for="name in sheets"
              :key="name"
              :value="name"
            >{{ name }}</option>
          </select>
        </label>
      </div>
      <div
        class="chips"
        data-testid="summary"
      >
        <span
          class="chip"
          data-testid="rows"
        >{{ rowsLabel }}</span>
        <span
          class="chip"
          data-testid="columns"
        >{{ plural(headers.length, 'column') }}</span>
      </div>
    </header>

    <div class="toolbar">
      <div
        class="tabs"
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          :aria-selected="tab === 'data'"
          :class="{ active: tab === 'data' }"
          @click="tab = 'data'"
        >
          Data
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="tab === 'stats'"
          :class="{ active: tab === 'stats' }"
          @click="tab = 'stats'"
        >
          Statistics
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="tab === 'charts'"
          :class="{ active: tab === 'charts' }"
          @click="tab = 'charts'"
        >
          Charts
        </button>
      </div>
      <input
        v-model="filters.search"
        class="search"
        type="search"
        placeholder="Search all columns…"
        aria-label="Search all columns"
      >
      <button
        v-if="filtering"
        type="button"
        class="clear"
        @click="clearFilters"
      >
        Clear filters
      </button>
    </div>

    <div
      v-if="warnings.length"
      class="banner"
      role="status"
      data-testid="warnings"
    >
      <strong>Heads up</strong>
      <ul>
        <li
          v-for="w in warnings"
          :key="w"
        >
          {{ w }}
        </li>
      </ul>
    </div>

    <div
      class="scroll"
      tabindex="0"
      role="region"
      :aria-label="REGION_LABELS[tab]"
    >
      <table v-if="tab === 'data'">
        <thead>
          <tr>
            <th
              v-for="(h, c) in headers"
              :key="c"
              scope="col"
              :aria-sort="ariaSort(c)"
            >
              <button
                type="button"
                class="sort"
                @click="sort = nextSort(sort, c)"
              >
                {{ h }}
                <span
                  class="arrow"
                  aria-hidden="true"
                >{{ sort?.column === c ? (sort.direction === 'asc' ? '↑' : '↓') : '' }}</span>
              </button>
            </th>
          </tr>
          <tr class="filter-row">
            <th
              v-for="(h, c) in headers"
              :key="c"
            >
              <span
                v-if="types[c] === 'number'"
                class="range"
              >
                <input
                  type="number"
                  step="any"
                  placeholder="Min"
                  :aria-label="`Minimum ${h}`"
                  :value="boundValue(c, 'min')"
                  @input="setBound(c, 'min', ($event.target as HTMLInputElement).value)"
                >
                <input
                  type="number"
                  step="any"
                  placeholder="Max"
                  :aria-label="`Maximum ${h}`"
                  :value="boundValue(c, 'max')"
                  @input="setBound(c, 'max', ($event.target as HTMLInputElement).value)"
                >
              </span>
              <input
                v-else
                type="text"
                :placeholder="types[c] === 'date' ? 'e.g. 2025-03' : 'Contains…'"
                :aria-label="`Filter ${h}`"
                :value="containsValue(c)"
                @input="setContains(c, ($event.target as HTMLInputElement).value)"
              >
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, r) in pageRows"
            :key="r"
          >
            <td
              v-for="(_, c) in headers"
              :key="c"
            >
              {{ row[c] ?? '' }}
            </td>
          </tr>
          <tr v-if="pageRows.length === 0">
            <td
              :colspan="headers.length"
              class="empty"
              data-testid="no-match"
            >
              {{ rows.length === 0 ? 'This file has no data rows.' : 'No rows match your filters.' }}
            </td>
          </tr>
        </tbody>
      </table>
      <DashboardPanel
        v-else-if="tab === 'charts'"
        :headers="headers"
        :rows="filtered"
        :types="types"
        :total="rows.length"
      />
      <StatsPanel
        v-else
        :stats="stats"
        :total="rows.length"
        :filtered="filtered.length"
      />
    </div>

    <footer
      v-if="tab === 'data'"
      class="pager"
    >
      <span data-testid="pager-label">Rows {{ nf.format(firstShown) }}–{{ nf.format(lastShown) }} of {{ nf.format(sorted.length) }}</span>
      <span
        v-if="pageCount > 1"
        class="pages"
      >
        <button
          type="button"
          :disabled="page <= 1"
          @click="page--"
        >Previous</button>
        <span data-testid="page-label">Page {{ page }} of {{ pageCount }}</span>
        <button
          type="button"
          :disabled="page >= pageCount"
          @click="page++"
        >Next</button>
      </span>
    </footer>
  </section>
</template>

<style scoped>
.card {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
}
.head {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
}
.file {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  min-width: 0;
}
h2 {
  font-size: 1.125rem;
  overflow-wrap: anywhere;
}
.sheet {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--text-muted);
  font-size: 0.875rem;
}
.sheet select {
  max-width: 12rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
}
.size {
  color: var(--text-muted);
  font-size: 0.875rem;
  white-space: nowrap;
}
.chips {
  display: flex;
  gap: 0.5rem;
}
.chip {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
}
.toolbar {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--border);
}
.tabs {
  display: inline-flex;
  padding: 3px;
  border-radius: 10px;
  background: var(--surface-alt);
  border: 1px solid var(--border);
}
.tabs button {
  padding: 0.375rem 0.875rem;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
}
.tabs button.active {
  background: var(--surface);
  color: var(--accent);
  box-shadow: 0 1px 2px rgb(15 23 42 / 12%);
}
.search {
  flex: 1 1 14rem;
  min-width: 0;
  max-width: 24rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: 0.9375rem;
}
.clear {
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--accent);
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}
.clear:hover {
  background: var(--accent-soft);
}
.banner {
  flex: none;
  margin: 0.75rem 1.25rem 0;
  padding: 0.75rem 1rem;
  border: 1px solid var(--warn-border);
  border-radius: 8px;
  background: var(--warn-bg);
  color: var(--warn-text);
  font-size: 0.9375rem;
}
.banner ul {
  margin: 0.25rem 0 0;
  padding-left: 1.25rem;
}
.scroll {
  flex: 1 1 auto;
  min-height: 0;
  margin-top: 0.75rem;
  overflow: auto; /* the single scroll area of the page, both directions */
}
table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.9375rem;
  font-variant-numeric: tabular-nums;
}
thead {
  position: sticky;
  top: 0;
  z-index: 1;
}
th,
td {
  padding: 0.625rem 1rem;
  text-align: left;
  white-space: nowrap;
  border-bottom: 1px solid var(--border);
}
thead th {
  background: var(--surface-alt);
  color: var(--text-muted);
  font-size: 0.8125rem;
  font-weight: 650;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
.sort {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  cursor: pointer;
}
.sort:hover {
  color: var(--accent);
}
.arrow {
  min-width: 1ch;
  color: var(--accent);
}
.filter-row th {
  padding: 0.375rem 1rem;
  text-transform: none;
  font-weight: 400;
  letter-spacing: normal;
}
.filter-row input {
  width: 100%;
  min-width: 5.5rem;
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: 0.8125rem;
}
.range {
  display: flex;
  gap: 0.25rem;
}
.range input {
  min-width: 4.5rem;
}
tbody tr:nth-child(even) {
  background: var(--surface-alt);
}
tbody tr:hover {
  background: var(--accent-soft);
}
.empty {
  padding: 2rem 1rem;
  color: var(--text-muted);
  text-align: center;
  white-space: normal;
}
.pager {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-top: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 0.875rem;
}
.pages {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
}
.pages button {
  padding: 0.3rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  cursor: pointer;
}
.pages button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
