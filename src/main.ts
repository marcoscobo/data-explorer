import { createApp } from 'vue'
import App from './App.vue'
import './styles/tokens.css'
import './styles/base.css'
import { initTheme } from './composables/useTheme'

initTheme()
createApp(App).mount('#app')
