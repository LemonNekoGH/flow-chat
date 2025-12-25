import { sql } from 'drizzle-orm'
import { boolean, doublePrecision, index, pgTable, text, timestamp, uuid, vector } from 'drizzle-orm/pg-core'

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
  focus_node_id: uuid('focus_node_id'),
  viewport_x: doublePrecision('viewport_x'),
  viewport_y: doublePrecision('viewport_y'),
  viewport_zoom: doublePrecision('viewport_zoom'),
  created_at: timestamp('created_at').notNull().default(sql`now()`),
  updated_at: timestamp('updated_at').notNull().default(sql`now()`),
}))

export const messages = pgTable('messages', {
  id: uuid().primaryKey().unique().default(sql`gen_random_uuid()`),
  content: text('content').notNull(),
  model: text('model').notNull(),
  provider: text('provider').notNull(),
  role: text('role').notNull(),
  room_id: uuid('room_id').references(() => rooms.id, { onDelete: 'cascade' }),
  parent_id: uuid('parent_id'),
  embedding: vector('embedding', { dimensions: 1024 }),
  summary: text('summary'),
  show_summary: boolean('show_summary').notNull().default(false),
  memory: text('memory').array().notNull().default(sql`ARRAY[]::text[]`), // Array of memory IDs
  created_at: timestamp('created_at').notNull().default(sql`now()`),
  updated_at: timestamp('updated_at').notNull().default(sql`now()`),
}, table => [
  index('embeddingIndex').using('hnsw', table.embedding.op('vector_cosine_ops')),
])

export const memories = pgTable('memories', () => ({
  id: uuid().primaryKey().unique().default(sql`gen_random_uuid()`),
  content: text('content').notNull(),
  scope: text('scope').notNull(), // 'global' | 'room'
  room_id: uuid('room_id').references(() => rooms.id, { onDelete: 'cascade' }),
  tags: text('tags').notNull().default('[]'), // JSON stringified string[]
  created_at: timestamp('created_at').notNull().default(sql`now()`),
  updated_at: timestamp('updated_at').notNull().default(sql`now()`),
}))
