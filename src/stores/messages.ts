import type { Message } from '~/types/messages'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMessagesStore = defineStore('messages', () => {
  const messages = ref<Message[]>([])

  function newMessage(text: string, role: 'user' | 'assistant' | 'system', parentMessageId: string | null = null) {
    const id = crypto.randomUUID()
    const message: Message = {
      id,
      content: text,
      role,
      parentMessageId,
    }

    messages.value.push(message)

    return message
  }

  function updateMessage(id: string, text: string) {
    const message = messages.value.find(message => message.id === id)
    if (!message) {
      return
    }
    message.content += text
  }

  return {
    messages,

    newMessage,
    updateMessage,
  }
}, {
  persist: true,
})
