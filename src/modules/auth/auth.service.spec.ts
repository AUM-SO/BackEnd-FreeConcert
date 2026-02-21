/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { DRIZZLE } from '../../database/drizzle.module';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let mockDb: { select: jest.Mock; insert: jest.Mock };
  let mockJwtSign: jest.Mock;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    password: 'hashed_password',
    name: 'Test User',
    role: 'user',
    avatar: null as string | null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  /**
   * Creates a chainable Drizzle-like query object that resolves to `finalValue` when awaited.
   * Supports: .from() .where() .limit()
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

  /** Sets up mockDb.insert to return the standard insert chain */
  const setupInsertMock = (insertId = 1) => {
    mockDb.insert.mockReturnValue({
      values: jest.fn().mockResolvedValue([{ insertId }]),
    });
  };

  beforeEach(async () => {
    mockJwtSign = jest.fn().mockReturnValue('signed_token');

    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DRIZZLE, useValue: mockDb },
        {
          provide: JwtService,
          useValue: { sign: mockJwtSign },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  // ============================================
  // register
  // ============================================

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should register a new user and return user (without password) and accessToken', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([])) // email not yet taken
        .mockReturnValueOnce(createChain([mockUser])); // fetch newly created user

      setupInsertMock();
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      const result = await service.register(registerDto);

      expect(result.accessToken).toBe('signed_token');
      expect(result.user.email).toBe(mockUser.email);
      expect(result.user).not.toHaveProperty('password');
    });

    it('should sign the JWT token with correct payload on registration', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([]))
        .mockReturnValueOnce(createChain([mockUser]));

      setupInsertMock();
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      await service.register(registerDto);

      expect(mockJwtSign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
    });

    it('should hash the password with bcrypt before storing', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([]))
        .mockReturnValueOnce(createChain([mockUser]));

      setupInsertMock();
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      await service.register(registerDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
    });

    it('should register a user with an optional avatar field', async () => {
      const userWithAvatar = { ...mockUser, avatar: 'https://example.com/avatar.png' };
      const dtoWithAvatar = { ...registerDto, avatar: 'https://example.com/avatar.png' };

      mockDb.select
        .mockReturnValueOnce(createChain([]))
        .mockReturnValueOnce(createChain([userWithAvatar]));

      setupInsertMock();
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      const result = await service.register(dtoWithAvatar);

      expect(result.user).toMatchObject({ avatar: 'https://example.com/avatar.png' });
    });

    it('should throw ConflictException with "Email already exists" when email is taken', async () => {
      mockDb.select.mockReturnValueOnce(createChain([mockUser])); // email already exists

      const error = await service.register(registerDto).catch((e: Error) => e);

      expect(error).toBeInstanceOf(ConflictException);
      expect(error.message).toBe('Email already exists');
    });
  });

  // ============================================
  // login
  // ============================================

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'password123' };

    it('should return user (without password) and accessToken on valid credentials', async () => {
      mockDb.select.mockReturnValueOnce(createChain([mockUser]));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result.accessToken).toBe('signed_token');
      expect(result.user.email).toBe(mockUser.email);
      expect(result.user).not.toHaveProperty('password');
    });

    it('should sign the JWT token with correct payload on login', async () => {
      mockDb.select.mockReturnValueOnce(createChain([mockUser]));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.login(loginDto);

      expect(mockJwtSign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
    });

    it('should compare the provided password against the stored hash', async () => {
      mockDb.select.mockReturnValueOnce(createChain([mockUser]));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.login(loginDto);

      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUser.password);
    });

    it('should throw UnauthorizedException with "Invalid credentials" when user is not found', async () => {
      mockDb.select.mockReturnValueOnce(createChain([])); // no user found

      const error = await service.login(loginDto).catch((e: Error) => e);

      expect(error).toBeInstanceOf(UnauthorizedException);
      expect(error.message).toBe('Invalid credentials');
    });

    it('should throw UnauthorizedException with "Invalid credentials" when password is wrong', async () => {
      mockDb.select.mockReturnValueOnce(createChain([mockUser]));
      (bcrypt.compare as jest.Mock).mockResolvedValue(false); // wrong password

      const error = await service.login(loginDto).catch((e: Error) => e);

      expect(error).toBeInstanceOf(UnauthorizedException);
      expect(error.message).toBe('Invalid credentials');
    });
  });
});
