import { createApp } from 'vue'
import './style.css'
import router from './router/index.js'
import Root from './Root.vue'

createApp(Root).use(router).mount('#app')
