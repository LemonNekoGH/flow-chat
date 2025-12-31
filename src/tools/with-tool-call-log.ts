import type { useMessagesStore } from '~/stores/messages'
import { useToolCallModel } from '~/models/tool-calls'

interface WithToolCallLogOptions {
  toolName: string
  messageId: string
  piniaStore: ReturnType<typeof useMessagesStore>
  parameters: unknown
}

export async function withToolCallLog<T>(
  options: WithToolCallLogOptions,
  execute: () => Promise<T>,
): Promise<T> {
  const toolCallModel = useToolCallModel()

  const toolCall = await toolCallModel.create({
    message_id: options.messageId,
    tool_name: options.toolName,
    parameters: options.parameters,
    position: undefined,
  })

  try {
    const result = await execute()

    await toolCallModel.updateResult(toolCall.id, result)

    const toolCallMarkdown = `\n\n:::tool-call ${toolCall.id}:::\n\n`
    await options.piniaStore.appendContent(options.messageId, toolCallMarkdown)

    return result
  }
  catch (error) {
    await toolCallModel.updateResult(toolCall.id, { error: String(error) })
    throw error
  }
}
