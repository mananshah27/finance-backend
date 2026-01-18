const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import routes
const userRoutes = require('./routes/users');
const accountRoutes = require('./routes/accounts');
const categoryRoutes = require('./routes/categories');
const transactionRoutes = require('./routes/transactions');

const app = express();

// CORS Configuration - UPDATED FOR VERCEL
app.use(cors({
  origin: [
    'http://localhost:5173',                    // Local frontend
    'http://localhost:3000',                    // Local backend  
    'https://finance-frontend-drab.vercel.app', // Your Vercel frontend
    'https://finance-frontend-*.vercel.app',    // All Vercel deployments
    'https://*.vercel.app'                      // Any Vercel app
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('✅ MongoDB connected successfully'))
.catch((err) => {
  console.error('❌ MongoDB connection error:', err.message);
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Default route
app.get('/', (req, res) => {
  res.json({
    message: 'Finance Tracker API',
    version: '1.0.0',
    endpoints: {
      users: '/api/users',
      accounts: '/api/accounts',
      categories: '/api/categories',
      transactions: '/api/transactions'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Invalid token'
    });
  }

  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`🎯 Allowed origins: Localhost & Vercel`);
});