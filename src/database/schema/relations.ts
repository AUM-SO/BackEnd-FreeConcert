import { relations } from 'drizzle-orm';
import { users } from './users.schema';
import { events } from './events.schema';
import { venues } from './venues.schema';
import { seats } from './seats.schema';
import { bookings } from './bookings.schema';

// ────── Users Relations ──────
export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
}));

// ────── Venues Relations ──────
export const venuesRelations = relations(venues, ({ many }) => ({
  events: many(events),
  seats: many(seats),
}));

// ────── Events Relations ──────
export const eventsRelations = relations(events, ({ one, many }) => ({
  venue: one(venues, {
    fields: [events.venueId],
    references: [venues.id],
  }),
  seats: many(seats),
  bookings: many(bookings),
}));

// ────── Seats Relations ──────
export const seatsRelations = relations(seats, ({ one, many }) => ({
  venue: one(venues, {
    fields: [seats.venueId],
    references: [venues.id],
  }),
  event: one(events, {
    fields: [seats.eventId],
    references: [events.id],
  }),
  bookings: many(bookings),
}));

// ────── Bookings Relations ──────
export const bookingsRelations = relations(bookings, ({ one }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  event: one(events, {
    fields: [bookings.eventId],
    references: [events.id],
  }),
  seat: one(seats, {
    fields: [bookings.seatId],
    references: [seats.id],
  }),
}));
