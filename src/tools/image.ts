import type { useMessagesStore } from '~/stores/messages'
import { generateImage } from '@xsai/generate-image'
import { tool } from '@xsai/tool'
import { z } from 'zod'
import { useToolCallModel } from '~/models/tool-calls'

interface CreateImageToolOptions {
  apiKey: string
  baseURL: string
  piniaStore: ReturnType<typeof useMessagesStore>
  messageId: string
}

export async function createImageTools(options: CreateImageToolOptions) {
  const toolCallModel = useToolCallModel()

  return [
    await tool({
      name: 'generate_image',
      description: 'Generate an image',
      parameters: z.object({
        prompt: z.string().describe('The prompt to generate an image from'),
      }),
      execute: async ({ prompt }) => {
        // 记录工具调用开始
        const toolCall = await toolCallModel.create({
          message_id: options.messageId,
          tool_name: 'generate_image',
          parameters: { prompt },
          position: null, // 位置将在追加内容时更新
        })

        try {
          const response = await generateImage({
            apiKey: options.apiKey,
            baseURL: options.baseURL,
            prompt,
            response_format: 'b64_json',
            model: 'dall-e-3',
          }) // TODO: catch error

          options.piniaStore.image = response.image.base64

          const result = 'Image generated successfully'

          // 更新工具调用结果
          await toolCallModel.updateResult(toolCall.id, result)

          // 插入工具调用标记到消息内容中
          const toolCallMarkdown = `\n\n:::tool-call ${toolCall.id}:::\n\n`
          await options.piniaStore.appendContent(options.messageId, toolCallMarkdown)

          return result
        }
        catch (error) {
          // 更新工具调用结果（错误信息）
          await toolCallModel.updateResult(toolCall.id, { error: String(error) })
          throw error
        }
      },
    }),
  ]
}
