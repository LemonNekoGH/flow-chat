import { describe, expect, it, suite } from 'vitest'
import { parseMessage } from './chat'

describe('parseMessage', () => {
  suite('when model is specified', () => {
    it('should return model, repeat 1 and message', () => {
      const message = 'model=gpt-4 Hello, world!'
      const result = parseMessage(message)
      expect(result).toEqual({
        model: 'gpt-4',
        repeat: 1,
        message: 'Hello, world!',
      })
    })
  })

  suite('when model is empty', () => {
    it('should return null model, repeat 1 and message', () => {
      const message = 'model= Hello, world!'
      const result = parseMessage(message)
      expect(result).toEqual({
        model: null,
        repeat: 1,
        message: 'model= Hello, world!',
      })
    })
  })

  suite('when repeat is number', () => {
    it('should return repeat and message', () => {
      const message = 'repeat=2 Hello, world!'
      const result = parseMessage(message)
      expect(result).toEqual({
        model: null,
        repeat: 2,
        message: 'Hello, world!',
      })
    })
  })

  suite('when repeat is empty', () => {
    it('should return repeat 1 and message', () => {
      const message = 'repeat= Hello, world!'
      const result = parseMessage(message)
      expect(result).toEqual({
        model: null,
        repeat: 1,
        message: 'repeat= Hello, world!',
      })
    })
  })

  suite('when repeat is string', () => {
    it('should return repeat 1', () => {
      const message = 'repeat=string Hello, world!'
      const result = parseMessage(message)
      expect(result).toEqual({
        model: null,
        repeat: 1,
        message: 'repeat=string Hello, world!',
      })
    })
  })

  suite('when model and repeat are correctly specified', () => {
    it('should return model, repeat and message', () => {
      const message = 'model=gpt-4 repeat=2 Hello, world!'
      const result = parseMessage(message)
      expect(result).toEqual({
        model: 'gpt-4',
        repeat: 2,
        message: 'Hello, world!',
      })
    })
  })

  suite('when model and repeat are not specified', () => {
    it('should only return message', () => {
      const message = 'Hello, world!'
      const result = parseMessage(message)
      expect(result).toEqual({
        model: null,
        repeat: 1,
        message: 'Hello, world!',
      })
    })
  })
})
