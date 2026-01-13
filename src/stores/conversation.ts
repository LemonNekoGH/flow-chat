import type { CapabilitiesByModel, ModelIdsByProvider, ProviderNames } from '@moeru-ai/jem'
import type { BaseMessage } from '~/types/messages'
import { hasCapabilities } from '@moeru-ai/jem'
import { defineStore, storeToRefs } from 'pinia'
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { generateText, streamText } from 'xsai'
import { createImageTools, createMemoryTools } from '~/tools'
import { parseMessage } from '~/utils/chat'
import { asyncIteratorFromReadableStream } from '~/utils/interator'
import { SUMMARY_PROMPT, TOPIC_TITLE_PROMPT, useSystemPrompt } from '~/utils/prompts/prompts'
import { useMessagesStore } from './messages'
import { useRoomsStore } from './rooms'
import { useSettingsStore } from './settings'

export const useConversationStore = defineStore('conversation', () => {
  const settingsStore = useSettingsStore()
  const { defaultTextModel, currentProvider } = storeToRefs(settingsStore)

  const messagesStore = useMessagesStore()
  const roomsStore = useRoomsStore()

  const streamTextAbortControllers = ref<Map<string, AbortController>>(new Map())
  const streamTextRunIds = ref<Map<string, number>>(new Map())
  const sendingRooms = ref<Set<string>>(new Set())

  const systemPrompt = useSystemPrompt()

  function nextStreamRunId(messageId: string) {
    const current = streamTextRunIds.value.get(messageId) ?? 0
    const next = current + 1
    streamTextRunIds.value.set(messageId, next)
    return next
  }

  function hasGeneratingAncestor(messageId: string) {
    let currentId = messagesStore.getMessageById(messageId)?.parent_id
    while (currentId) {
      if (messagesStore.isGenerating(currentId))
        return true

      currentId = messagesStore.getMessageById(currentId)?.parent_id
    }
    return false
  }

  function getRoomName(roomId: string) {
    return roomsStore.rooms.find(r => r.id === roomId)?.name ?? ''
  }

  function isDefaultRoomName(name: string) {
    const trimmed = name.trim()
    if (!trimmed)
      return true

    // Seed names / tutorial
    if (trimmed === 'Default Chat' || trimmed === 'Tutorial')
      return true

    // RoomSelector creates: `Chat ${format(new Date(), 'MMM d h:mm a', { locale: enUS })}`
    // Examples: "Chat Jan 6 3:21 PM", "Chat Dec 31 11:59 AM"
    return /^Chat [A-Za-z]{3} \d{1,2} \d{1,2}:\d{2} [AP]M$/.test(trimmed)
  }

  async function generateTopicTitleFromText(text: string) {
    const summaryProviderName = settingsStore.summaryTextModel.provider || defaultTextModel.value.provider
    const summaryProvider = settingsStore.configuredTextProviders.find(p => p.name === summaryProviderName)

    const defaultModel = defaultTextModel.value.model
    const summaryModelName = settingsStore.summaryTextModel.model
    const model = summaryModelName || defaultModel

    if (!model || !summaryProvider?.baseURL) {
      return ''
    }

    const { text: topicTitle } = await generateText({
      apiKey: summaryProvider.apiKey,
      baseURL: summaryProvider.baseURL,
      model,
      messages: [
        { role: 'user', content: `${TOPIC_TITLE_PROMPT}\n\n${text}` },
      ],
    })

    return topicTitle
  }

  async function updateRoomTitleToTopic(roomId: string, firstUserMessage: string, assistantMessageId: string, expectedCurrentRoomName: string) {
    if (getRoomName(roomId) !== expectedCurrentRoomName)
      return

    const assistant = messagesStore.getMessageById(assistantMessageId)
    const assistantContent = assistant?.content || ''
    if (!assistantContent.trim())
      return

    const context = `User:\n${firstUserMessage}\n\nAssistant:\n${assistantContent}`
    const title = await generateTopicTitleFromText(context)
    if (!title)
      return

    if (getRoomName(roomId) !== expectedCurrentRoomName)
      return

    await roomsStore.updateRoom(roomId, { name: title })
  }

  async function generateResponse(
    roomId: string,
    parentId: string | null,
    provider: ProviderNames,
    model: string,
    regenerateId?: string,
    options?: {
      onMessageCreated?: (messageId: string) => void
    },
  ): Promise<string | null> {
    if (!model) {
      toast.error('Please select a model')
      return null
    }

    if (!currentProvider.value?.baseURL) {
      toast.error('Please select a provider')
      return null
    }

    const systemPromptResult = await systemPrompt.buildSystemPrompt(roomId)

    let newMsgId: string
    if (regenerateId) {
      newMsgId = regenerateId
      await messagesStore.setContent(newMsgId, '')
    }
    else {
      const { id } = await messagesStore.newMessage('', 'assistant', parentId, provider, model, roomId, systemPromptResult.memoryIds)
      newMsgId = id
    }

    options?.onMessageCreated?.(newMsgId)

    messagesStore.startGenerating(newMsgId)
    const prevAbortController = streamTextAbortControllers.value.get(newMsgId)
    prevAbortController?.abort('Superseded by new generation')
    const runId = nextStreamRunId(newMsgId)
    const abortController = new AbortController()
    streamTextAbortControllers.value.set(newMsgId, abortController)

    try {
      const tools = {
        tools: [
          ...(await createImageTools({
            apiKey: settingsStore.imageGeneration.apiKey,
            baseURL: 'https://api.openai.com/v1',
            piniaStore: messagesStore,
            messageId: newMsgId,
          })),
          ...(await createMemoryTools({
            roomId,
            messageId: newMsgId,
            piniaStore: messagesStore,
          })),
        ],
      }

      const capabilities: Record<string, boolean> = hasCapabilities(
        provider as ProviderNames,
        model as ModelIdsByProvider<ProviderNames>,
        ['tool-call'] as CapabilitiesByModel<ProviderNames, ModelIdsByProvider<ProviderNames>>,
      )
      const isSupportTools = capabilities['tool-call']

      const branch = messagesStore.getBranchById(parentId)
      const conversationMessages = branch.messages
        .filter(msg => msg.role !== 'system')
        .map(({ content, role }): BaseMessage => ({ content, role }))

      const allMessages = [{
        content: systemPromptResult.prompt,
        role: 'system',
      } satisfies BaseMessage, ...conversationMessages]

      const { textStream } = await streamText({
        ...(isSupportTools ? tools : {}),
        maxSteps: 10,
        apiKey: currentProvider.value?.apiKey,
        baseURL: currentProvider.value?.baseURL,
        model,
        messages: allMessages as any, // FIXME: migrate to enum later
        abortSignal: abortController.signal,
      })

      const { useToolCallModel } = await import('~/models/tool-calls')
      const toolCallModel = useToolCallModel()
      let lastCheckedToolCallId: string | null = null

      for await (const textPart of asyncIteratorFromReadableStream(textStream, async v => v)) {
        if (streamTextRunIds.value.get(newMsgId) !== runId || abortController.signal.aborted)
          break

        const toolCalls = await toolCallModel.getByMessageId(newMsgId)
        const imageToolCall = toolCalls.find(tc => tc.tool_name === 'generate_image' && tc.id !== lastCheckedToolCallId && tc.result)

        if (imageToolCall) {
          const result = imageToolCall.result as { imageBase64?: string } | null
          if (result?.imageBase64) {
            await messagesStore.appendContent(newMsgId, `![generated image](data:image/png;base64,${result.imageBase64})`)
            lastCheckedToolCallId = imageToolCall.id
          }
        }

        if (textPart) {
          await messagesStore.appendContent(newMsgId, textPart)
        }
      }

      return newMsgId
    }
    finally {
      if (streamTextRunIds.value.get(newMsgId) === runId) {
        messagesStore.stopGenerating(newMsgId)
        streamTextAbortControllers.value.delete(newMsgId)
        streamTextRunIds.value.delete(newMsgId)
        await messagesStore.retrieveMessages()
        if (abortController.signal.reason === 'Aborted by user')
          toast.success('Generation aborted')
      }
    }
  }

  async function summarize(messageId: string) {
    const message = messagesStore.getMessageById(messageId)
    if (!message)
      return

    if (hasGeneratingAncestor(messageId)) {
      toast.warning('Please wait for the previous generation to finish')
      return
    }

    await messagesStore.updateSummary(messageId, '')
    await messagesStore.retrieveMessages()

    const summaryProviderName = settingsStore.summaryTextModel.provider || defaultTextModel.value.provider
    const summaryProvider = settingsStore.configuredTextProviders.find(p => p.name === summaryProviderName)

    const defaultModel = defaultTextModel.value.model
    const summaryModelName = settingsStore.summaryTextModel.model
    const model = summaryModelName || defaultModel

    if (!model) {
      toast.error('Please select a model')
      return
    }

    if (!summaryProvider?.baseURL) {
      toast.error('Please select a provider for summarization')
      return
    }

    messagesStore.startGenerating(messageId)

    const prevAbortController = streamTextAbortControllers.value.get(messageId)
    prevAbortController?.abort('Superseded by new summarization')
    const runId = nextStreamRunId(messageId)
    const abortController = new AbortController()
    streamTextAbortControllers.value.set(messageId, abortController)

    try {
      const { textStream } = await streamText({
        apiKey: summaryProvider.apiKey,
        baseURL: summaryProvider.baseURL,
        model,
        messages: [
          { role: 'user', content: `${SUMMARY_PROMPT}\n\n${message.content}` },
        ],
        abortSignal: abortController.signal,
      })

      for await (const textPart of asyncIteratorFromReadableStream(textStream, async v => v)) {
        if (streamTextRunIds.value.get(messageId) !== runId || abortController.signal.aborted)
          break
        if (textPart) {
          await messagesStore.appendSummary(messageId, textPart)
        }
      }
    }
    catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      console.error('Summarization failed', error)
      toast.error('Summarization failed')
    }
    finally {
      if (streamTextRunIds.value.get(messageId) === runId) {
        streamTextAbortControllers.value.delete(messageId)
        streamTextRunIds.value.delete(messageId)
        messagesStore.stopGenerating(messageId)
        await messagesStore.retrieveMessages()
        if (abortController.signal.reason === 'Aborted by user')
          toast.success('Summarization aborted')
      }
    }
  }

  function abort(messageId: string) {
    const abortController = streamTextAbortControllers.value.get(messageId)
    abortController?.abort('Aborted by user')
    messagesStore.stopGenerating(messageId)
  }

  async function regenerate(messageId: string) {
    const message = messagesStore.getMessageById(messageId)
    if (!message)
      return

    if (hasGeneratingAncestor(messageId)) {
      toast.warning('Please wait for the previous generation to finish')
      return
    }

    if (message.show_summary ?? false) {
      await summarize(messageId)
      return
    }

    if (!message.room_id)
      return

    await generateResponse(message.room_id, message.parent_id, message.provider as ProviderNames, message.model, messageId)
  }

  async function sendMessage(
    roomId: string,
    messageText: string,
    parentId: string | null,
    options?: {
      onUserMessageCreated?: (messageId: string) => void
      onAssistantMessageCreated?: (messageId: string) => void
    },
  ) {
    if (!messageText || sendingRooms.value.has(roomId)) {
      return
    }

    if (parentId && streamTextAbortControllers.value.has(parentId))
      return

    sendingRooms.value.add(roomId)

    const { model, message } = parseMessage(messageText)

    try {
      const isFirstUserMessageInRoom = messagesStore.messages.filter(m => m.role === 'user').length === 0
      const initialRoomName = getRoomName(roomId)
      const shouldAutoRename = isFirstUserMessageInRoom && isDefaultRoomName(initialRoomName)

      const { id } = await messagesStore.newMessage(
        message,
        'user',
        parentId,
        defaultTextModel.value.provider,
        model ?? defaultTextModel.value.model,
        roomId,
      )
      await messagesStore.retrieveMessages()

      options?.onUserMessageCreated?.(id)

      sendingRooms.value.delete(roomId)

      let expectedRoomNameForTopic = initialRoomName
      if (shouldAutoRename) {
        if (getRoomName(roomId) === initialRoomName) {
          await roomsStore.updateRoom(roomId, { name: message })
          expectedRoomNameForTopic = message
        }
      }

      const assistantMessageId = await generateResponse(
        roomId,
        id,
        defaultTextModel.value.provider as ProviderNames,
        model ?? defaultTextModel.value.model,
        undefined,
        {
          onMessageCreated: options?.onAssistantMessageCreated,
        },
      )

      if (shouldAutoRename && assistantMessageId) {
        updateRoomTitleToTopic(roomId, message, assistantMessageId, expectedRoomNameForTopic)
      }

      return {
        userMessageId: id,
        assistantMessageId,
        parsedModel: model,
      }
    }
    catch (error) {
      sendingRooms.value.delete(roomId)
      const err = error as Error
      if (err.name === 'AbortError') {
        return
      }
      if (err.message.includes('does not support tools')) {
        toast.error('This model does not support tools')
        return
      }
      console.error(error)
      toast.error('Failed to generate response')
    }
  }

  async function forkWith(
    roomId: string,
    parentId: string | null,
    provider: ProviderNames,
    model: string,
    options?: {
      onMessageCreated?: (messageId: string) => void
    },
  ) {
    return await generateResponse(roomId, parentId, provider, model, undefined, options)
  }

  function isSending(roomId: string) {
    return sendingRooms.value.has(roomId)
  }

  function isGeneratingMessage(messageId: string) {
    return streamTextAbortControllers.value.has(messageId)
  }

  return {
    sendingRooms,
    sendMessage,
    generateResponse,
    regenerate,
    summarize,
    abort,
    forkWith,
    isSending,
    isGeneratingMessage,
    hasGeneratingAncestor,
  }
})
