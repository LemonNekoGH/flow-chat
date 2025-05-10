import type { useMessagesStore } from '~/stores/messages'
import { generateImage } from '@xsai/generate-image'
import { tool } from '@xsai/tool'
import { z } from 'zod'

interface CreateImageToolOptions {
  apiKey: string
  baseURL: string
  piniaStore: ReturnType<typeof useMessagesStore>
}

export async function createImageTools(options: CreateImageToolOptions) {
  return Promise.all([
    tool({
      name: 'generate_image',
      description: 'Generate an image',
      parameters: z.object({
        prompt: z.string().describe('The prompt to generate an image from'),
      }),
      execute: async ({ prompt }) => {
        const response = await generateImage({
          apiKey: options.apiKey,
          baseURL: options.baseURL,
          prompt,
          response_format: 'b64_json',
          model: 'dall-e-3',
        }) // TODO: catch error

        options.piniaStore.image = response.image.base64

        return 'Image generated successfully'
      },
    }),
  ])
}
