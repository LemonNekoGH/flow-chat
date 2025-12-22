export type MemoryScope = 'global' | 'room'

export interface Memory {
  id: string
  content: string
  scope: MemoryScope
  room_id: string | null
  tags: string[]
  created_at: Date
  updated_at: Date
}
