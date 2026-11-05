<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '../composables/useTheme'

const { theme, toggle } = useTheme()
const label = computed(() => (theme.value === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'))
</script>

<template>
  <button
    type="button"
    class="toggle"
    :aria-label="label"
    :title="label"
    @click="toggle"
  >
    <svg
      v-if="theme === 'dark'"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      data-testid="icon-sun"
    >
      <circle
        cx="12"
        cy="12"
        r="4"
      />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
    <svg
      v-else
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      data-testid="icon-moon"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  </button>
</template>

<style scoped>
.toggle {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.toggle:hover {
  background: var(--accent-soft);
  border-color: var(--accent);
}
</style>
