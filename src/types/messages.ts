import type { CommonContentPart } from 'xsai'

export type MessageRole = 'user' | 'assistant' | 'system'

export interface BaseMessage {
  content: CommonContentPart[]
  role: string // FIXME: use enum in pglite
}

export interface Message extends BaseMessage {
  id: string
  parent_id: string | null
  room_id: string | null
  provider: string // provider used to generate this message
  model: string // model used to generate this message
  summary: string | null
  show_summary?: boolean
  memory?: string[]
}

export interface ExportedMessage {
  id: string
  parent_id: string | null
  role: MessageRole
  provider: string
  model: string
  summary: string | null
  show_summary: boolean
  memory: string[]
  content: CommonContentPart[]
}

export interface ExportedRoomMessages {
  version: 1
  exported_at: string
  room: {
    id: string
    name: string
  }
  messages: ExportedMessage[]
}
