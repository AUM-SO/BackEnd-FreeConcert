import { drizzle } from 'drizzle-orm/mysql2';
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import { users, events, seats } from './schema';

dotenv.config();

async function seed() {
  console.log('🌱 Starting database seeding...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'freeconcert',
  });

  const db = drizzle(connection);

  try {
    // 1. Create Users
    console.log('👤 Creating users...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    await db.insert(users).values([
      {
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin',
        avatar: 'https://ui-avatars.com/api/?name=Admin+User',
      },
      {
        email: 'user1@example.com',
        password: hashedPassword,
        name: 'John Doe',
        role: 'user',
        avatar: 'https://ui-avatars.com/api/?name=John+Doe',
      },
      {
        email: 'user2@example.com',
        password: hashedPassword,
        name: 'Jane Smith',
        role: 'user',
        avatar: 'https://ui-avatars.com/api/?name=Jane+Smith',
      },
    ]);
    console.log('✅ Users created');

    // 2. Create Events
    console.log('🎵 Creating events...');

    await db.insert(events).values([
      {
        title: 'Summer Rock Festival 2026',
        description:
          'The biggest rock festival of the year featuring international and local bands',
        imageUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3',
        totalSeats: 100,
        availableSeats: 100,
        status: 'published',
      },
      {
        title: 'Jazz Night Under Stars',
        description: 'Relaxing evening of smooth jazz by the riverside',
        imageUrl: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4',
        totalSeats: 80,
        availableSeats: 80,
        status: 'published',
      },
      {
        title: 'Acoustic Sunset Session',
        description: 'Intimate acoustic performance with city skyline views',
        imageUrl: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14',
        totalSeats: 50,
        availableSeats: 50,
        status: 'published',
      },
    ]);
    console.log('✅ Events created');

    // 3. Create Seats
    console.log('💺 Creating seats...');
    const seatsData: Array<{
      eventId: number;
      section: string;
      row: string;
      number: string;
      status: string;
    }> = [];

    // Event 1: 100 seats (VIP: 20, Section A: 40, Section B: 40)
    for (let i = 1; i <= 20; i++) {
      seatsData.push({
        eventId: 1,
        section: 'VIP',
        row: String(Math.ceil(i / 10)),
        number: String(i),
        status: 'available',
      });
    }
    for (let i = 1; i <= 40; i++) {
      seatsData.push({
        eventId: 1,
        section: 'A',
        row: String(Math.ceil(i / 10)),
        number: String(i),
        status: 'available',
      });
    }
    for (let i = 1; i <= 40; i++) {
      seatsData.push({
        eventId: 1,
        section: 'B',
        row: String(Math.ceil(i / 10)),
        number: String(i),
        status: 'available',
      });
    }

    // Event 2: 80 seats (Section A: 40, Section B: 40)
    for (let i = 1; i <= 40; i++) {
      seatsData.push({
        eventId: 2,
        section: 'A',
        row: String(Math.ceil(i / 10)),
        number: String(i),
        status: 'available',
      });
    }
    for (let i = 1; i <= 40; i++) {
      seatsData.push({
        eventId: 2,
        section: 'B',
        row: String(Math.ceil(i / 10)),
        number: String(i),
        status: 'available',
      });
    }

    // Event 3: 50 seats (General: 50)
    for (let i = 1; i <= 50; i++) {
      seatsData.push({
        eventId: 3,
        section: 'General',
        row: String(Math.ceil(i / 10)),
        number: String(i),
        status: 'available',
      });
    }

    await db.insert(seats).values(seatsData);
    console.log(`✅ Created ${seatsData.length} seats`);

    console.log('🎉 Seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- 3 Users (1 admin, 2 regular users)');
    console.log('- 3 Events');
    console.log(`- ${seatsData.length} Seats`);
    console.log('\n🔑 Test Credentials:');
    console.log('Admin: admin@example.com / password123');
    console.log('User1: user1@example.com / password123');
    console.log('User2: user2@example.com / password123');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seed();
