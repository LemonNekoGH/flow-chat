import type { RemovableRef } from '@vueuse/core'
import type { Driver, DriveStep } from 'driver.js'
import type { Ref } from 'vue'

export interface Tutorial {
  localStorageKey: string
  showSkip: Ref<boolean>
  // use setSteps() instead of create a new instance, https://github.com/kamranahmedse/driver.js/issues/464#issuecomment-2716673766
  steps: DriveStep[]
  isFirstHere: RemovableRef<boolean>

  onCloseClick: (element: Element | undefined, step: DriveStep, { driver }: { driver: Driver }) => void
  goToStep: (stepTitle: string) => void
  setConfig: () => void
}
