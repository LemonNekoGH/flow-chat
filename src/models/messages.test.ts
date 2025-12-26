import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useDatabaseStore } from '../stores/database'
import { useMessageModel } from './messages'
import { useRoomModel } from './rooms'

describe('message Model', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should create an embedding', async () => {
    const dbStore = useDatabaseStore()
    await dbStore.initialize(true)
    await dbStore.migrate()

    const roomModel = useRoomModel()
    const room = await roomModel.create('test')
    const messageModel = useMessageModel()
    const message = await messageModel.create({
      model: 'test',
      provider: 'test',
      parent_id: null,
      content: 'FlowChat is a chat UI in graph.',
      role: 'user',
      room_id: room.id,
      summary: null,
    })
    const embeddingContent = Array.from({ length: 1024 }, () => Math.round(Math.random() * 1000) / 1000)
    const embedding = await messageModel.updateEmbedding(message.id, embeddingContent)
    expect(embedding.affectedRows).toBe(1)
  })

  it('should return not embedded messages', async () => {
    const dbStore = useDatabaseStore()
    await dbStore.initialize(true)
    await dbStore.migrate()

    const roomModel = useRoomModel()
    const room = await roomModel.create('test')
    const messageModel = useMessageModel()
    const messageHasEmbedding = await messageModel.create({
      model: 'test',
      provider: 'test',
      parent_id: null,
      content: 'FlowChat is a chat UI in graph.',
      role: 'user',
      room_id: room.id,
      summary: null,
    })
    const messageWithoutEmbedding = await messageModel.create({
      model: 'test',
      provider: 'test',
      parent_id: null,
      content: 'AIRI is a AI companion.',
      role: 'user',
      room_id: room.id,
      summary: null,
    })

    await messageModel.updateEmbedding(
      messageHasEmbedding.id,
      Array.from({ length: 1024 }, () => Math.round(Math.random() * 1000) / 1000),
    )
    const notEmbeddedMessages = await messageModel.notEmbeddedMessages()
    expect(notEmbeddedMessages.length).toEqual(1)
    expect(notEmbeddedMessages[0].id).toEqual(messageWithoutEmbedding.id)
  })
})
