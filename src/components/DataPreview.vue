<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{ fileName: string; headers: string[]; rows: string[][]; warnings: string[]; limit?: number }>(),
  { limit: 100 },
)

const shown = computed(() => props.rows.slice(0, props.limit))
</script>

<template>
  <section>
    <h2>{{ fileName }}</h2>
    <p data-testid="summary">{{ rows.length }} rows, {{ headers.length }} columns</p>
    <ul v-if="warnings.length" data-testid="warnings" class="warnings">
      <li v-for="w in warnings" :key="w">{{ w }}</li>
    </ul>
    <p v-if="rows.length > limit" data-testid="truncated">Showing the first {{ limit }} of {{ rows.length }} rows.</p>
    <div class="scroll">
      <table>
        <thead>
          <tr>
            <th v-for="(h, i) in headers" :key="i">{{ h }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, r) in shown" :key="r">
            <td v-for="(_, c) in headers" :key="c">{{ row[c] ?? '' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.scroll {
  overflow: auto;
  max-height: 60vh;
}
table {
  border-collapse: collapse;
}
th,
td {
  border: 1px solid #ccc;
  padding: 0.25rem 0.5rem;
  text-align: left;
}
.warnings {
  color: #92400e;
}
</style>
