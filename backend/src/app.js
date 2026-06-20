import express from 'express';
import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { cleanupExpiredTokens } from './controller/tokencontroller.js';

//MiddleWares
import { checktoken } from './middleware/checktoken.js';
import { checkApproved } from './middleware/rbac.js';

//Routes
import authRoutes from './routes/auth.js';
import productionRoutes from './routes/production.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ================================================================
// SECURITY MIDDLEWARE
// ================================================================

// Helmet helps secure Express apps by setting various HTTP headers
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Cookie parser middleware
app.use(cookieParser());

// ================================================================
// REQUEST LOGGING MIDDLEWARE (Optional)
// ================================================================
if (process.env.ENABLE_REQUEST_LOGGING === 'true') {
    app.use((req, res, next) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${req.method} ${req.path}`);
        next();
    });
}

// ================================================================
// PUBLIC ROUTES (No authentication required)
// ================================================================

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Authentication routes (login, register, refresh, logout, etc.)
app.use('/api/auth', authRoutes);

// ================================================================
// PROTECTED ROUTES (Authentication + Approval required)
// ================================================================

// Apply authentication check to all routes below this line
app.use(checktoken);

// Apply approval check to ensure only approved users can access
app.use(checkApproved);

// Production pipeline routes
app.use('/api/production', productionRoutes);

// Example protected routes (add your business logic routes here)
// app.use('/api/fabrics', fabricRoutes);
// app.use('/api/dashboard', dashboardRoutes);

// ================================================================
// ERROR HANDLING MIDDLEWARE
// ================================================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.path
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { error: err.stack })
    });
});

// ================================================================
// SERVER INITIALIZATION
// ================================================================

const server = app.listen(PORT, () => {
    console.log(`🚀 TextileERP Backend running on http://localhost:${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// ================================================================
// SCHEDULED TASKS
// ================================================================

// Cleanup expired tokens every hour
if (process.env.ENABLE_TOKEN_CLEANUP !== 'false') {
    const CLEANUP_INTERVAL = parseInt(process.env.TOKEN_CLEANUP_INTERVAL_MS) || 3600000; // 1 hour
    
    setInterval(async () => {
        try {
            await cleanupExpiredTokens();
        } catch (error) {
            console.error('Error cleaning up expired tokens:', error);
        }
    }, CLEANUP_INTERVAL);
    
    console.log(`⏰ Token cleanup scheduled every ${CLEANUP_INTERVAL / 1000 / 60} minutes`);
}

// ================================================================
// GRACEFUL SHUTDOWN
// ================================================================

process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\nSIGINT received. Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

export default app;