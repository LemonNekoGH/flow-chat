import { sql } from 'drizzle-orm'
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const systemPrompts = pgTable('system_prompts', () => ({
  id: uuid().primaryKey().unique().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
}))

export const rooms = pgTable('rooms', () => ({
  id: uuid().primaryKey().unique().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  systemPromptId: uuid('system_prompt_id').references(() => systemPrompts.id),
  defaultModel: text('default_model'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
}))

export const messages = pgTable('messages', () => ({
  id: uuid().primaryKey().unique().default(sql`gen_random_uuid()`),
  content: text('content').notNull(),
  model: text('model').notNull(),
  role: text('role').notNull(),
  roomId: uuid('room_id').references(() => rooms.id),
  parentId: uuid('parent_id'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
}))
