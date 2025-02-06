import type { UserModule } from '~/types'
import { createPinia } from 'pinia'
import { createPersistedState } from 'pinia-plugin-persistedstate'

// Setup Pinia
// https://pinia.vuejs.org/
export const install: UserModule = (app) => {
  const pinia = createPinia()
  pinia.use(createPersistedState())
  app.use(pinia)
}
