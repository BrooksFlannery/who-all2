module.exports = {
    socket: {
        port: process.env.SOCKET_PORT || 3001,
        url: process.env.EXPO_PUBLIC_SOCKET_URL,
        clientUrl: process.env.EXPO_PUBLIC_CLIENT_URL,
        cors: {
            origin: process.env.EXPO_PUBLIC_CLIENT_URL,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }
    },
    server: {
        nodeEnv: process.env.NODE_ENV || 'production',
        logLevel: process.env.LOG_LEVEL || 'warn'
    },
    auth: {
        secret: process.env.BETTER_AUTH_SECRET
    },
    database: {
        url: process.env.EXPO_PUBLIC_DATABASE_URL || process.env.DATABASE_URL
    }
}; 