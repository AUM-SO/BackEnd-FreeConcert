# Database Schema Documentation

## Overview
ระบบจองตั๋วคอนเสิร์ตฟรี (Free Concert Tickets System) ประกอบด้วย 5 ตารางหลัก

## Tables

### 1. Users (ผู้ใช้งาน)
จัดเก็บข้อมูลผู้ใช้งานระบบ

| Column      | Type          | Description                    |
|-------------|---------------|--------------------------------|
| id          | INT           | Primary Key (Auto Increment)   |
| email       | VARCHAR(255)  | Email (Unique)                 |
| password    | VARCHAR(255)  | Password (Hashed với bcrypt)   |
| name        | VARCHAR(255)  | ชื่อผู้ใช้                     |
| role        | VARCHAR(50)   | บทบาท (user/admin) default: user |
| avatar      | TEXT          | URL รูปโปรไฟล์                |
| created_at  | TIMESTAMP     | วันที่สร้าง                   |
| updated_at  | TIMESTAMP     | วันที่อัพเดท                  |

**Relations:**
- `1:N` → Bookings

---

### 2. Venues (สถานที่จัดงาน)
จัดเก็บข้อมูลสถานที่จัดคอนเสิร์ต

| Column      | Type          | Description                    |
|-------------|---------------|--------------------------------|
| id          | INT           | Primary Key (Auto Increment)   |
| name        | VARCHAR(255)  | ชื่อสถานที่                    |
| address     | TEXT          | ที่อยู่                        |
| city        | VARCHAR(100)  | เมือง                         |
| capacity    | INT           | จำนวนที่นั่งทั้งหมด            |
| description | TEXT          | รายละเอียด (Optional)          |
| image_url   | TEXT          | URL รูปภาพ (Optional)          |
| created_at  | TIMESTAMP     | วันที่สร้าง                   |
| updated_at  | TIMESTAMP     | วันที่อัพเดท                  |

**Relations:**
- `1:N` → Events
- `1:N` → Seats

---

### 3. Events (กิจกรรมคอนเสิร์ต)
จัดเก็บข้อมูลงานคอนเสิร์ต

| Column          | Type          | Description                    |
|-----------------|---------------|--------------------------------|
| id              | INT           | Primary Key (Auto Increment)   |
| title           | VARCHAR(255)  | ชื่อกิจกรรม                   |
| description     | TEXT          | รายละเอียด (Optional)          |
| image_url       | TEXT          | URL รูปภาพ (Optional)          |
| start_date      | TIMESTAMP     | วันเวลาเริ่มต้น               |
| end_date        | TIMESTAMP     | วันเวลาสิ้นสุด                |
| venue_id        | INT           | FK → venues.id                 |
| total_seats     | INT           | จำนวนที่นั่งทั้งหมด default: 0  |
| available_seats | INT           | จำนวนที่นั่งที่เหลือ default: 0 |
| status          | VARCHAR(50)   | สถานะ (draft/published/cancelled) default: draft |
| created_at      | TIMESTAMP     | วันที่สร้าง                   |
| updated_at      | TIMESTAMP     | วันที่อัพเดท                  |

**Relations:**
- `N:1` → Venue
- `1:N` → Seats
- `1:N` → Bookings

---

### 4. Seats (ที่นั่ง)
จัดเก็บข้อมูลที่นั่งในแต่ละงาน

| Column     | Type          | Description                    |
|------------|---------------|--------------------------------|
| id         | INT           | Primary Key (Auto Increment)   |
| venue_id   | INT           | FK → venues.id                 |
| event_id   | INT           | FK → events.id                 |
| section    | VARCHAR(50)   | โซน/ส่วน (เช่น VIP, A, B)     |
| row        | VARCHAR(10)   | แถว (เช่น 1, 2, A, B)          |
| number     | VARCHAR(10)   | หมายเลขที่นั่ง                |
| status     | VARCHAR(50)   | available/booked/reserved default: available |
| created_at | TIMESTAMP     | วันที่สร้าง                   |
| updated_at | TIMESTAMP     | วันที่อัพเดท                  |

**Relations:**
- `N:1` → Venue
- `N:1` → Event
- `1:N` → Bookings

**Status Values:**
- `available` - ที่นั่งว่าง
- `booked` - ถูกจองแล้ว
- `reserved` - สำรองไว้ (ชั่วคราว)

---

### 5. Bookings (การจอง)
จัดเก็บข้อมูลการจองตั๋ว

| Column       | Type          | Description                    |
|--------------|---------------|--------------------------------|
| id           | INT           | Primary Key (Auto Increment)   |
| user_id      | INT           | FK → users.id                  |
| event_id     | INT           | FK → events.id                 |
| seat_id      | INT           | FK → seats.id                  |
| status       | VARCHAR(50)   | pending/confirmed/cancelled default: pending |
| booking_code | VARCHAR(100)  | รหัสการจอง (Unique)            |
| created_at   | TIMESTAMP     | วันที่สร้าง                   |
| updated_at   | TIMESTAMP     | วันที่อัพเดท                  |

**Relations:**
- `N:1` → User
- `N:1` → Event
- `N:1` → Seat

**Status Values:**
- `pending` - รอการยืนยัน
- `confirmed` - ยืนยันแล้ว
- `cancelled` - ยกเลิก

---

## Entity Relationship Diagram

```
┌─────────┐
│  Users  │
└────┬────┘
     │
     │ 1:N
     │
┌────▼────────┐
│  Bookings   │
└────┬────┬───┘
     │    │
     │    │ N:1
     │    └──────────┐
     │               │
     │ N:1       ┌───▼───┐
     │           │ Seats │◄────┐
     │           └───┬───┘     │
     │               │         │
     │ N:1           │ N:1     │ 1:N
     │               │         │
┌────▼────┐      ┌───▼────┐   │
│ Events  │──────│ Venues │───┘
└─────────┘ N:1  └────────┘ 1:N
```

## Indexes

### Automatic Indexes
- Primary Keys: All tables have auto-increment primary keys
- Unique Constraints:
  - `users.email`
  - `bookings.booking_code`

### Foreign Keys with Indexes
- `bookings.user_id` → `users.id`
- `bookings.event_id` → `events.id`
- `bookings.seat_id` → `seats.id`
- `events.venue_id` → `venues.id`
- `seats.venue_id` → `venues.id`
- `seats.event_id` → `events.id`

## Character Set
- **Database:** `utf8mb4`
- **Collation:** `utf8mb4_unicode_ci`

## Migration Commands

```bash
# Generate migration files
yarn db:generate

# Push schema to database (Development)
yarn db:push

# Run migrations (Production)
yarn db:migrate

# Open Drizzle Studio
yarn db:studio
```

## Notes

1. **Timestamps:** ทุกตารางมี `created_at` และ `updated_at` ที่อัพเดทอัตโนมัติ
2. **Foreign Keys:** ใช้ `ON DELETE no action` และ `ON UPDATE no action` เพื่อป้องกันการลบข้อมูลที่มีความสัมพันธ์
3. **Status Fields:** ใช้ varchar แทน enum เพื่อความยืดหยุ่นในการเพิ่มค่าใหม่
4. **Booking Code:** Generate แบบ random ด้วย crypto module (รูปแบบ: `BK-XXXXXXXXXXXX`)

## Sample Data Flow

### การจองตั๋ว (Booking Flow)
1. ผู้ใช้เลือก Event ที่ต้องการ
2. ระบบแสดง Seats ที่ว่าง (status = 'available')
3. ผู้ใช้เลือก Seat
4. ระบบสร้าง Booking พร้อม booking_code
5. อัพเดท Seat status เป็น 'booked'
6. ลด Event.available_seats ลง 1

### การยกเลิกการจอง (Cancel Flow)
1. ผู้ใช้เลือก Booking ที่ต้องการยกเลิก
2. ตรวจสอบ booking.user_id ตรงกับผู้ใช้
3. อัพเดท Booking status เป็น 'cancelled'
4. อัพเดท Seat status เป็น 'available'
5. เพิ่ม Event.available_seats ขึ้น 1

---

**Last Updated:** February 16, 2026
