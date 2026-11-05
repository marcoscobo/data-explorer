<script setup lang="ts">
import type { ColumnStats } from '../data/computeStats'

defineProps<{ stats: ColumnStats[]; total: number; filtered: number }>()

const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
const fmt = (n: number | null | undefined) => (n === null || n === undefined ? '' : nf.format(n))
</script>

<template>
  <div>
    <p
      class="basis"
      data-testid="stats-basis"
    >
      <template v-if="filtered === total">
        Based on all {{ nf.format(total) }} rows.
      </template>
      <template v-else>
        Based on {{ nf.format(filtered) }} of {{ nf.format(total) }} rows (filters applied).
      </template>
    </p>
    <table>
      <thead>
        <tr>
          <th scope="col">
            Column
          </th>
          <th scope="col">
            Type
          </th>
          <th scope="col">
            Filled
          </th>
          <th scope="col">
            Missing
          </th>
          <th scope="col">
            Unique
          </th>
          <th scope="col">
            Min
          </th>
          <th scope="col">
            Max
          </th>
          <th scope="col">
            Mean
          </th>
          <th scope="col">
            Median
          </th>
          <th scope="col">
            Std dev
          </th>
          <th scope="col">
            Most frequent
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(s, i) in stats"
          :key="i"
          data-testid="stats-row"
        >
          <th scope="row">
            {{ s.name }}
          </th>
          <td>{{ s.type }}</td>
          <td>{{ fmt(s.filled) }}</td>
          <td>{{ fmt(s.missing) }}</td>
          <td>{{ fmt(s.unique) }}</td>
          <td>{{ s.numbers ? fmt(s.numbers.min) : (s.dates?.min ?? '') }}</td>
          <td>{{ s.numbers ? fmt(s.numbers.max) : (s.dates?.max ?? '') }}</td>
          <td>{{ fmt(s.numbers?.mean) }}</td>
          <td>{{ fmt(s.numbers?.median) }}</td>
          <td>{{ fmt(s.numbers?.stdDev) }}</td>
          <td>{{ s.top?.map((t) => `${t.value} (${t.count})`).join(', ') ?? '' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.basis {
  margin: 0;
  padding: 0.75rem 1rem;
  color: var(--text-muted);
  font-size: 0.875rem;
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
tbody th {
  font-weight: 650;
}
tbody tr:nth-child(even) {
  background: var(--surface-alt);
}
td:last-child {
  white-space: normal;
  min-width: 14rem;
}
</style>
