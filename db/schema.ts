import { sql } from 'drizzle-orm'
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const templates = pgTable('templates', () => ({
  id: uuid().primaryKey().unique().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  system_prompt: text('system_prompt').notNull(),
  // TODO: temperature or something else AI settings.
  created_at: timestamp('created_at').notNull().default(sql`now()`),
  updated_at: timestamp('updated_at').notNull().default(sql`now()`),
}))

export const rooms = pgTable('rooms', () => ({
  id: uuid().primaryKey().unique().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  template_id: uuid('template_id').references(() => templates.id),
  default_model: text('default_model'),
  created_at: timestamp('created_at').notNull().default(sql`now()`),
  updated_at: timestamp('updated_at').notNull().default(sql`now()`),
}))

export const messages = pgTable('messages', () => ({
  id: uuid().primaryKey().unique().default(sql`gen_random_uuid()`),
  content: text('content').notNull(),
  model: text('model').notNull(),
  provider: text('provider').notNull(),
  role: text('role').notNull(),
  room_id: uuid('room_id').references(() => rooms.id),
  parent_id: uuid('parent_id'),
  created_at: timestamp('created_at').notNull().default(sql`now()`),
  updated_at: timestamp('updated_at').notNull().default(sql`now()`),
}))
