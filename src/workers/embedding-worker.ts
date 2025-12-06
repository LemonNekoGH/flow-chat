import type { FeatureExtractionPipeline, ProgressInfo } from '@huggingface/transformers'
import type { EmbeddingParams } from '~/types/embedding'
import { pipeline } from '@huggingface/transformers'
import { defineInvokeHandler } from '@moeru/eventa'
import { createContext } from '@moeru/eventa/adapters/webworkers/worker'
import { embeddingExtractInvoke, embeddingLoadModelInvoke, embeddingModelLoadingProgressEvent } from '~/events/embedding-worker'

// Load processor and model
const model_id = 'onnx-community/Qwen3-Embedding-0.6B-ONNX'

const { context } = createContext()

let extractor: FeatureExtractionPipeline | null

export async function loadModel() {
  if (extractor) {
    return
  }

  const file_progress: Record<string, number> = {}
  let total_progress = 0

  const progressCallback: (p: ProgressInfo) => void = (p) => {
    if (p.status !== 'progress') {
      return
    }
    file_progress[p.name] = p.progress
    const progress = Object.values(file_progress).reduce((acc, curr) => acc + curr, 0) / Object.values(file_progress).length
    if (progress > total_progress) {
      total_progress = progress
      context.emit(embeddingModelLoadingProgressEvent, total_progress)
    }
  }

  // @ts-expect-error - TS2590: Expression produces a union type that is too complex to represent.
  extractor = await pipeline('feature-extraction', model_id, {
    dtype: 'fp32',
    device: 'webgpu',
    progress_callback: progressCallback,
  })
}

export async function extract({ text, instruction }: EmbeddingParams) {
  if (!extractor) {
    throw new Error('Model not loaded')
  }

  const texts = (Array.isArray(text) ? text : [text]).map(t => `${instruction ? `${instruction}: ` : ''}${t}`)

  const output = await extractor(texts, {
    pooling: 'mean',
    normalize: true,
  })

  const length = text.length
  const result: number[][][] = []
  const outputList = output.tolist()

  for (let i = 0; i < length; i++) {
    result.push(outputList.slice(i * 1024, (i + 1) * 1024))
  }

  return result[0]
}

function withErrorCatch<T extends unknown[], R>(fn: (...args: T) => Promise<R>) {
  return async (...args: T) => {
    try {
      return await fn(...args)
    }
    catch (e) {
      console.error(e)
      throw e
    }
  }
}

defineInvokeHandler(context, embeddingLoadModelInvoke, withErrorCatch(loadModel))
defineInvokeHandler(context, embeddingExtractInvoke, withErrorCatch(extract))
