# Database Management Guide

## 🛠️ Available Commands

### Development Mode (Recommended)
```bash
# Push schema changes to database (no migration files)
yarn db:push

# Add sample data
yarn db:seed

# Setup dev database (push + seed)
yarn db:dev

# Open Drizzle Studio (Database GUI)
yarn db:studio
```

### Production Mode (Using Migrations)
```bash
# Generate migration files from schema changes
yarn db:generate

# Apply migrations to database
yarn db:migrate
```

### Database Reset
```bash
# Drop all tables (will ask for confirmation)
yarn db:reset

# Then setup again
yarn db:dev
```

---

## 📋 Workflow

### For Development (แนะนำ)
1. **แก้ไข schema** ใน `src/database/schema/*.ts`
2. **Push changes:**
   ```bash
   yarn db:push
   ```
3. **Add test data** (optional):
   ```bash
   yarn db:seed
   ```

### For Production
1. **แก้ไข schema** ใน `src/database/schema/*.ts`
2. **Generate migration:**
   ```bash
   yarn db:generate
   ```
3. **Review migration** ใน `src/database/migrations/`
4. **Apply migration:**
   ```bash
   yarn db:migrate
   ```

---

## ⚠️ Common Issues

### Error: "Table already exists"
**สาเหตุ:** ตารางมีอยู่แล้วในฐานข้อมูล

**วิธีแก้:**
```bash
# Option 1: ใช้ db:push แทน migrate (จะ sync ให้อัตโนมัติ)
yarn db:push

# Option 2: Reset database แล้วเริ่มใหม่
yarn db:reset
yarn db:dev
```

### Starting Fresh
```bash
# 1. Reset database
yarn db:reset

# 2. Push schema
yarn db:push

# 3. Seed data
yarn db:seed

# หรือรวมเป็นคำสั่งเดียว (ขั้นที่ 2-3)
yarn db:dev
```

---

## 🔄 Migration vs Push

| Feature | `db:push` | `db:migrate` |
|---------|-----------|--------------|
| Use Case | Development | Production |
| Migration Files | ❌ No | ✅ Yes |
| Version Control | ❌ No | ✅ Yes |
| Rollback Support | ❌ No | ✅ Yes |
| Speed | ⚡ Fast | 🐌 Slower |
| Recommended for | Local dev | Staging/Production |

---

## 🎯 Best Practices

1. **ใช้ `db:push` ในการพัฒนา** - เร็วและไม่ซับซ้อน
2. **ใช้ `db:migrate` ใน production** - ติดตามการเปลี่ยนแปลงได้
3. **Commit migration files** - เพื่อให้ทีมใช้งานร่วมกัน
4. **ห้ามแก้ migration files** - สร้างใหม่แทน
5. **Backup database ก่อน migrate** - เผื่อเกิดปัญหา

---

## 📁 File Structure

```
src/database/
├── schema/              # Schema definitions
│   ├── users.schema.ts
│   ├── events.schema.ts
│   ├── venues.schema.ts
│   ├── seats.schema.ts
│   ├── bookings.schema.ts
│   ├── relations.ts
│   └── index.ts
├── migrations/          # Generated migration files
│   └── 0000_*.sql
├── drizzle.module.ts    # Drizzle module
├── drizzle.provider.ts  # Database connection
├── seed.ts              # Seed data script
├── reset.ts             # Reset database script
└── migrate.ts           # Migration runner (optional)
```

---

## 🔑 Environment Variables

Make sure `.env` file has these variables:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=freeconcert
```

---

## 🚀 Quick Start

### First Time Setup
```bash
# 1. Install dependencies
yarn install

# 2. Create database (or it will be created automatically)
# 3. Setup schema and seed data
yarn db:dev

# 4. Start server
yarn dev
```

### After Schema Changes
```bash
# Push changes to database
yarn db:push

# Or if you want to generate migration
yarn db:generate
```

---

## 💡 Tips

- Use `yarn db:studio` to visually browse and edit data
- Run `yarn db:reset` to start fresh anytime
- Check `DATABASE_SCHEMA.md` for ER diagram and documentation
- Seed data includes test credentials (see console output)

---

**Need help?** Check `DATABASE_SCHEMA.md` for detailed schema documentation.
