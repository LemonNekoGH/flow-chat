import type { Message, MessageRole } from '~/types/messages'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { tutorialMessages } from '~/utils/tutorial'

export const useMessagesStore = defineStore('messages', () => {
  const messages = ref<Message[]>([])

  function restoreTutorial() {
    // remove existing tutorial messages
    deleteSubtree('tutorial-root')

    // create new tutorial messages
    messages.value.push(...tutorialMessages)
  }

  function newMessage(text: string, role: MessageRole, parentMessageId: string | null = null, model?: string, roomId?: string) {
    const id = crypto.randomUUID()
    const message: Message = {
      id,
      content: text,
      role,
      parentMessageId,
      timestamp: Date.now(),
      model,
      roomId: roomId ?? '',
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

  function deleteSubtree(id: string) {
    deleteMessages(getSubtreeById(id))
  }

  function getMessageById(id?: string | null) {
    return messages.value.find(message => message.id === id)
  }

  function getParentMessage(msg: Message) {
    return getMessageById(msg.parentMessageId)
  }

  function getChildMessagesById(id?: string | null) {
    return messages.value.filter(message => message.parentMessageId === id)
  }

  function getBranchById(id?: string | null) {
    const messages: Message[] = []
    const ids = new Set<string>()
    for (let message = getMessageById(id); message; message = getParentMessage(message)) {
      messages.push(message)
      ids.add(message.id)
    }
    return { messages: messages.reverse(), ids } as const
  }

  function getSubtreeById(id: string) {
    // use BFS to get all message IDs in the subtree
    //  1. to avoid DFS's recursion, which will be a little bit better for performance
    //  2. we can simply return the BFS queue, for free!
    const descendants = [id]
    for (let i = 0; i < descendants.length; i++) {
      for (const { id } of getChildMessagesById(descendants[i])) descendants.push(id)
    }
    return descendants
  }

  function getMessagesByRoomId(roomId?: string | null) {
    if (!roomId)
      return []
    return messages.value.filter(message => message.roomId === roomId)
  }

  return {
    messages,

    newMessage,
    updateMessage,
    deleteMessages,
    deleteSubtree,

    getMessageById,
    getParentMessage,
    getChildMessagesById,
    getBranchById,
    getSubtreeById,
    getMessagesByRoomId,

    restoreTutorial,
  }
}, {
  persist: true,
})
