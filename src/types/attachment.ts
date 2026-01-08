export type AttachmentType = 'image' | 'file'

export interface Attachment {
  id: string
  type: AttachmentType
  name: string
  mimeType: string
  // Base64 encoded data URL
  data: string
  // Optional dimensions for images
  width?: number
  height?: number
}

export interface AttachmentPreview extends Attachment {
  // For UI display before sending
  isUploading?: boolean
}
