import type { CommonContentPart, TextContentPart } from 'xsai'

export type Attachment = Exclude<CommonContentPart, TextContentPart> & { id: string, fileName: string }
