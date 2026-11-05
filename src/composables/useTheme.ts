import { ref } from 'vue'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'data-explorer-theme'
const theme = ref<Theme>('light')

function apply(value: Theme) {
  document.documentElement.dataset.theme = value
}

/** Restores the saved theme; light is the default. Storage may be unavailable, so it never throws. */
export function initTheme() {
  let saved: string | null = null
  try {
    saved = localStorage.getItem(STORAGE_KEY)
  } catch {
    /* storage blocked: keep the default */
  }
  theme.value = saved === 'dark' ? 'dark' : 'light'
  apply(theme.value)
}

export function useTheme() {
  function toggle() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    apply(theme.value)
    try {
      localStorage.setItem(STORAGE_KEY, theme.value)
    } catch {
      /* storage blocked: the choice just won't persist */
    }
  }
  return { theme, toggle }
}
