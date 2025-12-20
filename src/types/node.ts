import type { Message } from './messages'

export interface NodeData {
  message: Message
  inactive: boolean
  hidden: boolean
  generating: boolean
  toolbarVisible?: boolean
}
