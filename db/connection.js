import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔌 Connecting to database...');
console.log('📋 Database config:', {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  connectTimeout: 60000,
  // Remove unsupported options
});

db.connect(err => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('💡 Check Railway environment variables');
  } else {
    console.log('✅ Connected to MySQL database on Railway');
  }
});

db.on('error', (err) => {
  console.error('📊 Database error:', err);
});

export default db;