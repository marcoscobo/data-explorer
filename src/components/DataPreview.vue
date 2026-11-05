<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    fileName: string
    fileSize?: number
    headers: string[]
    rows: string[][]
    warnings: string[]
    limit?: number
  }>(),
  { fileSize: undefined, limit: 100 },
)

const shown = computed(() => props.rows.slice(0, props.limit))
const nf = new Intl.NumberFormat('en-US')

function plural(n: number, one: string) {
  return `${nf.format(n)} ${n === 1 ? one : one + 's'}`
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
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
      </div>
      <div
        class="chips"
        data-testid="summary"
      >
        <span
          class="chip"
          data-testid="rows"
        >{{ plural(rows.length, 'row') }}</span>
        <span
          class="chip"
          data-testid="columns"
        >{{ plural(headers.length, 'column') }}</span>
      </div>
    </header>

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
      aria-label="Data preview table"
    >
      <table>
        <thead>
          <tr>
            <th
              v-for="(h, i) in headers"
              :key="i"
              scope="col"
            >
              {{ h }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, r) in shown"
            :key="r"
          >
            <td
              v-for="(_, c) in headers"
              :key="c"
            >
              {{ row[c] ?? '' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p
      v-if="rows.length > limit"
      class="note"
      data-testid="truncated"
    >
      Showing the first {{ limit }} of {{ rows.length }} rows.
    </p>
  </section>
</template>

<style scoped>
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
}
.head {
  display: flex;
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
.banner {
  margin: 1rem 1.25rem 0;
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
  overflow: auto;
  max-height: 60vh;
  margin-top: 1rem;
}
table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.9375rem;
  font-variant-numeric: tabular-nums;
}
th,
td {
  padding: 0.625rem 1rem;
  text-align: left;
  white-space: nowrap;
  border-bottom: 1px solid var(--border);
}
th {
  position: sticky;
  top: 0;
  background: var(--surface-alt);
  color: var(--text-muted);
  font-size: 0.8125rem;
  font-weight: 650;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
tbody tr:nth-child(even) {
  background: var(--surface-alt);
}
tbody tr:hover {
  background: var(--accent-soft);
}
.note {
  margin: 0;
  padding: 0.75rem 1.25rem;
  border-top: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 0.875rem;
}
</style>
