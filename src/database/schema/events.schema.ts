import { mysqlTable, int, varchar, text, timestamp } from 'drizzle-orm/mysql-core';

export const events = mysqlTable('events', {
  id: int('id').primaryKey().autoincrement(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  totalSeats: int('total_seats').notNull().default(0),
  availableSeats: int('available_seats').notNull().default(0),
  status: varchar('status', { length: 50 }).notNull().default('published'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().onUpdateNow(),
});

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
