import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useDatabaseStore } from '../stores/database'
import { useMemoryModel } from './memories'
import { useRoomModel } from './rooms'

describe('memory model', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('upserts a global memory and merges tags', async () => {
    const dbStore = useDatabaseStore()
    await dbStore.initialize(true)
    await dbStore.migrate()

    const memoryModel = useMemoryModel()
    const first = await memoryModel.upsert({
      content: 'User prefers concise answers.',
      scope: 'global',
      tags: ['preference'],
    })
    const second = await memoryModel.upsert({
      content: 'User prefers concise answers.',
      scope: 'global',
      tags: ['style'],
    })

    expect(second.id).toBe(first.id)
    expect(second.room_id).toBeNull()
    expect(second.tags.sort()).toEqual(['preference', 'style'])
  })

  it('does not dedupe across rooms', async () => {
    const dbStore = useDatabaseStore()
    await dbStore.initialize(true)
    await dbStore.migrate()

    const roomModel = useRoomModel()
    const roomA = await roomModel.create('room-a')
    const roomB = await roomModel.create('room-b')

    const memoryModel = useMemoryModel()
    await memoryModel.upsert({
      content: 'Remember this per-room.',
      scope: 'room',
      roomId: roomA.id,
    })
    await memoryModel.upsert({
      content: 'Remember this per-room.',
      scope: 'room',
      roomId: roomB.id,
    })

    const memoriesA = await memoryModel.getByRoomId(roomA.id)
    const memoriesB = await memoryModel.getByRoomId(roomB.id)
    expect(memoriesA).toHaveLength(1)
    expect(memoriesB).toHaveLength(1)
    expect(memoriesA[0]!.id).not.toBe(memoriesB[0]!.id)
  })

  it('does not mix orphaned room memories into global memories', async () => {
    const dbStore = useDatabaseStore()
    await dbStore.initialize(true)
    await dbStore.migrate()

    const memoryModel = useMemoryModel()
    await memoryModel.upsert({
      content: 'This is a global memory.',
      scope: 'global',
    })
    // Simulate bad/orphaned data: scope is "room" but room_id is NULL.
    await memoryModel.upsert({
      content: 'This should not be treated as global.',
      scope: 'room',
      roomId: null,
    })

    const globals = await memoryModel.getByRoomId(null)
    expect(globals).toHaveLength(1)
    expect(globals[0]!.scope).toBe('global')
    expect(globals[0]!.content).toBe('This is a global memory.')
  })
})
