import express from 'express';
import cors from 'cors';
import ordersRouter from './routes/orders.js';
import db from './db/connection.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database tables
const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    console.log('🔧 Initializing database tables...');
    
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    db.query(createTableSQL, (err, results) => {
      if (err) {
        console.error('❌ Error creating orders table:', err);
        reject(err);
      } else {
        console.log('✅ Orders table initialized/verified');
        
        // Insert sample data
        const insertSampleData = `
          INSERT IGNORE INTO orders (order_id, customer_name, product, quantity, order_date, status) VALUES
          ('ORD001', 'John Doe', 'Chocolate Cake', 2, CURDATE(), 'Pending'),
          ('ORD002', 'Jane Smith', 'Blueberry Muffin', 6, CURDATE(), 'Completed'),
          ('ORD003', 'Mike Johnson', 'Croissant', 12, CURDATE(), 'Pending')
        `;
        
        db.query(insertSampleData, (insertErr) => {
          if (insertErr) {
            console.log('ℹ️ Sample data already exists or insertion skipped');
          } else {
            console.log('✅ Sample data inserted');
          }
          resolve(results);
        });
      }
    });
  });
};

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Bakery Orders API is running!',
    endpoints: {
      orders: '/api/orders'
    }
  });
});

app.use('/api/orders', ordersRouter);

const PORT = process.env.PORT || 4000;

// Initialize database and start server
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Database tables ready`);
      console.log(`🌐 API available at: http://localhost:${PORT}/api/orders`);
    });
  })
  .catch(err => {
    console.error('❌ Failed to initialize database:', err);
    console.log('🔄 Starting server anyway...');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} (database may have issues)`);
    });
  });