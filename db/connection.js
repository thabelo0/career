import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔌 Creating database connection pool...');
console.log('📋 Database config:', {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

// Use connection pool instead of single connection
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
});

// Test the connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('💡 Check Railway environment variables');
  } else {
    console.log('✅ Connected to MySQL database on Railway');
    connection.release(); // Release the connection back to the pool
  }
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('📊 Database pool error:', err);
});

export default pool;