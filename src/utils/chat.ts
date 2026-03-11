interface CommandAccumulator {
  model?: string
  repeat: number
}

const MODEL_COMMAND_RE = /^model=(\S+)/
const REPEAT_COMMAND_RE = /^repeat=(\d+)/

export interface ParseMessageResult extends CommandAccumulator {
  message: string
}

export function parseMessage(text: string): ParseMessageResult {
  // example: model=gpt-4 repeat=2 Hello, world!
  return (function reduce<T>(message: string, availableCommands: Record<string, {
    regex: RegExp
    parse: (match: RegExpMatchArray) => Partial<CommandAccumulator>
  }>, accumulator: T) {
    for (const key in availableCommands) {
      const { [key]: { regex, parse }, ...commands } = availableCommands
      const match = message.match(regex)
      if (match)
        return reduce(message.replace(regex, '').trimStart(), commands, { ...accumulator, ...parse(match) })
    }
    return { message, ...accumulator }
  })(text.trim(), {
    model: {
      regex: MODEL_COMMAND_RE,
      parse: match => ({ model: match[1] }),
    },
    repeat: {
      regex: REPEAT_COMMAND_RE,
      parse: match => ({ repeat: Number.parseInt(match[1]) }),
    },
  }, { repeat: 1 })
}
