<script setup lang="ts">
import { ref } from 'vue'
import { ACCEPT } from '../import/importFile'

defineProps<{ compact?: boolean }>()
const emit = defineEmits<{ select: [file: File] }>()
const dragging = ref(false)

function onChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('select', file)
  input.value = '' // allow choosing the same file again
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
    :class="{ dragging, compact }"
    data-testid="dropzone"
    @dragover.prevent="dragging = true"
    @dragleave="dragging = false"
    @drop.prevent="onDrop"
  >
    <span
      class="icon"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        width="28"
        height="28"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" />
        <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      </svg>
    </span>
    <label class="label">
      <span class="title">{{ compact ? 'Drop another file here' : 'Drop your file here' }}</span>
      <span class="hint">CSV, Excel or JSON, or <span class="browse">browse your files</span></span>
      <input
        class="input"
        type="file"
        :accept="ACCEPT"
        @change="onChange"
      >
    </label>
  </div>
</template>

<style scoped>
.upload {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2.5rem 1.5rem;
  background: var(--surface);
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  text-align: center;
  transition: border-color 0.15s, background 0.15s;
}
.upload:hover,
.upload.dragging {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.upload:focus-within {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
}
.icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
}
.label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  cursor: pointer;
}
.title {
  font-size: 1.125rem;
  font-weight: 650;
}
.hint {
  color: var(--text-muted);
}
.browse {
  color: var(--accent);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}
/* Covers the whole zone so a click anywhere opens the picker; stays keyboard-focusable. */
.input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.upload.compact {
  flex: none;
  flex-direction: row;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.625rem 1rem;
  border-width: 1px;
  box-shadow: none;
}
.compact .icon {
  width: 32px;
  height: 32px;
}
.compact .icon svg {
  width: 18px;
  height: 18px;
}
.compact .label {
  flex-direction: row;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
}
.compact .title {
  font-size: 0.9375rem;
}
</style>
