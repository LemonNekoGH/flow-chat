export interface Message {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  parentMessageId: string | null
}

export interface MessageForAPI {
  content: string
  role: 'user' | 'assistant' | 'system'
}
