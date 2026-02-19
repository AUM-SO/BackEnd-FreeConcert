import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, like, and, sql, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.module';
import { events, seats, bookings } from '../../database/schema';
import { CreateEventDto } from './dto/create-event.dto';
import { QueryEventDto } from './dto/query-event.dto';

@Injectable()
export class EventsService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async create(createEventDto: CreateEventDto) {
    const result = await this.db.insert(events).values({
      ...createEventDto,
      availableSeats: createEventDto.totalSeats,
    });
    const [event] = await this.db
      .select()
      .from(events)
      .where(eq(events.id, result[0].insertId))
      .limit(1);
    return event;
  }

  async findAll(query: QueryEventDto) {
    const { page = 1, limit = 10, search, status } = query;
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [];
    if (search) {
      conditions.push(like(events.title, `%${search}%`));
    }
    if (status) {
      conditions.push(eq(events.status, status));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, countResult] = await Promise.all([
      this.db.select().from(events).where(where).limit(limit).offset(offset),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(events)
        .where(where),
    ]);

    return {
      data,
      meta: {
        total: Number(countResult[0].count),
        page,
        limit,
        totalPages: Math.ceil(Number(countResult[0].count) / limit),
      },
    };
  }

  async findOne(id: number) {
    const [event] = await this.db.select().from(events).where(eq(events.id, id)).limit(1);

    if (!event) {
      throw new NotFoundException(`Event #${id} not found`);
    }
    return event;
  }

  async update(id: number, updateDto: Partial<CreateEventDto>) {
    await this.findOne(id);

    await this.db
      .update(events)
      .set({ ...updateDto, updatedAt: new Date() })
      .where(eq(events.id, id));

    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id);

    // Delete related bookings and seats before deleting the event
    const eventSeats = await this.db
      .select({ id: seats.id })
      .from(seats)
      .where(eq(seats.eventId, id));
    if (eventSeats.length > 0) {
      const seatIds = eventSeats.map((s: { id: number }) => s.id);
      await this.db.delete(bookings).where(inArray(bookings.seatId, seatIds));
      await this.db.delete(seats).where(eq(seats.eventId, id));
    }
    await this.db.delete(bookings).where(eq(bookings.eventId, id));
    await this.db.delete(events).where(eq(events.id, id));

    return { message: `Event #${id} deleted` };
  }
}
