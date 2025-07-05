const express = require('express');
const { createServer } = require('http');
const cors = require('cors');
require('dotenv').config();

// Import the existing socket server module
const { socketServer } = require('./lib/socket-server');

// Import configuration
const config = require('./config');

// Environment variable validation
function validateEnvironment() {
    const required = {
        'EXPO_PUBLIC_SOCKET_URL': process.env.EXPO_PUBLIC_SOCKET_URL,
        'BETTER_AUTH_SECRET': process.env.BETTER_AUTH_SECRET
    };

    const missing = Object.entries(required)
        .filter(([key, value]) => !value)
        .map(([key]) => key);

    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:');
        missing.forEach(key => console.error(`   - ${key}`));
        console.error('\nPlease check your .env file and ensure all required variables are set.');
        process.exit(1);
    }

    // Validate BETTER_AUTH_SECRET length
    if (process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_SECRET.length < 32) {
        console.error('❌ BETTER_AUTH_SECRET must be at least 32 characters long');
        process.exit(1);
    }


}

// Validate environment before starting server
validateEnvironment();

const app = express();
const server = createServer(app);

// CORS configuration for Expo development environment
app.use(cors(config.socket.cors));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ready',
        socketIO: socketServer.isReady(),
        timestamp: new Date().toISOString(),
        port: config.socket.port,
        environment: config.server.nodeEnv
    });
});

// Root endpoint for basic connectivity test
app.get('/', (req, res) => {
    res.json({
        message: 'Socket.IO Server is running',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// Initialize Socket.IO server
socketServer.initialize(server);

const PORT = config.socket.port;

server.listen(PORT, () => {

});

// Graceful shutdown handling
process.on('SIGTERM', () => {
    server.close(() => {
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    server.close(() => {
        process.exit(0);
    });
});

// Error handling
server.on('error', (error) => {
    console.error('Server error:', error);
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please use a different port or stop the existing process.`);
    }
    process.exit(1);
}); 