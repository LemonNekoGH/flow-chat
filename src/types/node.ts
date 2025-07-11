import type { Message } from './messages'

export interface NodeData {
  message: Message
  selected: boolean
  inactive: boolean
  hidden: boolean
  generating: boolean
}
