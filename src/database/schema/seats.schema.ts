import { mysqlTable, int, varchar, timestamp } from 'drizzle-orm/mysql-core';
import { venues } from './venues.schema';
import { events } from './events.schema';

export const seats = mysqlTable('seats', {
  id: int('id').primaryKey().autoincrement(),
  venueId: int('venue_id')
    .references(() => venues.id)
    .notNull(),
  eventId: int('event_id')
    .references(() => events.id)
    .notNull(),
  section: varchar('section', { length: 50 }).notNull(),
  row: varchar('row', { length: 10 }).notNull(),
  number: varchar('number', { length: 10 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('available'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().onUpdateNow(),
});

export type Seat = typeof seats.$inferSelect;
export type NewSeat = typeof seats.$inferInsert;
