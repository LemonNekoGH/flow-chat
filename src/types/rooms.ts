export interface Room {
  id: string
  name: string
  template_id: string | null
  default_model: string | null
  created_at: Date
  updated_at: Date
}
