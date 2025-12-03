import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from 'dotenv';
config();

import { testConnection } from './config/database.js';

// Import all routes
import authRoutes from './routes/auth.js';
import instituteRoutes from './routes/institutes.js';
import studentRoutes from './routes/students.js';
import applicationRoutes from './routes/applications.js';
import adminRoutes from './routes/admin.js';

const app = express();

// Get Railway URL or use localhost
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const RAILWAY_PUBLIC_DOMAIN = process.env.RAILWAY_PUBLIC_DOMAIN;
const RAILWAY_STATIC_URL = process.env.RAILWAY_STATIC_URL;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Configure CORS for Railway
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5174', 
  'http://localhost:5173', 
  'http://127.0.0.1:5174',  
  'http://127.0.0.1:5173'
];

// Add Railway domains if they exist
if (RAILWAY_PUBLIC_DOMAIN) {
  allowedOrigins.push(`https://${RAILWAY_PUBLIC_DOMAIN}`);
  allowedOrigins.push(`http://${RAILWAY_PUBLIC_DOMAIN}`);
}

if (RAILWAY_STATIC_URL) {
  allowedOrigins.push(RAILWAY_STATIC_URL);
}

if (FRONTEND_URL && !allowedOrigins.includes(FRONTEND_URL)) {
  allowedOrigins.push(FRONTEND_URL);
}

console.log('🌐 Allowed CORS origins:', allowedOrigins);

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      console.warn('CORS blocked origin:', origin);
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'Accept']
}));

// Handle preflight requests
app.options('*', cors());

app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Test database connection on startup
testConnection();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/institutes', instituteRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);

// Health check route (important for Railway)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Career Guidance API is running',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    railway: !!RAILWAY_PUBLIC_DOMAIN,
    version: '1.0.0'
  });
});

// Test route
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true,
    message: 'All routes are working!',
    data: { 
      version: '1.0.0',
      environment: NODE_ENV,
      railway_public_domain: RAILWAY_PUBLIC_DOMAIN || 'Not set',
      routes: ['auth', 'institutes', 'students', 'applications', 'admin']
    }
  });
});

// Root route for Railway health checks
app.get('/', (req, res) => {
  res.json({
    message: 'Career Guidance Platform API',
    status: 'operational',
    version: '1.0.0',
    documentation: '/api/health',
    environment: NODE_ENV
  });
});

// Simple 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  // MySQL duplicate entry error
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry found'
    });
  }
  
  // MySQL connection errors
  if (error.code === 'ECONNREFUSED' || error.code === 'PROTOCOL_CONNECTION_LOST') {
    return res.status(503).json({
      success: false,
      message: 'Database connection error'
    });
  }

  // CORS errors
  if (error.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: 'CORS error: Origin not allowed'
    });
  }

  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(NODE_ENV === 'development' && { stack: error.stack })
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 Career Guidance Platform API`);
  console.log(`🔗 Environment: ${NODE_ENV}`);
  console.log(`🌐 Railway Public Domain: ${RAILWAY_PUBLIC_DOMAIN || 'Not set'}`);
  console.log(`🔗 Frontend URL: ${FRONTEND_URL}`);
  console.log(`📍 Host: 0.0.0.0 (Railway compatible)`);
  console.log(' Available Routes:');
  console.log('   GET    /               - API Root');
  console.log('   GET    /api/health     - Health check');
  console.log('   GET    /api/test       - Test endpoint');
  console.log('   POST   /api/auth/register');
  console.log('   POST   /api/auth/login');
  console.log('   GET    /api/auth/me');
  console.log('   GET    /api/institutes');
  console.log('   GET    /api/institutes/:id');
  console.log('   GET    /api/students/profile');
  console.log('   POST   /api/applications/apply');
  console.log('   GET    /api/admin/stats');
  console.log(' Test the server:');
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Root: http://localhost:${PORT}/`);
});