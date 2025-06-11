export type MessageRole = 'user' | 'assistant' | 'system'

export interface BaseMessage {
  content: string
  role: MessageRole
}

export interface Message extends BaseMessage {
  id: string
  parentMessageId: string | null
  timestamp: number
  roomId: string
  model?: string // model used to generate this message
  generating: boolean
}
