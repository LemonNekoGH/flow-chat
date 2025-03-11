import type { BaseMessage, Message, MessageRole } from '~/types/messages'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMessagesStore = defineStore('messages', () => {
  const messages = ref<Message[]>([])

  function newMessage(text: string, role: MessageRole, parentMessageId: string | null = null) {
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
    const message = getMessageById(id)
    if (!message) {
      return
    }
    message.content += text
  }

  function deleteMessages(ids: string[]) {
    if (!ids.length)
      return

    messages.value = messages.value.filter(message => !ids.includes(message.id))
  }

  function getMessageById(id?: string | null) {
    return messages.value.find(message => message.id === id)
  }

  function getParentMessage(msg: Message) {
    return getMessageById(msg.parentMessageId)
  }

  function getBranchById(id?: string | null) {
    const baseMessages: BaseMessage[] = []
    const ids = new Set<string>()
    for (let message = getMessageById(id); message; message = getParentMessage(message)) {
      const { id, content, role } = message
      baseMessages.push({ content, role })
      ids.add(id)
    }
    return { messages: baseMessages.reverse(), ids } as const
  }

  return {
    messages,

    newMessage,
    updateMessage,
    deleteMessages,

    getMessageById,
    getParentMessage,
    getBranchById,
  }
}, {
  persist: true,
})
