/**
 * Hearst Mining Architect - Backend Server
 * Bitcoin Mining Farm Design and Management Tool
 * 
 * @version 1.0.0
 * @author Hearst Team
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const routes = require('./routes');
const { initializeFirebase } = require('./config/firebase');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3006;

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',') 
    : ['http://localhost:3106', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Compression
app.use(compression());

// Request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
  app.use(logger.requestLogger);
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hearst-mining-architect',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hearst-mining-architect-api',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// API ROUTES
// ============================================

app.use('/api', routes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    availableEndpoints: [
      'GET /health',
      'GET /api',
      'GET /api/machines',
      'POST /api/calculator/profitability',
      'GET /api/network/stats',
      'GET /api/farms',
      'GET /api/monitoring/:farmId/summary'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// SERVER STARTUP
// ============================================

const startServer = async () => {
  try {
    // Initialize Firebase
    const { mockMode } = initializeFirebase();
    
    if (mockMode) {
      logger.warn('⚠️ Running in MOCK MODE - Firebase not connected');
      logger.info('   Configure .env with Firebase credentials for persistence');
    }

    // Start server
    app.listen(PORT, () => {
      console.log('');
      console.log('╔═══════════════════════════════════════════════════════╗');
      console.log('║                                                       ║');
      console.log('║   🏭 HEARST MINING ARCHITECT                         ║');
      console.log('║   Bitcoin Mining Farm Design Tool                     ║');
      console.log('║                                                       ║');
      console.log(`║   🚀 Server running on port ${PORT}                      ║`);
      console.log('║                                                       ║');
      console.log('╠═══════════════════════════════════════════════════════╣');
      console.log('║   Endpoints:                                          ║');
      console.log('║   • /health          - Health check                   ║');
      console.log('║   • /api             - API info                       ║');
      console.log('║   • /api/machines    - ASIC catalog                   ║');
      console.log('║   • /api/calculator  - Profitability                  ║');
      console.log('║   • /api/farms       - Farm management                ║');
      console.log('║   • /api/monitoring  - Real-time data                 ║');
      console.log('║   • /api/network     - BTC network stats              ║');
      console.log('╚═══════════════════════════════════════════════════════╝');
      console.log('');
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
};

startServer();

module.exports = app;
