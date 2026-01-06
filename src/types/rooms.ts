export interface Room {
  id: string
  name: string
  name_manually_set: boolean
  template_id: string | null
  default_model: string | null
  focus_node_id: string | null
  viewport_x: number | null
  viewport_y: number | null
  viewport_zoom: number | null
  created_at: Date
  updated_at: Date
}
