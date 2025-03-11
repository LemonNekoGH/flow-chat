import { defineStore } from 'pinia'
import { ref } from 'vue'

export enum ChatMode {
  FLOW = 'flow',
  CONVERSATION = 'conversation',
}

export const useModeStore = defineStore('mode', () => {
  const currentMode = ref(ChatMode.FLOW)

  return {
    currentMode,
  }
})
