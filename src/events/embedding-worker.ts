import type { EmbeddingParams } from '~/types/embedding'
import { defineEventa, defineInvokeEventa } from '@moeru/eventa'

export const embeddingLoadModelInvoke = defineInvokeEventa('embedding:eventa:invoke:load-model')
export const embeddingExtractInvoke = defineInvokeEventa<Promise<number[][]>, EmbeddingParams>('embedding:eventa:invoke:extract')

export const embeddingModelLoadingProgressEvent = defineEventa<number>('embedding:eventa:event:model-load-progress')
