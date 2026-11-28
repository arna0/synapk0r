import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const reviews = sqliteTable('reviews', {
  seq: integer('seq').primaryKey({ autoIncrement: true }),
  id: text('id').notNull(), at: text('at').notNull(), module: text('module').notNull(),
  publish: integer('publish').notNull().default(0), answers: text('answers').notNull(),
  comment: text('comment').notNull().default(''), score: real('score'),
  timeSec: real('time_sec'), errors: real('errors'), deleteTokenHash: text('delete_token_hash')
}, t => [uniqueIndex('reviews_id_unique').on(t.id), index('reviews_public_order').on(t.publish, t.seq), index('reviews_module_order').on(t.publish, t.module, t.seq)]);
// Short-lived hashes only; raw IP addresses and player identities are not stored.
export const requestLimits = sqliteTable('request_limits', {
  key: text('key').primaryKey(), hits: integer('hits').notNull(), expires: integer('expires').notNull()
}, t => [index('request_limits_expiry').on(t.expires)]);
