<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{ select: [file: File] }>()
const dragging = ref(false)

function onChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) emit('select', file)
}

function onDrop(event: DragEvent) {
  dragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) emit('select', file)
}
</script>

<template>
  <div
    class="upload"
    :class="{ dragging }"
    data-testid="dropzone"
    @dragover.prevent="dragging = true"
    @dragleave="dragging = false"
    @drop.prevent="onDrop"
  >
    <label>
      Choose a CSV file or drop it here
      <input
        type="file"
        accept=".csv,text/csv"
        @change="onChange"
      >
    </label>
  </div>
</template>

<style scoped>
.upload {
  border: 2px dashed #999;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
}
.upload.dragging {
  border-color: #2563eb;
  background: #eff6ff;
}
</style>
