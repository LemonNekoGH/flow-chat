import type { App } from 'vue'
import type { Router } from 'vue-router'

export type UserModule = (app: App<Element>, router: Router) => void
