export interface Template {
  id: string
  name: string
  system_prompt: string
  developer_system_prompt: string | null
  use_memory: boolean
  created_at: Date
  updated_at: Date
}
