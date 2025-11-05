import express from 'express';
import cors from 'cors';
import ordersRouter from './routes/orders.js';
import initializeDatabase from './scripts/deploy-init.js';

const app = express();

app.use(cors());
app.use(express.json());

// Initialize database on startup
initializeDatabase();

app.get('/', (req, res) => {
  res.json({ message: 'Bakery API Running' });
});

app.use('/api/orders', ordersRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));