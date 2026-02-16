import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function resetDatabase() {
  console.log('⚠️  WARNING: This will DROP ALL TABLES in the database!');
  console.log(`Database: ${process.env.DB_NAME || 'freeconcert'}`);

  const answer = await question('\nAre you sure? Type "yes" to continue: ');

  if (answer.toLowerCase() !== 'yes') {
    console.log('❌ Operation cancelled.');
    rl.close();
    process.exit(0);
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'freeconcert',
    multipleStatements: true,
  });

  try {
    console.log('\n🗑️  Dropping all tables...');

    // Disable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');

    // Get all tables
    const [tables]: any = await connection.query('SHOW TABLES;');
    const tableNames = tables.map((row: any) => Object.values(row)[0]);

    if (tableNames.length === 0) {
      console.log('ℹ️  No tables found.');
    } else {
      // Drop each table
      for (const tableName of tableNames) {
        await connection.query(`DROP TABLE IF EXISTS \`${tableName}\`;`);
        console.log(`  ✓ Dropped table: ${tableName}`);
      }
    }

    // Re-enable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

    console.log('\n✅ Database reset completed!');
    console.log('\n💡 Next steps:');
    console.log('   1. Run: yarn db:push    (to create tables)');
    console.log('   2. Run: yarn db:seed    (to add sample data)');
    console.log('   Or run: yarn db:dev     (to do both)');
  } catch (error) {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  } finally {
    await connection.end();
    rl.close();
  }
}

resetDatabase();
