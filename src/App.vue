<script setup lang="ts">
import { ref } from 'vue'
import FileUpload from './components/FileUpload.vue'
import DataPreview from './components/DataPreview.vue'
import { isCsvFile, parseCsv, type CsvResult } from './csv/parseCsv'

const title = 'Data Explorer'
const fileName = ref('')
const fileSize = ref(0)
const result = ref<CsvResult | null>(null)
const error = ref('')

async function onSelect(file: File) {
  result.value = null
  error.value = ''
  if (!isCsvFile(file)) {
    error.value = `"${file.name}" is not a CSV file. Please choose a file ending in .csv.`
    return
  }
  try {
    const parsed = parseCsv(await file.text())
    if (parsed.ok) {
      fileName.value = file.name
      fileSize.value = file.size
      result.value = parsed
    } else {
      error.value = parsed.error
    }
  } catch {
    error.value = 'The file could not be read. Please try again or choose another file.'
  }
}
</script>

<template>
  <div class="page">
    <header class="header">
      <div class="brand">
        <span
          class="logo"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
          >
            <path d="M5 20V11M12 20V4M19 20v-6" />
          </svg>
        </span>
        <h1>{{ title }}</h1>
      </div>
      <p class="privacy">
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect
            x="5"
            y="11"
            width="14"
            height="9"
            rx="2"
          />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        Your data stays in your browser
      </p>
    </header>

    <main class="main">
      <p class="intro">
        Upload a CSV file to explore it. No code needed.
      </p>
      <FileUpload @select="onSelect" />
      <div
        v-if="error"
        role="alert"
        class="error"
      >
        <strong>We couldn't open this file</strong>
        <p>{{ error }}</p>
      </div>
      <DataPreview
        v-if="result?.ok"
        :file-name="fileName"
        :file-size="fileSize"
        :headers="result.headers"
        :rows="result.rows"
        :warnings="result.warnings"
      />
    </main>
  </div>
</template>

<style scoped>
.page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.25rem 1rem 3rem;
}
.header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-bottom: 1.5rem;
}
.brand {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}
.logo {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--accent);
  color: var(--on-accent);
}
h1 {
  font-size: 1.375rem;
}
.privacy {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  margin: 0;
  padding: 0.25rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text-muted);
  font-size: 0.875rem;
}
.main {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.intro {
  margin: 0;
  color: var(--text-muted);
  font-size: 1.0625rem;
}
.error {
  padding: 0.875rem 1.125rem;
  border: 1px solid var(--error-border);
  border-radius: var(--radius);
  background: var(--error-bg);
  color: var(--error-text);
}
.error p {
  margin: 0.25rem 0 0;
}
</style>
