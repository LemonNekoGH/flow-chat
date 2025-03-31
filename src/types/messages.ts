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
}

export interface Room {
  id: string
  name: string
  systemPrompt: string
  agentId?: string
  timestamp: number
  lastMessageTimestamp?: number
}

export interface Agent {
  id: string
  name: string
  systemPrompt: string
}
