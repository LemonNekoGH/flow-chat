import type { UserModule } from '~/types'
import { createPinia } from 'pinia'

// Setup Pinia
// https://pinia.vuejs.org/
export const install: UserModule = (app) => {
  const pinia = createPinia()
  app.use(pinia)
}
