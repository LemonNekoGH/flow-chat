import type { useMessagesStore } from '~/stores/messages'
import { generateImage } from '@xsai/generate-image'
import { tool } from '@xsai/tool'
import { z } from 'zod'
import { withToolCallLog } from './with-tool-call-log'

interface CreateImageToolOptions {
  apiKey: string
  baseURL: string
  piniaStore: ReturnType<typeof useMessagesStore>
  messageId: string
}

export async function createImageTools(options: CreateImageToolOptions) {
  return [
    await tool({
      name: 'generate_image',
      description: 'Generate an image',
      parameters: z.object({
        prompt: z.string().describe('The prompt to generate an image from'),
      }),
      execute: async ({ prompt }) => {
        return withToolCallLog(
          {
            toolName: 'generate_image',
            messageId: options.messageId,
            parameters: { prompt },
          },
          async () => {
            try {
              const response = await generateImage({
                apiKey: options.apiKey,
                baseURL: options.baseURL,
                prompt,
                response_format: 'b64_json',
                model: 'dall-e-3',
              })

              return {
                message: 'Image generated successfully',
                imageBase64: response.image.base64,
              }
            }
            catch (error) {
              return {
                message: `Error generating image: ${error instanceof Error ? error.message : String(error)}`,
              }
            }
          },
        )
      },
    }),
  ]
}
