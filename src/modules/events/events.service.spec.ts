import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventsService } from './events.service';
import { DRIZZLE } from '../../database/drizzle.module';

describe('EventsService', () => {
  let service: EventsService;
  let mockDb: {
    select: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  // ── Fixtures ──────────────────────────────────────────────────────────────

  const mockEvent = {
    id: 1,
    title: 'Rock Concert',
    description: 'A great night of rock music',
    imageUrl: null,
    totalSeats: 100,
    availableSeats: 100,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSeat = {
    id: 1,
    eventId: 1,
    section: 'General',
    row: '1',
    number: '1',
    status: 'available',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // ── Mock factory helpers ──────────────────────────────────────────────────

  /**
   * Returns a chainable object that resolves to `finalValue` when awaited.
   * Supports: .from() .where() .limit() .offset()
   */
  const createChain = (finalValue: unknown[]) => {
    const chain: Record<string, unknown> & {
      then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) => Promise<unknown>;
    } = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      then(onFulfilled: (v: unknown) => unknown, onRejected: (e: unknown) => unknown) {
        return Promise.resolve(finalValue).then(onFulfilled, onRejected);
      },
    };
    return chain;
  };

  /** Creates a mock for db.update(table).set(data).where(condition) */
  const createUpdateChain = () => ({
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(undefined),
  });

  /** Creates a mock for db.delete(table).where(condition) */
  const createDeleteChain = () => ({
    where: jest.fn().mockResolvedValue(undefined),
  });

  // ── Module setup ─────────────────────────────────────────────────────────

  beforeEach(async () => {
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ============================================
  // findOne
  // ============================================

  describe('findOne', () => {
    it('should return an event when found', async () => {
      mockDb.select.mockReturnValueOnce(createChain([mockEvent]));

      const result = await service.findOne(1);

      expect(result).toEqual(mockEvent);
    });

    it('should throw NotFoundException when event does not exist', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('should include the event id in the NotFoundException message', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      await expect(service.findOne(999)).rejects.toThrow('Event #999 not found');
    });
  });

  // ============================================
  // findAll
  // ============================================

  describe('findAll', () => {
    it('should return paginated events with correct meta', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([mockEvent]))       // data query
        .mockReturnValueOnce(createChain([{ count: 1 }]));  // count query

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toEqual([mockEvent]);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should calculate totalPages correctly', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([mockEvent, mockEvent])) // 2 items on first page
        .mockReturnValueOnce(createChain([{ count: 25 }]));        // 25 total

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.meta.total).toBe(25);
      expect(result.meta.totalPages).toBe(3); // ceil(25 / 10) = 3
    });

    it('should return empty data and zero total when no events exist', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([]))
        .mockReturnValueOnce(createChain([{ count: 0 }]));

      const result = await service.findAll({});

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should use default page=1 and limit=10 when not provided', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([mockEvent]))
        .mockReturnValueOnce(createChain([{ count: 1 }]));

      const result = await service.findAll({});

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should support filtering by search and status simultaneously', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([mockEvent]))
        .mockReturnValueOnce(createChain([{ count: 1 }]));

      const result = await service.findAll({ search: 'Rock', status: 'active' });

      expect(result.data).toEqual([mockEvent]);
    });
  });

  // ============================================
  // create
  // ============================================

  describe('create', () => {
    const createDto = {
      title: 'Jazz Night',
      description: 'Smooth jazz evening',
      totalSeats: 5,
      imageUrl: null as unknown as string,
    };

    it('should create an event and return it', async () => {
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue([{ insertId: 1 }]),
      });
      mockDb.select.mockReturnValueOnce(createChain([mockEvent]));

      const result = await service.create(createDto);

      expect(result).toEqual(mockEvent);
    });

    it('should insert seats equal to totalSeats', async () => {
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue([{ insertId: 1 }]),
      });
      mockDb.select.mockReturnValueOnce(createChain([mockEvent]));

      await service.create(createDto);

      // insert called twice: once for event, once for seats batch
      expect(mockDb.insert).toHaveBeenCalledTimes(2);
    });

    it('should set availableSeats equal to totalSeats on creation', async () => {
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue([{ insertId: 1 }]),
      });
      mockDb.select.mockReturnValueOnce(createChain([{ ...mockEvent, availableSeats: 5, totalSeats: 5 }]));

      const result = await service.create(createDto);

      expect(result.availableSeats).toBe(result.totalSeats);
    });
  });

  // ============================================
  // findSeats
  // ============================================

  describe('findSeats', () => {
    it('should return all seats for a valid event', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([mockEvent]))  // findOne (event exists)
        .mockReturnValueOnce(createChain([mockSeat]));  // seats query

      const result = await service.findSeats(1);

      expect(result).toEqual([mockSeat]);
    });

    it('should support filtering seats by status', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([mockEvent]))
        .mockReturnValueOnce(createChain([mockSeat]));

      const result = await service.findSeats(1, 'available');

      expect(result).toEqual([mockSeat]);
    });

    it('should throw NotFoundException when event does not exist', async () => {
      mockDb.select.mockReturnValueOnce(createChain([])); // findOne → not found

      await expect(service.findSeats(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // update
  // ============================================

  describe('update', () => {
    const updateDto = { title: 'Updated Title' };

    it('should update an event and return the updated version', async () => {
      const updatedEvent = { ...mockEvent, title: 'Updated Title' };

      mockDb.select
        .mockReturnValueOnce(createChain([mockEvent]))        // findOne before update
        .mockReturnValueOnce(createChain([updatedEvent]));    // findOne after update

      mockDb.update.mockReturnValueOnce(createUpdateChain());

      const result = await service.update(1, updateDto);

      expect(result.title).toBe('Updated Title');
    });

    it('should call db.update once with the correct fields', async () => {
      const updatedEvent = { ...mockEvent, title: 'Updated Title' };

      mockDb.select
        .mockReturnValueOnce(createChain([mockEvent]))
        .mockReturnValueOnce(createChain([updatedEvent]));

      mockDb.update.mockReturnValueOnce(createUpdateChain());

      await service.update(1, updateDto);

      expect(mockDb.update).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when event does not exist', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      await expect(service.update(999, updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // remove
  // ============================================

  describe('remove', () => {
    it('should delete an event and return a success message', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([mockEvent]))      // findOne
        .mockReturnValueOnce(createChain([{ id: 1 }]));     // select seat ids

      mockDb.delete
        .mockReturnValueOnce(createDeleteChain()) // delete bookings by seatId
        .mockReturnValueOnce(createDeleteChain()) // delete seats
        .mockReturnValueOnce(createDeleteChain()) // delete bookings by eventId
        .mockReturnValueOnce(createDeleteChain()); // delete event

      const result = await service.remove(1);

      expect(result.message).toBe('Event #1 deleted');
    });

    it('should delete related seats and bookings before the event', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([mockEvent]))
        .mockReturnValueOnce(createChain([{ id: 1 }, { id: 2 }])); // two seats

      mockDb.delete
        .mockReturnValueOnce(createDeleteChain())
        .mockReturnValueOnce(createDeleteChain())
        .mockReturnValueOnce(createDeleteChain())
        .mockReturnValueOnce(createDeleteChain());

      await service.remove(1);

      expect(mockDb.delete).toHaveBeenCalledTimes(4);
    });

    it('should still delete the event when it has no seats', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([mockEvent]))
        .mockReturnValueOnce(createChain([])); // no seats

      mockDb.delete
        .mockReturnValueOnce(createDeleteChain()) // delete bookings by eventId
        .mockReturnValueOnce(createDeleteChain()); // delete event

      const result = await service.remove(1);

      expect(result.message).toBe('Event #1 deleted');
      expect(mockDb.delete).toHaveBeenCalledTimes(2); // no seat-related deletes
    });

    it('should throw NotFoundException when event does not exist', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
