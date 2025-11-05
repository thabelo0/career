import db from '../db/connection.js';

const initializeDatabase = () => {
  console.log('🚀 Initializing database tables...');
  
  const queries = [
    `CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id VARCHAR(50) UNIQUE NOT NULL,
      customer_name VARCHAR(100) NOT NULL,
      product VARCHAR(100) NOT NULL,
      quantity INT DEFAULT 1,
      order_date DATE,
      status ENUM('Pending', 'Completed', 'Cancelled') DEFAULT 'Pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `INSERT IGNORE INTO orders (order_id, customer_name, product, quantity, order_date, status) VALUES
      ('ORD001', 'John Doe', 'Chocolate Cake', 2, CURDATE(), 'Pending'),
      ('ORD002', 'Jane Smith', 'Blueberry Muffin', 6, CURDATE(), 'Completed'),
      ('ORD003', 'Mike Johnson', 'Croissant', 12, CURDATE(), 'Pending')`
  ];

  queries.forEach((query, index) => {
    db.query(query, (err, results) => {
      if (err) {
        console.error(`❌ Query ${index + 1} failed:`, err);
      } else {
        console.log(`✅ Query ${index + 1} executed successfully`);
      }
    });
  });
};

// Run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase();
  setTimeout(() => process.exit(0), 2000);
}

export default initializeDatabase;