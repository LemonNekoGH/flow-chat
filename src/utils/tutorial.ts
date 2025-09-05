import type { Message } from '~/types/messages'
import prompt from './prompt.md?raw'

// Define tutorial message tree structure
export interface TutorialMessage extends Message {
  id: string
  content: string
  role: 'system' | 'user' | 'assistant'
  timestamp: number
}

// Tutorial room configuration
export const TUTORIAL_ROOM_ID = 'tutorial'
const DEFAULT_MODEL = 'chatgpt-4o'
const DEFAULT_PROVIDER = 'openai'

// Helper functions to create tutorial messages
function createMessage(
  id: string,
  content: string,
  role: 'system' | 'user' | 'assistant',
  parentMessageId: string | null,
  model: string,
  provider: string,
): TutorialMessage {
  return {
    id,
    content,
    role,
    parent_id: parentMessageId,
    timestamp: Date.now(),
    room_id: TUTORIAL_ROOM_ID,
    model,
    provider,
  }
}

function createUserMessage(id: string, content: string, parentId: string): TutorialMessage {
  return createMessage(id, content, 'user', parentId, DEFAULT_MODEL, DEFAULT_PROVIDER)
}

function createAssistantMessage(id: string, content: string, parentId: string): TutorialMessage {
  return createMessage(id, content, 'assistant', parentId, DEFAULT_MODEL, DEFAULT_PROVIDER)
}

// Tutorial message tree data
export const tutorialMessages: TutorialMessage[] = [
  createMessage('tutorial-root', prompt, 'system', null, DEFAULT_MODEL, DEFAULT_PROVIDER),
  createUserMessage('tutorial-1', 'Hello, how do I use this app?', 'tutorial-root'),
  createAssistantMessage(
    'tutorial-2',
    'This App is a chat UI that uses a flow-chart to represent the conversation. Users don\'t need to delete messages and regenerate responses, instead, just create a new branch!',
    'tutorial-1',
  ),
  createUserMessage('tutorial-2-1', 'How do I create a new branch?', 'tutorial-2'),
  createAssistantMessage('tutorial-2-1-1', 'Click this message, then input text and press "Enter"', 'tutorial-2-1'),
  createAssistantMessage('tutorial-2-1-2', 'Right-click on previous message and select "Fork"', 'tutorial-2-1'),
  createUserMessage('tutorial-2-2', 'How do I focus on a branch?', 'tutorial-2'),
  createAssistantMessage('tutorial-2-2-1', 'Right-click on a message and select "Focus In"', 'tutorial-2-2'),
  createUserMessage('tutorial-2-2-2', 'How do I exit Focus Mode?', 'tutorial-2-2-1'),
  createAssistantMessage('tutorial-2-2-3', 'Click the "Jump Out" button in the top-right corner', 'tutorial-2-2-2'),
  createUserMessage('tutorial-2-3', 'How do I delete a message?', 'tutorial-2'),
  createAssistantMessage('tutorial-2-3-1', 'Right-click on the message and select "Delete"', 'tutorial-2-3'),
  createAssistantMessage('tutorial-2-3-2', 'Press "Delete" on your keyboard, all messages under this message will be deleted', 'tutorial-2-3'),
  createUserMessage('tutorial-2-4', 'How do I create a new session?', 'tutorial-2'),
  createAssistantMessage('tutorial-2-4-1', 'Click to blank area to cancel selection, then input text and press "Enter", a new session will be created', 'tutorial-2-4'),
  createUserMessage('tutorial-2-5', 'How do I change the model for next messages?', 'tutorial-2'),
  createAssistantMessage('tutorial-2-5-1', 'input `model=openai/gpt-3.5-turbo` in the input box, then press "Enter"', 'tutorial-2-5'),
  createMessage('tutorial-2-5-2', 'Repeat it', 'user', 'tutorial-2-5-1', 'openai/gpt-3.5-turbo', DEFAULT_PROVIDER),
  createMessage('tutorial-2-5-3', 'input `model=openai/gpt-4o-latest` in the input box, then press "Enter"', 'assistant', 'tutorial-2-5-2', 'openai/gpt-3.5-turbo', DEFAULT_PROVIDER),
  createUserMessage('tutorial-2-6', 'I think this app is great! How can I support this project?', 'tutorial-2'),
  createAssistantMessage('tutorial-2-6-1', 'Starring the repo on [GitHub](https://github.com/LemonNekoGH/flow-chat)', 'tutorial-2-6'),
  createUserMessage('tutorial-2-7', 'How do I restore this tutorial?', 'tutorial-2'),
  createAssistantMessage('tutorial-2-7-1', 'Click the "Restore Tutorial" button in the settings dialog', 'tutorial-2-7'),
]

// Tutorial room interface
export interface TutorialRoom {
  id: string
  name: string
  systemPromptId: string
  messages: TutorialMessage[]
}

// Get tutorial room ID
export const getTutorialRoomId = (): string => TUTORIAL_ROOM_ID

// Create tutorial room with consistent message configuration
export function createTutorialRoom(): TutorialRoom {
  return {
    id: TUTORIAL_ROOM_ID,
    name: 'Tutorial',
    systemPromptId: 'tutorial-root',
    messages: tutorialMessages,
  }
}
