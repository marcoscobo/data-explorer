import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist',
    // ECharts lives in its own lazy-loaded chunk (the Charts tab), so the initial download stays small.
    chunkSizeWarningLimit: 700,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'api/**/*.test.ts'],
  },
})
