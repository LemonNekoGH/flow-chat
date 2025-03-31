import type { Message, MessageRole } from '~/types/messages'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
// import prompt from '~/utils/prompt.md?raw'
import { useRoomsStore } from './rooms'

export const useMessagesStore = defineStore('messages', () => {
  const messages = ref<Message[]>([])
  const roomsStore = useRoomsStore()

  const currentRoomMessages = computed(() => {
    return messages.value.filter(message => message.roomId === roomsStore.activeRoomId)
  })

  function newMessage(text: string, role: MessageRole, parentMessageId: string | null = null, model?: string) {
    const roomId = roomsStore.activeRoomId || roomsStore.initializeDefaultRoom()?.id

    if (!roomId) {
      throw new Error('No active room found')
    }

    const id = crypto.randomUUID()
    const message: Message = {
      id,
      content: text,
      role,
      parentMessageId,
      timestamp: Date.now(),
      roomId,
      model,
    }

    messages.value.push(message)
    roomsStore.updateRoomLastActivity(roomId)

    return message
  }

  // function restoreTutorial() {
  //   // remove existing tutorial messages
  //   deleteSubtree('tutorial-root')

  //   // create new tutorial messages
  //   messages.value.push(
  //     {
  //       id: 'tutorial-root',
  //       content: prompt,
  //       role: 'system',
  //       parentMessageId: null,
  //       timestamp: Date.now(),
  //     },
  //     {
  //       id: 'tutorial-1',
  //       content: 'Hello, how do I use this app?',
  //       role: 'user',
  //       parentMessageId: 'tutorial-root',
  //       timestamp: Date.now(),
  //       model: 'openai/chatgpt-4o-latest',
  //     },
  //     {
  //       id: 'tutorial-2',
  //       content: 'This App is a chat UI that uses a flow-chart to represent the conversation. Users don\'t need to delete messages and regenerate responses, instead, just create a new branch!',
  //       role: 'assistant',
  //       parentMessageId: 'tutorial-1',
  //       timestamp: Date.now(),
  //       model: 'openai/chatgpt-4o-latest',
  //     },
  //     {
  //       id: 'tutorial-2-1',
  //       content: 'How do I create a new branch?',
  //       role: 'user',
  //       parentMessageId: 'tutorial-2',
  //       timestamp: Date.now(),
  //       model: 'openai/chatgpt-4o-latest',
  //     },
  //     {
  //       id: 'tutorial-2-1-1',
  //       content: 'Click this message, then input text and press "Enter"',
  //       role: 'assistant',
  //       parentMessageId: 'tutorial-2-1',
  //       timestamp: Date.now(),
  //       model: 'openai/chatgpt-4o-latest',
  //     },
  //     {
  //       id: 'tutorial-2-1-2',
  //       content: 'Right-click on previous message and select "Fork"',
  //       role: 'assistant',
  //       parentMessageId: 'tutorial-2-1',
  //       timestamp: Date.now(),
  //       model: 'openai/chatgpt-4o-latest',
  //     },
  //     {
  //       id: 'tutorial-2-2',
  //       content: 'How do I focus on a branch?',
  //       role: 'user',
  //       parentMessageId: 'tutorial-2',
  //       timestamp: Date.now(),
  //       model: 'openai/chatgpt-4o-latest',
  //     },
  //     {
  //       id: 'tutorial-2-2-1',
  //       content: 'Right-click on a message and select "Focus In"',
  //       role: 'assistant',
  //       parentMessageId: 'tutorial-2-2',
  //       timestamp: Date.now(),
  //       model: 'openai/chatgpt-4o-latest',
  //     },
  //     {
  //       id: 'tutorial-2-2-2',
  //       content: 'How do I exit Focus Mode?',
  //       role: 'user',
  //       parentMessageId: 'tutorial-2-2-1',
  //       timestamp: Date.now(),
  //       model: 'openai/chatgpt-4o-latest',
  //     },
  //     {
  //       id: 'tutorial-2-2-3',
  //       content: 'Click the "Jump Out" button in the top-right corner',
  //       role: 'assistant',
  //       parentMessageId: 'tutorial-2-2-2',
  //       timestamp: Date.now(),
  //       model: 'openai/chatgpt-4o-latest',
  //     },
  //     {
  //       id: 'tutorial-2-3',
  //       content: 'How do I delete a message?',
  //       role: 'user',
  //       parentMessageId: 'tutorial-2',
  //       timestamp: Date.now(),
  //       model: 'openai/chatgpt-4o-latest',
  //     },
  //     {
  //       id: 'tutorial-2-3-1',
  //       content: 'Right-click on the message and select "Delete"',
  //       role: 'assistant',
  //       parentMessageId: 'tutorial-2-3',
  //       timestamp: Date.now(),
  //       model: 'openai/chatgpt-4o-latest',
  //     },
  //     {
  //       id: 'tutorial-2-3-2',
  //       content: 'Press "Delete" on your keyboard, all messages under this message will be deleted',
  //       role: 'assistant',
  //       parentMessageId: 'tutorial-2-3',
  //       timestamp: Date.now(),
  //       model: 'openai/chatgpt-4o-latest',
  //     },
  //     {
  //       id: 'tutorial-2-4',
  //       content: 'How do I create a new session?',
  //       role: 'user',
  //       parentMessageId: 'tutorial-2',
  //       timestamp: Date.now(),
  //       model: 'openai/chatgpt-4o-latest',
  //     },
  //     {
  //       id: 'tutorial-2-4-1',
  //       content: 'Click to blank area to cancel selection, then input text and press "Enter", a new session will be created',
  //       role: 'assistant',
  //       parentMessageId: 'tutorial-2-4',
  //       timestamp: Date.now(),
  //       model: 'openai/chatgpt-4o-latest',
  //     },
  //     {
  //       id: 'tutorial-2-5',
  //       content: 'How do I change the model for next messages?',
  //       role: 'user',
  //       parentMessageId: 'tutorial-2',
  //       timestamp: Date.now(),
  //       model: 'openai/chatgpt-4o-latest',
  //     },
  //     {
  //       id: 'tutorial-2-5-1',
  //       content: 'input `model=openai/gpt-3.5-turbo` in the input box, then press "Enter"',
  //       role: 'assistant',
  //       parentMessageId: 'tutorial-2-5',
  //       timestamp: Date.now(),
  //     },
  //     {
  //       id: 'tutorial-2-5-2',
  //       content: 'Repeat it',
  //       role: 'user',
  //       parentMessageId: 'tutorial-2-5-1',
  //       timestamp: Date.now(),
  //       model: 'openai/gpt-3.5-turbo',
  //     },
  //     {
  //       id: 'tutorial-2-5-3',
  //       content: 'input `model=openai/gpt-4o-latest` in the input box, then press "Enter"',
  //       role: 'assistant',
  //       parentMessageId: 'tutorial-2-5-2',
  //       timestamp: Date.now(),
  //       model: 'openai/gpt-3.5-turbo',
  //     },
  //     {
  //       id: 'tutorial-2-6',
  //       content: 'I think this app is great! How can I support this project?',
  //       role: 'user',
  //       parentMessageId: 'tutorial-2',
  //       timestamp: Date.now(),
  //       model: 'openai/chatgpt-4o-latest',
  //     },
  //     {
  //       id: 'tutorial-2-6-1',
  //       content: 'Starring the repo on [GitHub](https://github.com/LemonNekoGH/flow-chat)',
  //       role: 'assistant',
  //       parentMessageId: 'tutorial-2-6',
  //       timestamp: Date.now(),
  //       model: 'openai/chatgpt-4o-latest',
  //     },
  //     {
  //       id: 'tutorial-2-7',
  //       content: 'How do I restore this tutorial?',
  //       role: 'user',
  //       parentMessageId: 'tutorial-2',
  //       timestamp: Date.now(),
  //       model: 'openai/chatgpt-4o-latest',
  //     },
  //     {
  //       id: 'tutorial-2-7-1',
  //       content: 'Click the "Restore Tutorial" button in the settings dialog',
  //       role: 'assistant',
  //       parentMessageId: 'tutorial-2-7',
  //       timestamp: Date.now(),
  //       model: 'openai/chatgpt-4o-latest',
  //     },
  //   )
  // }

  function updateMessage(id: string, text: string) {
    const message = getMessageById(id)
    if (!message) {
      return
    }
    message.content += text

    if (message.roomId) {
      roomsStore.updateRoomLastActivity(message.roomId)
    }
  }

  function deleteMessages(ids: string[]) {
    if (!ids.length)
      return

    messages.value = messages.value.filter(message => !ids.includes(message.id))
  }

  function deleteSubtree(id: string) {
    deleteMessages(getSubtreeById(id))
  }

  function deleteRoomMessages(roomId: string) {
    messages.value = messages.value.filter(message => message.roomId !== roomId)
  }

  function getMessageById(id?: string | null) {
    return messages.value.find(message => message.id === id)
  }

  function getParentMessage(msg: Message) {
    return getMessageById(msg.parentMessageId)
  }

  function getChildMessagesById(id?: string | null) {
    return currentRoomMessages.value.filter(message => message.parentMessageId === id)
  }

  function getBranchById(id?: string | null) {
    const roomMessages = currentRoomMessages.value
    const msgs: Message[] = []
    const ids = new Set<string>()

    let currentMessage = roomMessages.find(message => message.id === id)

    // If no message is found with the given id in the current room, start from null (root)
    if (!currentMessage && id !== null) {
      return getBranchById(null)
    }

    for (; currentMessage; currentMessage = roomMessages.find(message => message.id === currentMessage?.parentMessageId)) {
      msgs.push(currentMessage)
      ids.add(currentMessage.id)
    }

    // Add system prompt if it exists for the current room
    const activeRoom = roomsStore.getRoomById(roomsStore.activeRoomId)
    if (activeRoom?.systemPrompt) {
      const systemMessage: Message = {
        id: `system-${activeRoom.id}`,
        content: activeRoom.systemPrompt,
        role: 'system',
        parentMessageId: null,
        timestamp: 0,
        roomId: activeRoom.id,
      }
      msgs.push(systemMessage)
    }

    return { messages: msgs.reverse(), ids } as const
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

  function initializeRoomWithSystemPrompt(roomId: string) {
    const room = roomsStore.getRoomById(roomId)
    if (!room || !room.systemPrompt)
      return

    // Don't add if there's already messages in this room
    if (messages.value.some(msg => msg.roomId === roomId))
      return

    // Add system prompt message
    const message: Message = {
      id: crypto.randomUUID(),
      content: room.systemPrompt,
      role: 'system',
      parentMessageId: null,
      timestamp: Date.now(),
      roomId,
    }

    messages.value.push(message)
  }

  return {
    messages,
    currentRoomMessages,

    newMessage,
    updateMessage,
    deleteMessages,
    deleteSubtree,
    deleteRoomMessages,
    initializeRoomWithSystemPrompt,

    getMessageById,
    getParentMessage,
    getChildMessagesById,
    getBranchById,
    getSubtreeById,

    // restoreTutorial,
  }
}, {
  persist: true,
})
