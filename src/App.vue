<script setup lang="ts">
import { ref } from 'vue'
import FileUpload from './components/FileUpload.vue'
import DataPreview from './components/DataPreview.vue'
import { isCsvFile, parseCsv, type CsvResult } from './csv/parseCsv'

const title = 'Data Explorer'
const fileName = ref('')
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
  <main>
    <h1>{{ title }}</h1>
    <FileUpload @select="onSelect" />
    <p
      v-if="error"
      role="alert"
      class="error"
    >
      {{ error }}
    </p>
    <DataPreview
      v-if="result?.ok"
      :file-name="fileName"
      :headers="result.headers"
      :rows="result.rows"
      :warnings="result.warnings"
    />
  </main>
</template>

<style scoped>
.error {
  color: #b91c1c;
}
</style>
