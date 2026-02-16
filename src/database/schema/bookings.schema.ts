import { mysqlTable, int, varchar, timestamp } from 'drizzle-orm/mysql-core';
import { users } from './users.schema';
import { events } from './events.schema';
import { seats } from './seats.schema';

export const bookings = mysqlTable('bookings', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id')
    .references(() => users.id)
    .notNull(),
  eventId: int('event_id')
    .references(() => events.id)
    .notNull(),
  seatId: int('seat_id')
    .references(() => seats.id)
    .notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  bookingCode: varchar('booking_code', { length: 100 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().onUpdateNow(),
});

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
