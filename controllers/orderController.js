import db from '../db/connection.js';

export const getOrders = (req, res) => {
  console.log('🔍 Attempting to fetch orders from database...');
  
  db.query('SELECT * FROM orders', (err, results) => {
    if (err) {
      console.error('❌ Database query error:', err);
      console.error('❌ Error code:', err.code);
      console.error('❌ Error message:', err.sqlMessage);
      return res.status(500).json({ 
        success: false, 
        error: 'Database error',
        details: err.message 
      });
    }
    console.log(`✅ Successfully fetched ${results.length} orders`);
    res.json({ success: true, data: results });
  });
};

export const createOrder = (req, res) => {
  const { order_id, customer_name, product, quantity, order_date, status } = req.body;
  
  // Validate required fields
  if (!order_id || !customer_name || !product) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: order_id, customer_name, product' 
    });
  }

  const sql = 'INSERT INTO orders (order_id, customer_name, product, quantity, order_date, status) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(sql, [order_id, customer_name, product, quantity, order_date, status], (err, result) => {
    if (err) {
      console.error('Create order error:', err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ success: false, error: 'Order ID already exists' });
      }
      return res.status(500).json({ success: false, error: 'Failed to create order' });
    }
    res.json({ success: true, message: 'Order added', data: { id: result.insertId } });
  });
};

export const updateOrder = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!status) {
    return res.status(400).json({ success: false, error: 'Status is required' });
  }

  // Use order_id instead of id if that's your primary key
  db.query('UPDATE orders SET status = ? WHERE order_id = ?', [status, id], (err, result) => {
    if (err) {
      console.error('Update order error:', err);
      return res.status(500).json({ success: false, error: 'Failed to update order' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    res.json({ success: true, message: 'Order updated' });
  });
};

export const deleteOrder = (req, res) => {
  const { id } = req.params;
  
  // Use order_id instead of id if that's your primary key
  db.query('DELETE FROM orders WHERE order_id = ?', [id], (err, result) => {
    if (err) {
      console.error('Delete order error:', err);
      return res.status(500).json({ success: false, error: 'Failed to delete order' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    res.json({ success: true, message: 'Order deleted' });
  });
};