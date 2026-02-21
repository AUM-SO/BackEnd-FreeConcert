import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { DRIZZLE } from '../../database/drizzle.module';

describe('BookingsService', () => {
  let service: BookingsService;
  let mockDb: {
    select: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
  };

  // ── Fixtures ──────────────────────────────────────────────────────────────

  const mockEvent = {
    id: 1,
    title: 'Rock Concert',
    availableSeats: 10,
    status: 'active',
  };

  const mockUser = {
    id: 42,
    name: 'John Doe',
    email: 'john@example.com',
    role: 'user',
  };

  const mockSeat = {
    id: 5,
    eventId: 1,
    section: 'General',
    row: '1',
    number: '5',
    status: 'available',
  };

  const mockBooking = {
    id: 100,
    userId: 42,
    eventId: 1,
    seatId: 5,
    username: 'John Doe',
    concertName: 'Rock Concert',
    bookingCode: 'BK-ABCDEF',
    status: 'confirmed',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // ── Mock factory helpers ──────────────────────────────────────────────────

  /**
   * Returns a chainable object that resolves to `finalValue` when awaited.
   * Mimics the Drizzle ORM query builder API.
   */
  const createChain = (finalValue: unknown[]) => {
    const chain: Record<string, unknown> & {
      then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) => Promise<unknown>;
    } = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then(onFulfilled: (v: unknown) => unknown, onRejected: (e: unknown) => unknown) {
        return Promise.resolve(finalValue).then(onFulfilled, onRejected);
      },
    };
    return chain;
  };

  /** Creates a mock for db.update(table).set(data).where(condition) */
  const createUpdateChain = () => {
    const chain: { set: jest.Mock; where: jest.Mock } = {
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue(undefined),
    };
    return chain;
  };

  /** Creates a mock for db.insert(table).values(data) */
  const createInsertChain = (insertId: number) => ({
    values: jest.fn().mockResolvedValue([{ insertId }]),
  });

  // ── Module setup ─────────────────────────────────────────────────────────

  beforeEach(async () => {
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ============================================
  // findOne
  // ============================================

  describe('findOne', () => {
    it('should return the booking when found', async () => {
      mockDb.select.mockReturnValueOnce(createChain([mockBooking]));

      const result = await service.findOne(100);

      expect(result).toEqual(mockBooking);
    });

    it('should throw NotFoundException when booking does not exist', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException with the booking id in the message', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      await expect(service.findOne(999)).rejects.toThrow('Booking #999 not found');
    });
  });

  // ============================================
  // findAll
  // ============================================

  describe('findAll', () => {
    it('should return all bookings when no userId is provided', async () => {
      mockDb.select.mockReturnValueOnce(createChain([mockBooking]));

      const result = await service.findAll();

      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter bookings by userId when userId is provided', async () => {
      mockDb.select.mockReturnValueOnce(createChain([mockBooking]));

      // The service returns the query (with .where() applied). We verify db.select was called.
      await service.findAll(42);

      expect(mockDb.select).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================
  // create
  // ============================================

  describe('create', () => {
    const createDto = { eventId: 1, seatId: 5 };
    const userId = 42;

    it('should create a booking and return the newly created booking', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([mockEvent]))    // check event exists
        .mockReturnValueOnce(createChain([mockUser]))     // fetch user
        .mockReturnValueOnce(createChain([]))             // no existing active booking
        .mockReturnValueOnce(createChain([mockSeat]))     // seat is available
        .mockReturnValueOnce(createChain([mockBooking])); // fetch created booking

      mockDb.insert.mockReturnValue(createInsertChain(100));
      mockDb.update
        .mockReturnValueOnce(createUpdateChain()) // mark seat as booked
        .mockReturnValueOnce(createUpdateChain()); // decrement availableSeats

      const result = await service.create(userId, createDto);

      expect(result).toEqual(mockBooking);
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });

    it('should mark the seat as booked after creating a booking', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([mockEvent]))
        .mockReturnValueOnce(createChain([mockUser]))
        .mockReturnValueOnce(createChain([]))
        .mockReturnValueOnce(createChain([mockSeat]))
        .mockReturnValueOnce(createChain([mockBooking]));

      mockDb.insert.mockReturnValue(createInsertChain(100));
      mockDb.update
        .mockReturnValueOnce(createUpdateChain())
        .mockReturnValueOnce(createUpdateChain());

      await service.create(userId, createDto);

      expect(mockDb.update).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException when the event does not exist', async () => {
      mockDb.select.mockReturnValueOnce(createChain([])); // event not found

      await expect(service.create(userId, createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when the user does not exist', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([mockEvent])) // event found
        .mockReturnValueOnce(createChain([]));          // user not found

      await expect(service.create(userId, createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user already has an active booking for the same event', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([mockEvent]))
        .mockReturnValueOnce(createChain([mockUser]))
        .mockReturnValueOnce(createChain([mockBooking])); // existing active booking for same event

      await expect(service.create(userId, createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with Thai error message when user already has a booking for the same event', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([mockEvent]))
        .mockReturnValueOnce(createChain([mockUser]))
        .mockReturnValueOnce(createChain([mockBooking]));

      await expect(service.create(userId, createDto)).rejects.toThrow(
        'คุณได้จอง event นี้ไปแล้ว ไม่สามารถจองซ้ำได้'
      );
    });

    it('should throw BadRequestException when the selected seat is not available', async () => {
      const bookedSeat = { ...mockSeat, status: 'booked' };

      mockDb.select
        .mockReturnValueOnce(createChain([mockEvent]))
        .mockReturnValueOnce(createChain([mockUser]))
        .mockReturnValueOnce(createChain([]))          // no existing booking
        .mockReturnValueOnce(createChain([]));          // seat not available (status != 'available')

      await expect(service.create(userId, createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with "Seat is not available" message', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([mockEvent]))
        .mockReturnValueOnce(createChain([mockUser]))
        .mockReturnValueOnce(createChain([]))
        .mockReturnValueOnce(createChain([]));

      await expect(service.create(userId, createDto)).rejects.toThrow('Seat is not available');
    });
  });

  // ============================================
  // cancel
  // ============================================

  describe('cancel', () => {
    const cancelledBooking = { ...mockBooking, status: 'cancelled' };

    it('should cancel a booking and return the updated booking', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([mockBooking]))       // findOne → original booking
        .mockReturnValueOnce(createChain([cancelledBooking]))  // findOne → updated booking
        .mockReturnValueOnce(createChain([mockEvent]));        // fetch event for seat increment

      mockDb.update
        .mockReturnValueOnce(createUpdateChain()) // set booking status = cancelled
        .mockReturnValueOnce(createUpdateChain()) // set seat status = available
        .mockReturnValueOnce(createUpdateChain()); // increment availableSeats

      const result = await service.cancel(mockBooking.id, mockUser.id);

      expect(result.status).toBe('cancelled');
    });

    it('should free up the seat when a booking is cancelled', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([mockBooking]))
        .mockReturnValueOnce(createChain([cancelledBooking]))
        .mockReturnValueOnce(createChain([mockEvent]));

      mockDb.update
        .mockReturnValueOnce(createUpdateChain())
        .mockReturnValueOnce(createUpdateChain())
        .mockReturnValueOnce(createUpdateChain());

      await service.cancel(mockBooking.id, mockUser.id);

      // 3 updates: booking status, seat status, event availableSeats
      expect(mockDb.update).toHaveBeenCalledTimes(3);
    });

    it('should throw NotFoundException when booking does not exist', async () => {
      mockDb.select.mockReturnValueOnce(createChain([])); // booking not found

      await expect(service.cancel(999, mockUser.id)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user tries to cancel another user\'s booking', async () => {
      const otherUserBooking = { ...mockBooking, userId: 99 }; // different user

      mockDb.select.mockReturnValueOnce(createChain([otherUserBooking]));

      await expect(service.cancel(mockBooking.id, mockUser.id)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with correct message when cancelling another user\'s booking', async () => {
      const otherUserBooking = { ...mockBooking, userId: 99 };

      mockDb.select.mockReturnValueOnce(createChain([otherUserBooking]));

      await expect(service.cancel(mockBooking.id, mockUser.id)).rejects.toThrow(
        'You can only cancel your own bookings'
      );
    });

    it('should throw BadRequestException when booking is already cancelled', async () => {
      const alreadyCancelled = { ...mockBooking, status: 'cancelled' };

      mockDb.select.mockReturnValueOnce(createChain([alreadyCancelled]));

      await expect(service.cancel(mockBooking.id, mockUser.id)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with "Booking is already cancelled" message', async () => {
      const alreadyCancelled = { ...mockBooking, status: 'cancelled' };

      mockDb.select.mockReturnValueOnce(createChain([alreadyCancelled]));

      await expect(service.cancel(mockBooking.id, mockUser.id)).rejects.toThrow(
        'Booking is already cancelled'
      );
    });
  });
});
