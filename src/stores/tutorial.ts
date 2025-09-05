import type { Driver, DriveStep } from 'driver.js'
import type { Ref } from 'vue'
import type { Tutorial } from '~/types/tutorial'
import { useLocalStorage } from '@vueuse/core'
import { driver } from 'driver.js'
import { defineStore } from 'pinia'
import { computed, nextTick, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { createTutorialRoom } from '~/utils/tutorial'
import { useMessagesStore } from './messages'
import { useRoomsStore } from './rooms'

function useTutorial(
  localStorageKey: string,
  steps: DriveStep[],
  driverObj: Ref<Driver>,
  activeTutorial: Ref<Tutorial | null>,
): Tutorial {
  const router = useRouter()

  const isFirstHere = useLocalStorage(localStorageKey, true)
  const showSkip = ref(false)

  function onCloseClick(_: Element | undefined, __: DriveStep, { driver }: { driver: Driver }) {
    if (driver.isLastStep()) {
      isFirstHere.value = false
      driver.destroy()
      activeTutorial.value = null // TODO: fix the waring: typecheck failed, present cannot be undefined
      return
    }

    showSkip.value = true
  }

  async function goToStep(stepTitle: string) {
    const index = steps.findIndex(it => it.popover?.title === stepTitle)
    if (index === -1) {
      toast.error(`Step ${stepTitle} not found`)
      return
    }

    if (stepTitle === 'Reset') {
      await router.push('/settings')
    }

    if (!driverObj.value.isActive()) {
      driverObj.value.drive(index)
      return
    }

    driverObj.value.moveTo(index)
  }

  function setConfig() {
    driverObj.value.setConfig({
      showProgress: true,
      smoothScroll: true,
      popoverClass: 'z-10001',
      showButtons: ['close', 'next', 'previous'],
      onCloseClick,
      onDestroyStarted: onCloseClick,
      steps,
    })
  }

  return {
    localStorageKey,
    steps,
    isFirstHere,
    showSkip,

    goToStep,
    setConfig,
    onCloseClick,
  }
}

export const useTutorialStore = defineStore('tutorial', () => {
  const roomsStore = useRoomsStore()
  const messagesStore = useMessagesStore()
  const router = useRouter()

  const tutorialIdMap = ref(new Map<string, string>())

  const activeTutorial = shallowRef<Tutorial | null>(null)
  const showSelectTutorial = ref(false)

  const driverObj = ref(driver({}))

  async function createTutorialChat() {
    const existsTutorialRoom = roomsStore.rooms.find(it => it.name === 'Tutorial')
    if (existsTutorialRoom) {
      await roomsStore.deleteRoom(existsTutorialRoom.id)
    }

    const tutorial = createTutorialRoom() // TODO: it won't create actually, rename it
    const tutorialRoom = await roomsStore.createRoom('Tutorial')

    await roomsStore.setCurrentRoom(tutorialRoom.id)

    tutorialIdMap.value = new Map<string, string>()
    for (const it of tutorial.messages) {
      const parentMessageId = it.parent_id ? tutorialIdMap.value.get(it.parent_id) ?? null : null
      const msg = await messagesStore.newMessage(it.content, it.role, parentMessageId, it.provider, it.model, tutorialRoom.id)
      tutorialIdMap.value.set(it.id, msg.id)
    }
  }

  const lastStep: DriveStep = {
    element: '#reset-tutorial-button',
    popover: {
      title: 'Reset',
      description: 'You can click to reset this tutorial here, have a nice chat!',
    },
  }

  const chat = shallowRef(useTutorial('tutorial/chatDriver', [
    {
      popover: {
        title: 'Tutorial Chat',
        description: 'This is the tutorial chat page. You can learn the chat operation here.',
      },
    },
    lastStep,
  ], driverObj, activeTutorial))

  const settings = shallowRef(useTutorial('tutorial/settingsDriver', [
    {
      element: '#site-title',
      popover: {
        showButtons: ['previous', 'next', 'close'],
        title: 'Welcome to Flow Chat',
        description: 'It seems like you are new here. Should me show you around?',
        nextBtnText: 'Yes, go ahead',
        prevBtnText: 'No, thanks',
        onPrevClick: (_, __, { driver, config }) => {
          driver.moveTo(config.steps!.length - 1)
        },
      },
    },
    {
      element: '#settings-btn',
      popover: {
        title: 'Settings',
        description: 'First, let\'s configure the AI service providers.',
        onNextClick: async (_, __, { driver }) => {
          await router.push('/settings')
          driver.moveNext()
        },
      },
    },
    {
      element: '#text-generation-settings-card',
      popover: {
        title: 'Text Generation Settings',
        description: 'You can set default provider and model here.',
      },
    },
    {
      element: '#edit-text-generation-provider-btn',
      popover: {
        title: 'Edit the providers',
        description: 'If you haven\'t configure any providers yet, you can click here to open the configuration page.',
        onNextClick: async (_, __, { driver }) => {
          await router.push('/settings/modules/text-generation')
          const addProviderBtn = document.querySelector('#settings-add-provider-btn')!
          document.body.scrollTop = addProviderBtn.clientTop
          await nextTick()

          driver.moveNext()
        },
      },
    },
    {
      element: '#settings-add-provider-btn',
      popover: {
        title: 'Add a provider',
        description: 'Click here to add a provider',
        onNextClick: (_, __, { driver }) => {
          const editBtn = document.querySelector('.edit-provider-btn')
          if (!editBtn) {
            toast.error('Please click the button to create a provider')
            return
          }

          driver.moveNext()
        },

        onPrevClick: async (_, __, { driver }) => {
          await router.push('/settings')
          driver.movePrevious()
        },
      },
    },
    {
      element: '.edit-provider-btn',
      popover: {
        title: 'Edit the provider',
        description: 'Select a provider to auto fill the API base url, or you can input it manually.',
        onNextClick: (_, __, { driver }) => {
          const deleteBtn = document.querySelector('.delete-provider-btn')
          if (!deleteBtn) {
            toast.error('Please click the edit button')
            return
          }

          driver.moveNext()
        },
      },
    },
    {
      element: '#provider-name',
      popover: {
        title: 'Select a provider name',
        description: 'Now you can select a provider.',
      },
    },
    {
      element: '.delete-provider-btn',
      popover: {
        title: 'Delete the provider',
        description: 'If you no longer need this provider, you can delete it.',
      },
    },
    {
      element: '#text-generation-back',
      popover: {
        title: 'Back',
        description: 'Let\'s back to the settings page.',
        onNextClick: async (_, __, { driver }) => {
          await router.push('/settings')
          driver.moveNext()
        },
      },
    },
    {
      element: '#image-generation-settings-card',
      popover: {
        title: 'Image generation settings',
        description: 'FlowChat also support image generation, you can ask LLM to generate a image, but the LLM must support tool calling.',
        onNextClick: async (_, __, { driver }) => {
          if (activeTutorial.value?.localStorageKey === 'tutorial/firstHereDriver') {
            await createTutorialChat()
          }
          else {
            await router.push('/settings')
          }

          driver.moveNext()
        },
      },
    },
    lastStep,
  ], driverObj, activeTutorial))

  const firstHere = shallowRef(useTutorial('tutorial/firstHereDriver', [
    ...settings.value.steps.slice(0, -1),
    ...chat.value.steps.slice(0, -1),
    lastStep,
  ], driverObj, activeTutorial))

  async function showTutorial(tutorial: Tutorial) {
    activeTutorial.value = tutorial

    if (tutorial.localStorageKey === chat.value.localStorageKey) {
      await createTutorialChat()
      await new Promise((resolve) => {
        setTimeout(resolve, 1000)
      })
    }

    tutorial.setConfig()

    driverObj.value.drive()
  }

  const showSkip = computed(() => activeTutorial.value?.showSkip.value)

  return {
    chat,
    settings,
    firstHere,

    showSkip,

    activeTutorial,
    showSelectTutorial,

    showTutorial,
  }
})
