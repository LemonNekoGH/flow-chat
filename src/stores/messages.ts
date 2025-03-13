import type { Message, MessageRole } from '~/types/messages'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import prompt from '~/utils/prompt.md?raw'

export const useMessagesStore = defineStore('messages', () => {
  const messages = ref<Message[]>([])

  function restoreTutorial() {
    // remove exists tutorial messages
    deleteSubtree('tutorial-root')

    // create new tutorial messages
    messages.value.push(
      {
        id: 'tutorial-root',
        content: prompt,
        role: 'system',
        parentMessageId: null,
        timestamp: Date.now(),
      },
      {
        id: 'tutorial-1',
        content: 'Hello, how do I use this app?',
        role: 'user',
        parentMessageId: 'tutorial-root',
        timestamp: Date.now(),
      },
      {
        id: 'tutorial-2',
        content: 'This app is a chat ui that uses a flowchart to represent the conversation, users don\'t need to delete messages then regenerate another response, they can just create a new branch.',
        role: 'assistant',
        parentMessageId: 'tutorial-1',
        timestamp: Date.now(),
      },
      {
        id: 'tutorial-2-1',
        content: 'How do I create a new branch?',
        role: 'user',
        parentMessageId: 'tutorial-2',
        timestamp: Date.now(),
      },
      {
        id: 'tutorial-2-1-1',
        content: 'Click this message, then input text and press "Enter"',
        role: 'assistant',
        parentMessageId: 'tutorial-2-1',
        timestamp: Date.now(),
      },
      {
        id: 'tutorial-2-1-2',
        content: 'Right-click on previous message and select "Generate Another Response"',
        role: 'assistant',
        parentMessageId: 'tutorial-2-1',
        timestamp: Date.now(),
      },
      {
        id: 'tutorial-2-2',
        content: 'How do I focus on a branch?',
        role: 'user',
        parentMessageId: 'tutorial-2',
        timestamp: Date.now(),
      },
      {
        id: 'tutorial-2-2-1',
        content: 'Right-click on a message and select "Focus In"',
        role: 'assistant',
        parentMessageId: 'tutorial-2-2',
        timestamp: Date.now(),
      },
      {
        id: 'tutorial-2-2-2',
        content: 'How do I exit Focus Mode?',
        role: 'user',
        parentMessageId: 'tutorial-2-2-1',
        timestamp: Date.now(),
      },
      {
        id: 'tutorial-2-2-3',
        content: 'Click the "Jump Out" button in the top-right corner or use the right-click menu',
        role: 'assistant',
        parentMessageId: 'tutorial-2-2-2',
        timestamp: Date.now(),
      },
      {
        id: 'tutorial-2-3',
        content: 'How do I delete a message?',
        role: 'user',
        parentMessageId: 'tutorial-2',
        timestamp: Date.now(),
      },
      {
        id: 'tutorial-2-3-1',
        content: 'Right-click on the message and select "Delete", or press "Delete" on your keyboard, all messages under this message will be deleted',
        role: 'assistant',
        parentMessageId: 'tutorial-2-3',
        timestamp: Date.now(),
      },
      {
        id: 'tutorial-2-4',
        content: 'How do I create a new session?',
        role: 'user',
        parentMessageId: 'tutorial-2',
        timestamp: Date.now(),
      },
      {
        id: 'tutorial-2-4-1',
        content: 'Click to blank area to cancel selection, then input text and press "Enter", a new session will be created',
        role: 'assistant',
        parentMessageId: 'tutorial-2-4',
        timestamp: Date.now(),
      },
      {
        id: 'tutorial-2-5',
        content: 'Where is the source code?',
        role: 'user',
        parentMessageId: 'tutorial-2',
        timestamp: Date.now(),
      },
      {
        id: 'tutorial-2-5-1',
        content: 'The source code is available on [GitHub](https://github.com/LemonNekoGH/flow-chat)',
        role: 'assistant',
        parentMessageId: 'tutorial-2-5',
        timestamp: Date.now(),
      },
      {
        id: 'tutorial-2-6',
        content: 'How do I restore this tutorial?',
        role: 'user',
        parentMessageId: 'tutorial-2',
        timestamp: Date.now(),
      },
      {
        id: 'tutorial-2-6-1',
        content: 'Click the "Restore Tutorial" button in the settings dialog',
        role: 'assistant',
        parentMessageId: 'tutorial-2-6',
        timestamp: Date.now(),
      },
    )
  }

  function newMessage(text: string, role: MessageRole, parentMessageId: string | null = null) {
    const id = crypto.randomUUID()
    const message: Message = {
      id,
      content: text,
      role,
      parentMessageId,
      timestamp: Date.now(),
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

    restoreTutorial,
  }
}, {
  persist: true,
})
