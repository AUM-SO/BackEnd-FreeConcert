import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.module';
import { bookings, seats, events } from '../../database/schema';
import { CreateBookingDto } from './dto/create-booking.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class BookingsService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async create(userId: number, createBookingDto: CreateBookingDto) {
    // Check event exists
    const [event] = await this.db
      .select()
      .from(events)
      .where(eq(events.id, createBookingDto.eventId))
      .limit(1);

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check seat availability
    const [seat] = await this.db
      .select()
      .from(seats)
      .where(and(eq(seats.id, createBookingDto.seatId), eq(seats.status, 'available')))
      .limit(1);

    if (!seat) {
      throw new BadRequestException('Seat is not available');
    }

    // Generate booking code
    const bookingCode = `BK-${randomBytes(6).toString('hex').toUpperCase()}`;

    // Create booking & update seat status
    const insertResult = await this.db.insert(bookings).values({
      userId,
      eventId: createBookingDto.eventId,
      seatId: createBookingDto.seatId,
      bookingCode,
      status: 'confirmed',
    });

    const [booking] = await this.db
      .select()
      .from(bookings)
      .where(eq(bookings.id, insertResult[0].insertId))
      .limit(1);

    // Mark seat as booked
    await this.db
      .update(seats)
      .set({ status: 'booked', updatedAt: new Date() })
      .where(eq(seats.id, createBookingDto.seatId));

    // Decrement available seats
    await this.db
      .update(events)
      .set({
        availableSeats: event.availableSeats - 1,
        updatedAt: new Date(),
      })
      .where(eq(events.id, createBookingDto.eventId));

    return booking;
  }

  async findAll(userId?: number) {
    if (userId) {
      return this.db.select().from(bookings).where(eq(bookings.userId, userId));
    }
    return this.db.select().from(bookings);
  }

  async findOne(id: number) {
    const [booking] = await this.db.select().from(bookings).where(eq(bookings.id, id)).limit(1);

    if (!booking) {
      throw new NotFoundException(`Booking #${id} not found`);
    }
    return booking;
  }

  async cancel(id: number, userId: number) {
    const booking = await this.findOne(id);

    if (booking.userId !== userId) {
      throw new BadRequestException('You can only cancel your own bookings');
    }

    if (booking.status === 'cancelled') {
      throw new BadRequestException('Booking is already cancelled');
    }

    // Update booking status
    await this.db
      .update(bookings)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(bookings.id, id));

    const updated = await this.findOne(id);

    // Free up seat
    await this.db
      .update(seats)
      .set({ status: 'available', updatedAt: new Date() })
      .where(eq(seats.id, booking.seatId));

    // Increment available seats
    const [event] = await this.db
      .select()
      .from(events)
      .where(eq(events.id, booking.eventId))
      .limit(1);

    if (event) {
      await this.db
        .update(events)
        .set({
          availableSeats: event.availableSeats + 1,
          updatedAt: new Date(),
        })
        .where(eq(events.id, booking.eventId));
    }

    return updated;
  }
}
