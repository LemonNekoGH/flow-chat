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
  provider: string // provider used to generate this message
  model: string // model used to generate this message
  generating: boolean
}
