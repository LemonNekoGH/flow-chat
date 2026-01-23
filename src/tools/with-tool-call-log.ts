import { useToolCallModel } from '~/models/tool-calls'
import { useConversationStore } from '~/stores/conversation'
import { useMessagesStore } from '~/stores/messages'

interface WithToolCallLogOptions {
  toolName: string
  messageId: string
  parameters: unknown
}

export async function withToolCallLog<T>(
  options: WithToolCallLogOptions,
  execute: () => Promise<T>,
): Promise<T> {
  const toolCallModel = useToolCallModel()
  const messagesStore = useMessagesStore()
  const conversationStore = useConversationStore()

  const toolCall = await toolCallModel.create({ // FIXME: use transaction to ensure consistency
    message_id: options.messageId,
    tool_name: options.toolName,
    parameters: options.parameters,
    position: undefined,
  })

  try {
    const result = await execute()
    conversationStore.checkAndFlushTokensBuffer(options.messageId, true) // force flush tokens buffer when receive any tool calls

    await toolCallModel.updateResult(toolCall.id, result)

    const toolCallMarkdown = `\n\n:::tool-call ${toolCall.id}:::\n\n`
    await messagesStore.appendContent(options.messageId, toolCallMarkdown)

    return result
  }
  catch (error) {
    await toolCallModel.updateResult(toolCall.id, { error: String(error) })
    throw error
  }
}
