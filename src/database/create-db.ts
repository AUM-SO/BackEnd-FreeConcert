import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function createDatabase() {
  const dbName = process.env.DB_NAME || 'freeconcert';

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
    );
    console.log(`✅ Database '${dbName}' is ready.`);
  } catch (error) {
    console.error('❌ Failed to create database:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

createDatabase();
