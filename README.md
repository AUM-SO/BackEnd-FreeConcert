# FreeConcertTickets — Backend API

REST API สำหรับระบบจองตั๋วคอนเสิร์ตฟรี สร้างด้วย **NestJS**, **Drizzle ORM** และ **MySQL**

---

## สารบัญ

- [Tech Stack](#tech-stack)
- [โครงสร้างโปรเจกต์](#โครงสร้างโปรเจกต์)
- [ภาพรวม Architecture](#ภาพรวม-architecture)
- [ขั้นตอนการตั้งค่าบนเครื่อง Local](#ขั้นตอนการตั้งค่าบนเครื่อง-local)
  - [1. ติดตั้ง Dependencies](#1-ติดตั้ง-dependencies)
  - [2. ตั้งค่า Environment Variables](#2-ตั้งค่า-environment-variables)
  - [3. เริ่ม MySQL ด้วย Docker](#3-เริ่ม-mysql-ด้วย-docker)
  - [4. ตั้งค่า Database](#4-ตั้งค่า-database)
  - [5. รัน Development Server](#5-รัน-development-server)
- [การรันแอป](#การรันแอป)
- [การรัน Unit Tests](#การรัน-unit-tests)
- [API Endpoints](#api-endpoints)
- [Database Scripts](#database-scripts)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | NestJS 11 (TypeScript) |
| Database | MySQL 8 + Drizzle ORM |
| Authentication | JWT (cookie + bearer) + Passport |
| Validation | class-validator / class-transformer |
| API Docs | Swagger (`/api/docs`) |
| Testing | Jest |
| Package Manager | Yarn |

---

## โครงสร้างโปรเจกต์

```
backend-freeconnert/
├── src/
│   ├── main.ts                   # Entry point — bootstrap NestJS app
│   ├── app.module.ts             # Root module
│   ├── common/
│   │   ├── decorators/           # @CurrentUser() decorator
│   │   ├── filters/              # Global exception filter
│   │   ├── guards/               # RolesGuard
│   │   └── interceptors/         # Logging interceptor
│   ├── config/
│   │   ├── app.config.ts         # Port, environment
│   │   ├── database.config.ts    # DB credentials
│   │   └── jwt.config.ts         # JWT secret, expiry
│   ├── database/
│   │   ├── schema/               # Drizzle table definitions
│   │   │   ├── users.schema.ts
│   │   │   ├── events.schema.ts
│   │   │   ├── seats.schema.ts
│   │   │   ├── bookings.schema.ts
│   │   │   └── venues.schema.ts
│   │   ├── migrations/           # Auto-generated SQL migrations
│   │   ├── drizzle.module.ts     # Global DB module
│   │   ├── drizzle.provider.ts   # MySQL connection pool
│   │   ├── seed.ts               # Seed script (users, events, seats)
│   │   └── reset.ts              # Drop all tables
│   └── modules/
│       ├── auth/                 # Register, Login, Logout, /me
│       ├── users/                # User CRUD
│       ├── events/               # Event CRUD + seat listing
│       ├── bookings/             # Booking create/cancel
│       └── notifications/        # (scaffolded) Email/push notifications
├── test/
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
├── docker-compose.yml            # MySQL container
├── drizzle.config.ts             # Drizzle CLI config
├── .env.example                  # Environment variable template
└── package.json
```

---

## ภาพรวม Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Client (Next.js)                      │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP / Cookie JWT
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    NestJS Application                       │
│                                                             │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐  │
│  │   Auth   │   │  Events  │   │ Bookings │   │  Users   │  │
│  │ Module   │   │  Module  │   │  Module  │   │  Module  │  │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘  │
│       │              │              │               │       │
│       └──────────────┴──────────────┴───────────────┘       │
│                             │                               │
│              ┌──────────────▼──────────────┐                │
│              │        Drizzle ORM          │                │
│              │   (type-safe query builder) │                │
│              └──────────────┬──────────────┘                │
│                             │                               │
│                             ▼                               │
│                        ┌───────┐                            │
│                        │ MySQL │                            │
│                        │  DB   │                            │
│                        └───────┘                            │
└─────────────────────────────────────────────────────────────┘
```

### Request Flow

```
HTTP Request
    ↓
Global ValidationPipe   ← ตรวจสอบ DTO ด้วย class-validator
    ↓
JWT AuthGuard           ← ตรวจสอบ JWT จาก cookie หรือ Authorization header
    ↓
RolesGuard              ← ตรวจสอบ role (user / admin)
    ↓
Controller              ← รับ request, เรียก Service
    ↓
Service                 ← Business logic, query ผ่าน Drizzle ORM
    ↓
MySQL Database
    ↓
Response (JSON)
```

### Authentication Flow

JWT ถูกส่งได้ 2 ช่องทาง (ลำดับความสำคัญ: Cookie > Bearer):
- **Cookie**: `access_token` (httpOnly, secure ใน production)
- **Header**: `Authorization: Bearer <token>`

Payload ของ Token:
```json
{ "sub": 1, "email": "user@example.com", "role": "user" }
```

### Database Schema

```
users ──────┐
            │ 1:N
events ─────┼──── bookings ────── seats
            │
venues ─────┘ (schema สร้างแล้ว, endpoint ยังไม่มี)
```

---

## ขั้นตอนการตั้งค่าบนเครื่อง Local

### สิ่งที่ต้องติดตั้งก่อน

- [Node.js](https://nodejs.org/) v20+
- [Yarn](https://yarnpkg.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (สำหรับ MySQL)

---

### 1. ติดตั้ง Dependencies

```bash
yarn install
```

---

### 2. ตั้งค่า Environment Variables

คัดลอก `.env.example` แล้วแก้ไขค่าให้ตรงกับ local:

```bash
cp .env.example .env
```

แก้ไขไฟล์ `.env`:

```env
# Server
PORT=3002
FRONTEND_URL=http://localhost:3000

# Database (MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password     # ← ตั้งรหัสผ่านที่ต้องการ
DB_NAME=freeconcert

# JWT
JWT_SECRET=your-super-secret-key   # ← เปลี่ยนเป็น secret ที่ซับซ้อน
JWT_EXPIRES_IN=1d
```

> **หมายเหตุ**: ค่า `DB_PASSWORD` ต้องตรงกับที่ตั้งใน `docker-compose.yml`

---

### 3. เริ่ม MySQL ด้วย Docker

```bash
docker-compose up -d
```

คำสั่งนี้จะเริ่ม **MySQL 8** บน port `3306`

ตรวจสอบว่า container รันอยู่:
```bash
docker-compose ps
```

---

### 4. ตั้งค่า Database

**ตัวเลือกที่ 1 — ตั้งค่าครบในคำสั่งเดียว (แนะนำ):**
```bash
yarn setup:dev
```
คำสั่งนี้จะ: สร้าง database → push schema → seed ข้อมูลตัวอย่าง

**ตัวเลือกที่ 2 — ทำทีละขั้นตอน:**
```bash
yarn db:create   # สร้าง database 'freeconcert'
yarn db:push     # push schema ไปยัง database
yarn db:seed     # ใส่ข้อมูลตัวอย่าง (3 users, 3 events, 230 seats)
```

**ข้อมูลที่ seed ได้:**
| Type | Details |
|------|---------|
| Admin | `admin@example.com` / `password123` |
| Users | `user1@example.com`, `user2@example.com` / `password123` |
| Events | 3 concerts พร้อม seats |

---

### 5. รัน Development Server

```bash
yarn dev
```

แอปจะรันที่ **http://localhost:3002**

| URL | Description |
|-----|-------------|
| `http://localhost:3002/api` | Health check |
| `http://localhost:3002/api/docs` | Swagger API Documentation |

---

## การรันแอป

```bash
# Development (watch mode — auto-restart เมื่อไฟล์เปลี่ยน)
yarn dev

# Production (ต้อง build ก่อน)
yarn build
yarn start:prod
```

---

## การรัน Unit Tests

### รันทุก Unit Tests

```bash
yarn test
```

### Watch Mode (auto-rerun เมื่อไฟล์เปลี่ยน)

```bash
yarn test:watch
```

### Coverage Report

```bash
yarn test:cov
```
รายงาน coverage จะอยู่ที่โฟลเดอร์ `coverage/`

### E2E Tests

```bash
yarn test:e2e
```

### ไฟล์ Unit Tests

| File | Tests |
|------|-------|
| `src/modules/auth/auth.service.spec.ts` | Register, Login logic |
| `src/modules/events/events.service.spec.ts` | Event CRUD, seat listing |
| `src/modules/bookings/bookings.service.spec.ts` | Booking creation, cancellation |

### ตัวอย่าง Output

```
PASS  src/modules/auth/auth.service.spec.ts
PASS  src/modules/events/events.service.spec.ts
PASS  src/modules/bookings/bookings.service.spec.ts

Test Suites: 3 passed, 3 total
Tests:       12 passed, 12 total
```

---

## API Endpoints

Base URL: `http://localhost:3002/api`

> ดูรายละเอียด request/response ครบถ้วนได้ที่ Swagger: **http://localhost:3002/api/docs**

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/register` | — | สมัครสมาชิก |
| `POST` | `/auth/login` | — | เข้าสู่ระบบ (คืน JWT cookie) |
| `POST` | `/auth/logout` | JWT | ออกจากระบบ (ล้าง cookie) |
| `GET` | `/auth/me` | JWT | ข้อมูล user ปัจจุบัน |

### Events

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/events` | — | รายการ events (pagination + search) |
| `GET` | `/events/:id` | — | รายละเอียด event |
| `GET` | `/events/:id/seats` | JWT | ที่นั่งว่างของ event |
| `POST` | `/events` | JWT | สร้าง event ใหม่ |
| `PATCH` | `/events/:id` | JWT | แก้ไข event |
| `DELETE` | `/events/:id` | JWT | ลบ event |

### Bookings

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/bookings` | JWT | จองที่นั่ง |
| `GET` | `/bookings` | JWT | รายการการจอง (admin เห็นทั้งหมด) |
| `GET` | `/bookings/:id` | JWT | รายละเอียดการจอง |
| `PATCH` | `/bookings/:id/cancel` | JWT | ยกเลิกการจอง |

### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/users` | JWT | รายการ users ทั้งหมด |
| `GET` | `/users/:id` | JWT | ข้อมูล user |
| `PATCH` | `/users/:id` | JWT | แก้ไข user |
| `DELETE` | `/users/:id` | JWT | ลบ user |

---

## Database Scripts

```bash
yarn db:create    # สร้าง database
yarn db:push      # push schema ไปยัง DB (ไม่ผ่าน migration)
yarn db:seed      # ใส่ข้อมูลตัวอย่าง
yarn db:reset     # ล้างตารางทั้งหมด (ระวัง: ลบข้อมูลทั้งหมด)
yarn db:dev       # db:create + db:push + db:seed
yarn gen-db       # สร้าง migration files
yarn db:studio    # เปิด Drizzle Studio (GUI สำหรับดู database)
```
