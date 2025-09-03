export type MessageRole = 'user' | 'assistant' | 'system'

export interface BaseMessage {
  content: string
  role: MessageRole
}

export interface Message extends BaseMessage {
  id: string
  parent_id: string | null
  room_id: string | null
  provider: string // provider used to generate this message
  model: string // model used to generate this message
}
