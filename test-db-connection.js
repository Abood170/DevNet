// Simple script to test database connection
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL is not set in .env file');
  console.log('\nPlease create a .env file with:');
  console.log('DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/devshare');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

console.log('🔄 Testing database connection...');
console.log('Connection string:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')); // Hide password

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Connection FAILED!');
    console.error('\nError details:', err.message);
    console.log('\n💡 Common fixes:');
    console.log('1. Check if PostgreSQL is running');
    console.log('2. Verify your password in .env file');
    console.log('3. Make sure the database exists');
    console.log('4. Check if host/port are correct');
    process.exit(1);
  } else {
    console.log('✅ Connection SUCCESSFUL!');
    console.log('Database time:', res.rows[0].now);
    pool.end();
    process.exit(0);
  }
});

