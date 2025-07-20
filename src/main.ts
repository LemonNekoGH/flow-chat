import type { UserModule } from './types'

import { setupLayouts } from 'layouts-generated'
import { createApp, vaporInteropPlugin } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import App from './App.vue'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'
import '@unocss/reset/tailwind.css'
import 'driver.js/dist/driver.css'

import 'vue-sonner/style.css'

import './styles/main.css'
import 'uno.css'

const routesWithLayouts = setupLayouts(routes)

const router = createRouter({
  history: createWebHistory(),
  routes: routesWithLayouts,
})

const app = createApp(App)
app.use(router)
app.use(vaporInteropPlugin)

Object.values(import.meta.glob<{ install: UserModule }>('./modules/*.ts', { eager: true }))
  .forEach(i => i.install?.(app, router))

app.mount('#app')
