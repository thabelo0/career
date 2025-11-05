import express from 'express';
import cors from 'cors';
import ordersRouter from './routes/orders.js';
import db from './db/connection.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database tables
const initializeDatabase = async () => {
  return new Promise((resolve, reject) => {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id VARCHAR(50) UNIQUE NOT NULL,
        customer_name VARCHAR(100) NOT NULL,
        product VARCHAR(100) NOT NULL,
        quantity INT DEFAULT 1,
        order_date DATE,
        status ENUM('Pending', 'Completed', 'Cancelled') DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    db.query(createTableSQL, (err, results) => {
      if (err) {
        console.error('❌ Error creating tables:', err);
        reject(err);
      } else {
        console.log('✅ Database tables initialized/verified');
        resolve(results);
      }
    });
  });
};

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Bakery Orders API is running!',
    endpoints: {
      orders: '/api/orders'
    }
  });
});

// Routes
app.use('/api/orders', ordersRouter);

const PORT = process.env.PORT || 4000;

// Initialize database and start server
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Database tables ready`);
    });
  })
  .catch(err => {
    console.error('❌ Failed to initialize database:', err);
    process.exit(1);
  });