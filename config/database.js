import mysql from 'mysql2/promise';
import { config } from 'dotenv';
config();

let pool;

// Check if we're in production (Railway) with DATABASE_URL
if (process.env.DATABASE_URL) {
  console.log('🌐 Using Railway DATABASE_URL');
  
  try {
    // Parse the DATABASE_URL (format: mysql://user:pass@host:port/dbname)
    const url = new URL(process.env.DATABASE_URL);
    
    // Extract connection details
    const connectionConfig = {
      host: url.hostname,
      port: url.port || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.substring(1), // Remove leading slash
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: {
        rejectUnauthorized: false // Railway requires SSL
      }
    };
    
    console.log('📊 Railway Database Config:', {
      host: connectionConfig.host,
      port: connectionConfig.port,
      database: connectionConfig.database,
      user: connectionConfig.user.substring(0, 3) + '...' // Hide full username for security
    });
    
    pool = mysql.createPool(connectionConfig);
    
  } catch (error) {
    console.error('❌ Failed to parse DATABASE_URL:', error.message);
    console.log('⚠️ Falling back to individual DB config...');
    
    // Fallback to individual config
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'career_guidance',
      port: process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
} else {
  // Local development with individual config
  console.log('💻 Using local database configuration');
  
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'career_guidance',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
  
  console.log('📊 Local Database Config:', {
    host: dbConfig.host,
    database: dbConfig.database
  });
  
  pool = mysql.createPool(dbConfig);
}

// Test database connection
export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    
    // Test with a simple query
    const [rows] = await connection.query('SELECT 1 + 1 AS result');
    console.log(`📊 Database test query result: ${rows[0].result}`);
    
    // Get database info
    const [dbInfo] = await connection.query('SELECT DATABASE() as db, USER() as user');
    console.log(`📁 Database: ${dbInfo[0].db}`);
    console.log(`👤 Connected as: ${dbInfo[0].user.split('@')[0]}...`);
    
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('🔧 Check your database configuration:');
    console.error('   - Is the database server running?');
    console.error('   - Are credentials correct?');
    console.error('   - For Railway: Check DATABASE_URL variable');
    
    if (process.env.DATABASE_URL) {
      console.error('   - DATABASE_URL format should be: mysql://user:password@host:port/database');
    }
    
    // Don't exit in production, let the app try to reconnect
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️ Continuing in production mode, database will retry...');
      return false;
    } else {
      process.exit(1);
    }
  }
};

export { pool };