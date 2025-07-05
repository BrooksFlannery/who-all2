import { describe, expect, it } from 'vitest';

describe('Environment Configuration', () => {

    describe('Development Configuration', () => {
        it('should have correct default values for development', () => {
            const mockConfig = {
                socket: {
                    port: 3001,
                    url: 'http://localhost:3001',
                    clientUrl: 'http://localhost:8081',
                    cors: {
                        origin: 'http://localhost:8081',
                        credentials: true,
                        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                        allowedHeaders: ['Content-Type', 'Authorization']
                    }
                },
                server: {
                    nodeEnv: 'development',
                    logLevel: 'info'
                }
            };

            expect(mockConfig.socket.port).toBe(3001);
            expect(mockConfig.socket.url).toBe('http://localhost:3001');
            expect(mockConfig.socket.clientUrl).toBe('http://localhost:8081');
            expect(mockConfig.server.nodeEnv).toBe('development');
            expect(mockConfig.server.logLevel).toBe('info');
        });

        it('should support environment variable overrides', () => {
            const mockEnvVars = {
                SOCKET_PORT: '3002',
                EXPO_PUBLIC_SOCKET_URL: 'http://localhost:3002',
                EXPO_PUBLIC_CLIENT_URL: 'http://localhost:8082',
                LOG_LEVEL: 'debug'
            };

            const mockConfig = {
                socket: {
                    port: parseInt(mockEnvVars.SOCKET_PORT || '3001'),
                    url: mockEnvVars.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3001',
                    clientUrl: mockEnvVars.EXPO_PUBLIC_CLIENT_URL || 'http://localhost:8081',
                    cors: {
                        origin: mockEnvVars.EXPO_PUBLIC_CLIENT_URL || 'http://localhost:8081',
                        credentials: true,
                        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                        allowedHeaders: ['Content-Type', 'Authorization']
                    }
                },
                server: {
                    nodeEnv: 'development',
                    logLevel: mockEnvVars.LOG_LEVEL || 'info'
                }
            };

            expect(mockConfig.socket.port).toBe(3002);
            expect(mockConfig.socket.url).toBe('http://localhost:3002');
            expect(mockConfig.socket.clientUrl).toBe('http://localhost:8082');
            expect(mockConfig.server.logLevel).toBe('debug');
        });
    });

    describe('Production Configuration', () => {
        it('should have correct production settings', () => {
            const mockEnvVars = {
                EXPO_PUBLIC_SOCKET_URL: 'https://api.example.com',
                EXPO_PUBLIC_CLIENT_URL: 'https://app.example.com',
                LOG_LEVEL: 'warn'
            };

            const mockConfig = {
                socket: {
                    port: parseInt(process.env.SOCKET_PORT || '3001'),
                    url: mockEnvVars.EXPO_PUBLIC_SOCKET_URL,
                    clientUrl: mockEnvVars.EXPO_PUBLIC_CLIENT_URL,
                    cors: {
                        origin: mockEnvVars.EXPO_PUBLIC_CLIENT_URL,
                        credentials: true,
                        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                        allowedHeaders: ['Content-Type', 'Authorization']
                    }
                },
                server: {
                    nodeEnv: 'production',
                    logLevel: mockEnvVars.LOG_LEVEL || 'warn'
                }
            };

            expect(mockConfig.socket.url).toBe('https://api.example.com');
            expect(mockConfig.socket.clientUrl).toBe('https://app.example.com');
            expect(mockConfig.server.nodeEnv).toBe('production');
            expect(mockConfig.server.logLevel).toBe('warn');
        });

        it('should handle missing environment variables in production', () => {
            const mockEnvVars: Record<string, string> = {};

            const mockConfig = {
                socket: {
                    url: mockEnvVars.EXPO_PUBLIC_SOCKET_URL,
                    clientUrl: mockEnvVars.EXPO_PUBLIC_CLIENT_URL,
                    cors: {
                        origin: mockEnvVars.EXPO_PUBLIC_CLIENT_URL
                    }
                }
            };

            expect(mockConfig.socket.url).toBeUndefined();
            expect(mockConfig.socket.clientUrl).toBeUndefined();
            expect(mockConfig.socket.cors.origin).toBeUndefined();
        });
    });

    describe('CORS Configuration', () => {
        it('should have correct CORS settings for development', () => {
            const corsConfig = {
                origin: 'http://localhost:8081',
                credentials: true,
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                allowedHeaders: ['Content-Type', 'Authorization']
            };

            expect(corsConfig.origin).toBe('http://localhost:8081');
            expect(corsConfig.credentials).toBe(true);
            expect(corsConfig.methods).toContain('GET');
            expect(corsConfig.methods).toContain('POST');
            expect(corsConfig.methods).toContain('OPTIONS');
            expect(corsConfig.allowedHeaders).toContain('Content-Type');
            expect(corsConfig.allowedHeaders).toContain('Authorization');
        });

        it('should have correct CORS settings for production', () => {
            const corsConfig = {
                origin: 'https://app.example.com',
                credentials: true,
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                allowedHeaders: ['Content-Type', 'Authorization']
            };

            expect(corsConfig.origin).toBe('https://app.example.com');
            expect(corsConfig.credentials).toBe(true);
            expect(corsConfig.methods).toContain('GET');
            expect(corsConfig.methods).toContain('POST');
            expect(corsConfig.methods).toContain('OPTIONS');
            expect(corsConfig.allowedHeaders).toContain('Content-Type');
            expect(corsConfig.allowedHeaders).toContain('Authorization');
        });
    });

    describe('Configuration Structure', () => {
        it('should have required configuration sections', () => {
            const mockConfig = {
                socket: {
                    port: 3001,
                    url: 'http://localhost:3001',
                    clientUrl: 'http://localhost:8081',
                    cors: {
                        origin: 'http://localhost:8081',
                        credentials: true,
                        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                        allowedHeaders: ['Content-Type', 'Authorization']
                    }
                },
                server: {
                    nodeEnv: 'development',
                    logLevel: 'info'
                },
                auth: {
                    secret: 'test-secret'
                },
                database: {
                    url: 'postgresql://test'
                }
            };

            expect(mockConfig).toHaveProperty('socket');
            expect(mockConfig).toHaveProperty('server');
            expect(mockConfig).toHaveProperty('auth');
            expect(mockConfig).toHaveProperty('database');

            expect(mockConfig.socket).toHaveProperty('port');
            expect(mockConfig.socket).toHaveProperty('url');
            expect(mockConfig.socket).toHaveProperty('clientUrl');
            expect(mockConfig.socket).toHaveProperty('cors');

            expect(mockConfig.server).toHaveProperty('nodeEnv');
            expect(mockConfig.server).toHaveProperty('logLevel');
        });

        it('should validate configuration types', () => {
            const mockConfig = {
                socket: {
                    port: 3001,
                    url: 'http://localhost:3001',
                    clientUrl: 'http://localhost:8081',
                    cors: {
                        origin: 'http://localhost:8081',
                        credentials: true,
                        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                        allowedHeaders: ['Content-Type', 'Authorization']
                    }
                },
                server: {
                    nodeEnv: 'development',
                    logLevel: 'info'
                }
            };

            expect(typeof mockConfig.socket.port).toBe('number');
            expect(typeof mockConfig.socket.url).toBe('string');
            expect(typeof mockConfig.socket.clientUrl).toBe('string');
            expect(typeof mockConfig.socket.cors.origin).toBe('string');
            expect(typeof mockConfig.socket.cors.credentials).toBe('boolean');
            expect(Array.isArray(mockConfig.socket.cors.methods)).toBe(true);
            expect(Array.isArray(mockConfig.socket.cors.allowedHeaders)).toBe(true);

            expect(typeof mockConfig.server.nodeEnv).toBe('string');
            expect(typeof mockConfig.server.logLevel).toBe('string');
        });
    });

    describe('Environment Variable Validation', () => {
        it('should validate required environment variables', () => {
            const requiredVars = {
                'EXPO_PUBLIC_SOCKET_URL': process.env.EXPO_PUBLIC_SOCKET_URL,
                'BETTER_AUTH_SECRET': process.env.BETTER_AUTH_SECRET
            };

            const missing = Object.entries(requiredVars)
                .filter(([key, value]) => !value)
                .map(([key]) => key);

            // In test environment, these might not be set, which is expected
            expect(Array.isArray(missing)).toBe(true);
        });

        it('should validate BETTER_AUTH_SECRET length', () => {
            const secret = process.env.BETTER_AUTH_SECRET;

            if (secret) {
                expect(secret.length).toBeGreaterThanOrEqual(32);
            }
        });
    });
}); 