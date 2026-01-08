import type { CommonContentPart } from 'xsai'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useDatabaseStore } from '../stores/database'
import { combineMessagesAndParts, useMessageModel } from './messages'
import { useRoomModel } from './rooms'

describe('message Model', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('combineMessagesAndParts', () => {
    it('should combine messages and parts correctly', () => {
      const messagesAndParts = [
        {
          messages: {
            id: 'msg-1',
            model: 'test',
            provider: 'test',
            role: 'user',
            room_id: 'room-1',
            parent_id: null,
            embedding: null,
            summary: null,
            show_summary: false,
            memory: [],
            created_at: new Date(),
            updated_at: new Date(),
          },
          message_parts: {
            id: 'part-1',
            part_type: 'text' as const,
            message_id: 'msg-1',
            content: { type: 'text', text: 'Hello' } as CommonContentPart,
            order: 0,
            created_at: new Date(),
            updated_at: new Date(),
          },
        },
        {
          messages: {
            id: 'msg-1',
            model: 'test',
            provider: 'test',
            role: 'user',
            room_id: 'room-1',
            parent_id: null,
            embedding: null,
            summary: null,
            show_summary: false,
            memory: [],
            created_at: new Date(),
            updated_at: new Date(),
          },
          message_parts: {
            id: 'part-2',
            part_type: 'text' as const,
            message_id: 'msg-1',
            content: { type: 'text', text: 'World' } as CommonContentPart,
            order: 1,
            created_at: new Date(),
            updated_at: new Date(),
          },
        },
      ]

      const result = combineMessagesAndParts(messagesAndParts)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('msg-1')
      expect(result[0].content).toHaveLength(2)
      expect(result[0].content[0]).toEqual({ type: 'text', text: 'Hello' })
      expect(result[0].content[1]).toEqual({ type: 'text', text: 'World' })
    })

    it('should handle messages without parts', () => {
      const messagesAndParts = [
        {
          messages: {
            id: 'msg-1',
            model: 'test',
            provider: 'test',
            role: 'user',
            room_id: 'room-1',
            parent_id: null,
            embedding: null,
            summary: null,
            show_summary: false,
            memory: [],
            created_at: new Date(),
            updated_at: new Date(),
          },
          message_parts: null,
        },
      ]

      const result = combineMessagesAndParts(messagesAndParts)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('msg-1')
      expect(result[0].content).toHaveLength(0)
    })
  })

  describe('the CRUD operations', () => {
    it('should create a message', async () => {
      const dbStore = useDatabaseStore()
      await dbStore.initialize(true)
      await dbStore.migrate()

      const roomModel = useRoomModel()
      const room = await roomModel.create('test')
      const messageModel = useMessageModel()

      const message = await messageModel.create({
        model: 'test-model',
        provider: 'test-provider',
        parent_id: null,
        content: [],
        role: 'user',
        room_id: room.id,
        summary: null,
        memory: [],
      })

      expect(message).toHaveLength(1)
      expect(message[0].model).toBe('test-model')
      expect(message[0].provider).toBe('test-provider')
      expect(message[0].role).toBe('user')
      expect(message[0].room_id).toBe(room.id)
    })

    it('should get all messages', async () => {
      const dbStore = useDatabaseStore()
      await dbStore.initialize(true)
      await dbStore.migrate()

      const roomModel = useRoomModel()
      const room = await roomModel.create('test')
      const messageModel = useMessageModel()

      await messageModel.create({
        model: 'test',
        provider: 'test',
        parent_id: null,
        content: [],
        role: 'user',
        room_id: room.id,
        summary: null,
        memory: [],
      })

      await messageModel.create({
        model: 'test',
        provider: 'test',
        parent_id: null,
        content: [],
        role: 'assistant',
        room_id: room.id,
        summary: null,
        memory: [],
      })

      const messages = await messageModel.getAll()
      expect(messages).toHaveLength(2)
    })

    it('should get messages by room id', async () => {
      const dbStore = useDatabaseStore()
      await dbStore.initialize(true)
      await dbStore.migrate()

      const roomModel = useRoomModel()
      const room1 = await roomModel.create('test1')
      const room2 = await roomModel.create('test2')
      const messageModel = useMessageModel()

      await messageModel.create({
        model: 'test',
        provider: 'test',
        parent_id: null,
        content: [],
        role: 'user',
        room_id: room1.id,
        summary: null,
        memory: [],
      })

      await messageModel.create({
        model: 'test',
        provider: 'test',
        parent_id: null,
        content: [],
        role: 'assistant',
        room_id: room2.id,
        summary: null,
        memory: [],
      })

      const room1Messages = await messageModel.getByRoomId(room1.id)
      expect(room1Messages).toHaveLength(1)
      expect(room1Messages[0].room_id).toBe(room1.id)

      const room2Messages = await messageModel.getByRoomId(room2.id)
      expect(room2Messages).toHaveLength(1)
      expect(room2Messages[0].room_id).toBe(room2.id)
    })

    it('should update a message', async () => {
      const dbStore = useDatabaseStore()
      await dbStore.initialize(true)
      await dbStore.migrate()

      const roomModel = useRoomModel()
      const room = await roomModel.create('test')
      const messageModel = useMessageModel()

      const [message] = await messageModel.create({
        model: 'test',
        provider: 'test',
        parent_id: null,
        content: [],
        role: 'user',
        room_id: room.id,
        summary: null,
        memory: [],
      })

      await messageModel.update(message.id, {
        ...message,
        model: 'updated-model',
        content: [],
      })

      const messages = await messageModel.getByRoomId(room.id)
      expect(messages[0].model).toBe('updated-model')
    })

    it('should delete messages by ids', async () => {
      const dbStore = useDatabaseStore()
      await dbStore.initialize(true)
      await dbStore.migrate()

      const roomModel = useRoomModel()
      const room = await roomModel.create('test')
      const messageModel = useMessageModel()

      const [message1] = await messageModel.create({
        model: 'test',
        provider: 'test',
        parent_id: null,
        content: [],
        role: 'user',
        room_id: room.id,
        summary: null,
        memory: [],
      })

      const [message2] = await messageModel.create({
        model: 'test',
        provider: 'test',
        parent_id: null,
        content: [],
        role: 'assistant',
        room_id: room.id,
        summary: null,
        memory: [],
      })

      await messageModel.deleteByIds([message1.id])

      const messages = await messageModel.getByRoomId(room.id)
      expect(messages).toHaveLength(1)
      expect(messages[0].id).toBe(message2.id)
    })
  })

  describe('content operations', () => {
    it('should append content to a message', async () => {
      const dbStore = useDatabaseStore()
      await dbStore.initialize(true)
      await dbStore.migrate()

      const roomModel = useRoomModel()
      const room = await roomModel.create('test')
      const messageModel = useMessageModel()

      const [message] = await messageModel.create({
        model: 'test',
        provider: 'test',
        parent_id: null,
        content: [],
        role: 'user',
        room_id: room.id,
        summary: null,
        memory: [],
      })

      const part: CommonContentPart = { type: 'text', text: 'Hello World' }
      await messageModel.appendContent(message.id, part)

      const messages = await messageModel.getByRoomId(room.id)
      expect(messages[0].content).toHaveLength(1)
      expect(messages[0].content[0]).toEqual(part)
    })

    it('should update content of a message', async () => {
      const dbStore = useDatabaseStore()
      await dbStore.initialize(true)
      await dbStore.migrate()

      const roomModel = useRoomModel()
      const room = await roomModel.create('test')
      const messageModel = useMessageModel()

      const [message] = await messageModel.create({
        model: 'test',
        provider: 'test',
        parent_id: null,
        content: [],
        role: 'user',
        room_id: room.id,
        summary: null,
        memory: [],
      })

      const part1: CommonContentPart = { type: 'text', text: 'Hello' }
      await messageModel.appendContent(message.id, part1)

      const newParts: CommonContentPart[] = [
        { type: 'text', text: 'Updated' },
        { type: 'text', text: 'Content' },
      ]
      await messageModel.updateContent(message.id, newParts)

      const messages = await messageModel.getByRoomId(room.id)
      expect(messages[0].content).toHaveLength(2)
      expect(messages[0].content[0]).toEqual(newParts[0])
      expect(messages[0].content[1]).toEqual(newParts[1])
    })

    it('should delete content of a message', async () => {
      const dbStore = useDatabaseStore()
      await dbStore.initialize(true)
      await dbStore.migrate()

      const roomModel = useRoomModel()
      const room = await roomModel.create('test')
      const messageModel = useMessageModel()

      const [message] = await messageModel.create({
        model: 'test',
        provider: 'test',
        parent_id: null,
        content: [],
        role: 'user',
        room_id: room.id,
        summary: null,
        memory: [],
      })

      const part: CommonContentPart = { type: 'text', text: 'Hello World' }
      await messageModel.appendContent(message.id, part)

      await messageModel.deleteContent(message.id)

      const messages = await messageModel.getByRoomId(room.id)
      expect(messages[0].content).toHaveLength(0)
    })
  })

  describe('summary operations', () => {
    it('should update summary', async () => {
      const dbStore = useDatabaseStore()
      await dbStore.initialize(true)
      await dbStore.migrate()

      const roomModel = useRoomModel()
      const room = await roomModel.create('test')
      const messageModel = useMessageModel()

      const [message] = await messageModel.create({
        model: 'test',
        provider: 'test',
        parent_id: null,
        content: [],
        role: 'user',
        room_id: room.id,
        summary: null,
        memory: [],
      })

      await messageModel.updateSummary(message.id, 'Test summary')

      const messages = await messageModel.getByRoomId(room.id)
      expect(messages[0].summary).toBe('Test summary')
    })

    it('should append summary', async () => {
      const dbStore = useDatabaseStore()
      await dbStore.initialize(true)
      await dbStore.migrate()

      const roomModel = useRoomModel()
      const room = await roomModel.create('test')
      const messageModel = useMessageModel()

      const [message] = await messageModel.create({
        model: 'test',
        provider: 'test',
        parent_id: null,
        content: [],
        role: 'user',
        room_id: room.id,
        summary: 'Initial',
        memory: [],
      })

      await messageModel.appendSummary(message.id, ' summary')

      const messages = await messageModel.getByRoomId(room.id)
      expect(messages[0].summary).toBe('Initial summary')
    })

    it('should update show_summary flag', async () => {
      const dbStore = useDatabaseStore()
      await dbStore.initialize(true)
      await dbStore.migrate()

      const roomModel = useRoomModel()
      const room = await roomModel.create('test')
      const messageModel = useMessageModel()

      const [message] = await messageModel.create({
        model: 'test',
        provider: 'test',
        parent_id: null,
        content: [],
        role: 'user',
        room_id: room.id,
        summary: null,
        memory: [],
      })

      await messageModel.updateShowSummary(message.id, true)

      const messages = await messageModel.getByRoomId(room.id)
      expect(messages[0].show_summary).toBe(true)
    })
  })

  describe('search operations', () => {
    it('should search messages by content', async () => {
      const dbStore = useDatabaseStore()
      await dbStore.initialize(true)
      await dbStore.migrate()

      const roomModel = useRoomModel()
      const room = await roomModel.create('test')
      const messageModel = useMessageModel()

      const [message1] = await messageModel.create({
        model: 'test',
        provider: 'test',
        parent_id: null,
        content: [],
        role: 'user',
        room_id: room.id,
        summary: null,
        memory: [],
      })

      const [message2] = await messageModel.create({
        model: 'test',
        provider: 'test',
        parent_id: null,
        content: [],
        role: 'assistant',
        room_id: room.id,
        summary: null,
        memory: [],
      })

      await messageModel.appendContent(message1.id, { type: 'text', text: 'FlowChat is awesome' })
      await messageModel.appendContent(message2.id, { type: 'text', text: 'AIRI is great' })

      const results = await messageModel.searchByContent('FlowChat')
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe(message1.id)
    })

    it('should search messages by content in specific room', async () => {
      const dbStore = useDatabaseStore()
      await dbStore.initialize(true)
      await dbStore.migrate()

      const roomModel = useRoomModel()
      const room1 = await roomModel.create('test1')
      const room2 = await roomModel.create('test2')
      const messageModel = useMessageModel()

      const [message1] = await messageModel.create({
        model: 'test',
        provider: 'test',
        parent_id: null,
        content: [],
        role: 'user',
        room_id: room1.id,
        summary: null,
        memory: [],
      })

      const [message2] = await messageModel.create({
        model: 'test',
        provider: 'test',
        parent_id: null,
        content: [],
        role: 'user',
        room_id: room2.id,
        summary: null,
        memory: [],
      })

      await messageModel.appendContent(message1.id, { type: 'text', text: 'Hello World' })
      await messageModel.appendContent(message2.id, { type: 'text', text: 'Hello World' })

      const results = await messageModel.searchByContent('Hello', room1.id)
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe(message1.id)
    })

    it('should return empty array when no matches found', async () => {
      const dbStore = useDatabaseStore()
      await dbStore.initialize(true)
      await dbStore.migrate()

      const messageModel = useMessageModel()

      const results = await messageModel.searchByContent('nonexistent')
      expect(results).toHaveLength(0)
    })
  })

  describe('embedding operations', () => {
    it('should create an embedding', async () => {
      const dbStore = useDatabaseStore()
      await dbStore.initialize(true)
      await dbStore.migrate()

      const roomModel = useRoomModel()
      const room = await roomModel.create('test')
      const messageModel = useMessageModel()
      const [message] = await messageModel.create({
        model: 'test',
        provider: 'test',
        parent_id: null,
        content: [],
        role: 'user',
        room_id: room.id,
        summary: null,
        memory: [],
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
      const [messageHasEmbedding] = await messageModel.create({
        model: 'test',
        provider: 'test',
        parent_id: null,
        content: [],
        role: 'user',
        room_id: room.id,
        summary: null,
        memory: [],
      })
      const [messageWithoutEmbedding] = await messageModel.create({
        model: 'test',
        provider: 'test',
        parent_id: null,
        content: [],
        role: 'user',
        room_id: room.id,
        summary: null,
        memory: [],
      })

      await messageModel.updateEmbedding(
        messageHasEmbedding.id,
        Array.from({ length: 1024 }, () => Math.round(Math.random() * 1000) / 1000),
      )
      const notEmbeddedMessages = await messageModel.notEmbeddedMessages()
      expect(notEmbeddedMessages.length).toEqual(1)
      expect(notEmbeddedMessages[0].id).toEqual(messageWithoutEmbedding.id)
    })

    it('should perform vector similarity search', async () => {
      const dbStore = useDatabaseStore()
      await dbStore.initialize(true)
      await dbStore.migrate()

      const roomModel = useRoomModel()
      const room = await roomModel.create('test')
      const messageModel = useMessageModel()

      const [message1] = await messageModel.create({
        model: 'test',
        provider: 'test',
        parent_id: null,
        content: [],
        role: 'user',
        room_id: room.id,
        summary: null,
        memory: [],
      })

      const [message2] = await messageModel.create({
        model: 'test',
        provider: 'test',
        parent_id: null,
        content: [],
        role: 'user',
        room_id: room.id,
        summary: null,
        memory: [],
      })

      const embedding1 = Array.from({ length: 1024 }, (_, i) => i % 2 === 0 ? 0.5 : 0.3)
      const embedding2 = Array.from({ length: 1024 }, (_, i) => i % 2 === 0 ? 0.1 : 0.9)

      await messageModel.updateEmbedding(message1.id, embedding1)
      await messageModel.updateEmbedding(message2.id, embedding2)

      const results = await messageModel.vectorSimilaritySearch(embedding1, 2)

      expect(results.length).toBeGreaterThan(0)
      expect(results[0]).toHaveProperty('similarity')
      expect(results[0].id).toBe(message1.id)
      expect(results[0].similarity).toBeGreaterThan(0.9)
    })

    it('should return empty array when no embeddings exist', async () => {
      const dbStore = useDatabaseStore()
      await dbStore.initialize(true)
      await dbStore.migrate()

      const messageModel = useMessageModel()
      const searchEmbedding = Array.from({ length: 1024 }, () => 0.5)

      const results = await messageModel.vectorSimilaritySearch(searchEmbedding, 10)
      expect(results).toHaveLength(0)
    })

    it('should limit results by limit parameter', async () => {
      const dbStore = useDatabaseStore()
      await dbStore.initialize(true)
      await dbStore.migrate()

      const roomModel = useRoomModel()
      const room = await roomModel.create('test')
      const messageModel = useMessageModel()

      for (let i = 0; i < 5; i++) {
        const [message] = await messageModel.create({
          model: 'test',
          provider: 'test',
          parent_id: null,
          content: [],
          role: 'user',
          room_id: room.id,
          summary: null,
          memory: [],
        })
        const embedding = Array.from({ length: 1024 }, () => Math.random())
        await messageModel.updateEmbedding(message.id, embedding)
      }

      const searchEmbedding = Array.from({ length: 1024 }, () => 0.5)
      const results = await messageModel.vectorSimilaritySearch(searchEmbedding, 3)

      expect(results.length).toBeLessThanOrEqual(3)
    })
  })
})
