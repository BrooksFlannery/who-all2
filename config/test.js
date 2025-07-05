module.exports = {
    socket: {
        port: process.env.SOCKET_PORT || 3001,
        url: process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3001',
        clientUrl: process.env.EXPO_PUBLIC_CLIENT_URL || 'http://localhost:8081',
        cors: {
            origin: process.env.EXPO_PUBLIC_CLIENT_URL || 'http://localhost:8081',
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }
    },
    server: {
        nodeEnv: 'test',
        logLevel: process.env.LOG_LEVEL || 'error'
    },
    auth: {
        secret: process.env.BETTER_AUTH_SECRET
    },
    database: {
        url: process.env.EXPO_PUBLIC_DATABASE_URL || process.env.DATABASE_URL
    }
}; 