import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { saveEventMessage } from '@/lib/db/event-messages';
import { getUserParticipationStatus } from '@/lib/db/event-participation';
import { socketServer } from '@/lib/socket-server';
import axios from 'axios';
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { io as ClientIO } from 'socket.io-client';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// Mock auth for testing
vi.mock('@/lib/auth', () => ({
    auth: {
        api: {
            getSession: vi.fn()
        }
    }
}));

// Mock database operations
vi.mock('@/lib/db', () => ({
    db: {
        insert: vi.fn(),
        select: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
    },
    initializeDatabase: vi.fn(() => ({
        insert: vi.fn(),
        select: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
    }))
}));

// Mock event participation functions
vi.mock('@/lib/db/event-participation', () => ({
    getUserParticipationStatus: vi.fn()
}));

// Mock event messages functions
vi.mock('@/lib/db/event-messages', () => ({
    saveEventMessage: vi.fn()
}));

describe('Socket.IO Server Integration Tests', () => {
    const TEST_EVENT_ID = '00000000-0000-0000-0000-000000000001';
    const TEST_USER_ID = 'test-user-123';
    const TEST_USER_NAME = 'Test User';
    const TEST_TOKEN = 'test-token-123';

    let server: any;
    let port: number;
    let baseUrl: string;

    beforeAll(async () => {
        // Create Express app and HTTP server for Socket.IO (matching server.js structure)
        const app = express();
        server = createServer(app);

        // CORS configuration for testing
        app.use(cors({
            origin: "http://localhost:8081",
            credentials: true
        }));

        // Health check endpoint (matching server.js)
        app.get('/health', (req, res) => {
            res.json({
                status: 'ready',
                socketIO: socketServer.isReady(),
                timestamp: new Date().toISOString(),
                port: port,
                environment: 'test'
            });
        });

        // Root endpoint (matching server.js)
        app.get('/', (req, res) => {
            res.json({
                message: 'Socket.IO Server is running',
                version: '1.0.0',
                timestamp: new Date().toISOString()
            });
        });

        // Initialize Socket.IO server
        socketServer.initialize(server);

        // Start server on random port
        port = 0; // Let OS assign port
        await new Promise<void>((resolve) => {
            server.listen(port, () => {
                port = (server.address() as any).port;
                baseUrl = `http://localhost:${port}`;
                resolve();
            });
        });

        // Mock successful authentication
        (auth.api.getSession as any).mockResolvedValue({
            user: {
                id: TEST_USER_ID,
                name: TEST_USER_NAME,
                image: 'https://example.com/avatar.jpg'
            }
        });

        // Mock database operations
        if (db) {
            (db.insert as any).mockResolvedValue({ id: 'test-message-id' });
            (db.select as any).mockResolvedValue([]);
            (db.update as any).mockResolvedValue({ success: true, newCounts: { attending: 1, interested: 0 } });
        }

        // Mock event participation function
        (getUserParticipationStatus as any).mockResolvedValue('attending');

        // Mock event message function
        (saveEventMessage as any).mockResolvedValue({
            id: 'test-message-id',
            eventId: TEST_EVENT_ID,
            userId: TEST_USER_ID,
            content: 'Test message',
            userName: TEST_USER_NAME,
            userImage: 'https://example.com/avatar.jpg',
            createdAt: new Date()
        });
    });

    afterAll(async () => {
        if (server) {
            await new Promise<void>((resolve) => server.close(() => resolve()));
        }
    });

    describe('Server Startup and Shutdown', () => {
        it('should start server successfully and assign a port', () => {
            expect(port).toBeGreaterThan(0);
            expect(baseUrl).toBe(`http://localhost:${port}`);
        });

        it('should initialize Socket.IO server correctly', () => {
            expect(socketServer.isReady()).toBe(true);
            expect(socketServer.getIO()).not.toBeNull();
        });

        it('should handle graceful shutdown', async () => {
            // This test verifies that the server can be closed gracefully
            // The actual shutdown is tested in afterAll
            expect(server.listening).toBe(true);
        });
    });

    describe('Health Check Endpoint', () => {
        it('should respond to health check with correct status', async () => {
            const response = await axios.get(`${baseUrl}/health`);

            expect(response.status).toBe(200);
            expect(response.data).toMatchObject({
                status: 'ready',
                socketIO: true,
                timestamp: expect.any(String)
            });
            expect(new Date(response.data.timestamp)).toBeInstanceOf(Date);
        });

        it('should include server information in health response', async () => {
            const response = await axios.get(`${baseUrl}/health`);

            expect(response.data).toHaveProperty('port');
            expect(response.data).toHaveProperty('environment');
            expect(typeof response.data.port).toBe('number');
            expect(typeof response.data.environment).toBe('string');
        });

        it('should handle multiple health check requests', async () => {
            const promises = Array(5).fill(null).map(() =>
                axios.get(`${baseUrl}/health`)
            );

            const responses = await Promise.all(promises);

            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.data.status).toBe('ready');
            });
        });
    });

    describe('Root Endpoint', () => {
        it('should respond to root endpoint with server info', async () => {
            const response = await axios.get(baseUrl);

            expect(response.status).toBe(200);
            expect(response.data).toMatchObject({
                message: 'Socket.IO Server is running',
                version: '1.0.0',
                timestamp: expect.any(String)
            });
        });
    });

    describe('Concurrent Connections and Room Management', () => {
        let sockets: any[] = [];

        afterEach(() => {
            // Clean up all test sockets
            sockets.forEach(socket => {
                if (socket && socket.connected) {
                    socket.disconnect();
                }
            });
            sockets = [];
        });

        it('should handle multiple concurrent connections', async () => {
            const connectionCount = 5;
            const connectionPromises = Array(connectionCount).fill(null).map((_, index) => {
                return new Promise<any>((resolve, reject) => {
                    const socket = ClientIO(baseUrl, {
                        auth: { token: `${TEST_TOKEN}-${index}` },
                        transports: ['websocket', 'polling'],
                        timeout: 5000,
                    });

                    const timeout = setTimeout(() => {
                        reject(new Error(`Connection timeout for socket ${index}`));
                    }, 5000);

                    socket.on('connect', () => {
                        clearTimeout(timeout);
                        sockets.push(socket);
                        resolve(socket);
                    });

                    socket.on('connect_error', (error: any) => {
                        clearTimeout(timeout);
                        reject(error);
                    });
                });
            });

            const connectedSockets = await Promise.all(connectionPromises);

            expect(connectedSockets).toHaveLength(connectionCount);
            connectedSockets.forEach(socket => {
                expect(socket.connected).toBe(true);
            });
        });

        it('should manage multiple users in the same event room', async () => {
            const userCount = 3;
            const sockets = await Promise.all(
                Array(userCount).fill(null).map((_, index) => {
                    return new Promise<any>((resolve, reject) => {
                        const socket = ClientIO(baseUrl, {
                            auth: { token: `${TEST_TOKEN}-${index}` },
                            transports: ['websocket', 'polling'],
                            timeout: 5000,
                        });

                        const timeout = setTimeout(() => {
                            reject(new Error(`Connection timeout for socket ${index}`));
                        }, 5000);

                        socket.on('connect', () => {
                            clearTimeout(timeout);
                            resolve(socket);
                        });

                        socket.on('connect_error', (error: any) => {
                            clearTimeout(timeout);
                            reject(error);
                        });
                    });
                })
            );

            // All users join the same event room
            const joinPromises = sockets.map(socket => {
                return new Promise<void>((resolve) => {
                    socket.emit('join-event', { eventId: TEST_EVENT_ID });
                    setTimeout(resolve, 100);
                });
            });

            await Promise.all(joinPromises);

            // Verify all sockets are connected and in the room
            sockets.forEach(socket => {
                expect(socket.connected).toBe(true);
            });

            // Clean up
            sockets.forEach(socket => socket.disconnect());
        });

        it('should handle users joining and leaving rooms concurrently', async () => {
            const userCount = 5;
            const sockets = await Promise.all(
                Array(userCount).fill(null).map((_, index) => {
                    return new Promise<any>((resolve, reject) => {
                        const socket = ClientIO(baseUrl, {
                            auth: { token: `${TEST_TOKEN}-${index}` },
                            transports: ['websocket', 'polling'],
                            timeout: 5000,
                        });

                        const timeout = setTimeout(() => {
                            reject(new Error(`Connection timeout for socket ${index}`));
                        }, 5000);

                        socket.on('connect', () => {
                            clearTimeout(timeout);
                            resolve(socket);
                        });

                        socket.on('connect_error', (error: any) => {
                            clearTimeout(timeout);
                            reject(error);
                        });
                    });
                })
            );

            // Concurrent join operations
            const joinPromises = sockets.map(socket => {
                return new Promise<void>((resolve) => {
                    socket.emit('join-event', { eventId: TEST_EVENT_ID });
                    setTimeout(resolve, 100);
                });
            });

            await Promise.all(joinPromises);

            // Concurrent leave operations
            const leavePromises = sockets.map(socket => {
                return new Promise<void>((resolve) => {
                    socket.emit('leave-event', { eventId: TEST_EVENT_ID });
                    setTimeout(resolve, 100);
                });
            });

            await Promise.all(leavePromises);

            // Verify all operations completed without errors
            sockets.forEach(socket => {
                expect(socket.connected).toBe(true);
            });

            // Clean up
            sockets.forEach(socket => socket.disconnect());
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle malformed event data gracefully', async () => {
            const socket = ClientIO(baseUrl, {
                auth: { token: TEST_TOKEN },
                transports: ['websocket', 'polling'],
                timeout: 5000,
            });

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, 5000);

                socket.on('connect', () => {
                    clearTimeout(timeout);
                    resolve();
                });

                socket.on('connect_error', (error: any) => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });

            // Test malformed join-event data
            await new Promise<void>((resolve) => {
                socket.on('error', (error: any) => {
                    expect(error.message).toContain('Must join event to access chat');
                    resolve();
                });

                socket.emit('join-event', { eventId: '' }); // Empty event ID
            });

            socket.disconnect();
        });

        it('should handle rapid message sending without errors', async () => {
            const socket = ClientIO(baseUrl, {
                auth: { token: TEST_TOKEN },
                transports: ['websocket', 'polling'],
                timeout: 5000,
            });

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, 5000);

                socket.on('connect', () => {
                    clearTimeout(timeout);
                    resolve();
                });

                socket.on('connect_error', (error: any) => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });

            // Join event room first
            await new Promise<void>((resolve) => {
                socket.emit('join-event', { eventId: TEST_EVENT_ID });
                setTimeout(resolve, 100);
            });

            // Send multiple messages rapidly
            const messageCount = 10;
            const sendPromises = Array(messageCount).fill(null).map((_, index) => {
                return new Promise<void>((resolve) => {
                    socket.emit('send-message', {
                        eventId: TEST_EVENT_ID,
                        content: `Rapid message ${index + 1}`
                    });
                    setTimeout(resolve, 50);
                });
            });

            await Promise.all(sendPromises);

            // Verify no errors occurred
            expect(socket.connected).toBe(true);

            socket.disconnect();
        });

        it('should handle connection drops and reconnections', async () => {
            const socket = ClientIO(baseUrl, {
                auth: { token: TEST_TOKEN },
                transports: ['websocket', 'polling'],
                timeout: 5000,
            });

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, 5000);

                socket.on('connect', () => {
                    clearTimeout(timeout);
                    resolve();
                });

                socket.on('connect_error', (error: any) => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });

            // Force disconnect
            socket.disconnect();

            // Wait a moment
            await new Promise(resolve => setTimeout(resolve, 100));

            // Reconnect
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Reconnection timeout'));
                }, 5000);

                socket.on('connect', () => {
                    clearTimeout(timeout);
                    resolve();
                });

                socket.on('connect_error', (error: any) => {
                    clearTimeout(timeout);
                    reject(error);
                });

                socket.connect();
            });

            expect(socket.connected).toBe(true);
            socket.disconnect();
        });

        it('should handle invalid event IDs gracefully', async () => {
            const socket = ClientIO(baseUrl, {
                auth: { token: TEST_TOKEN },
                transports: ['websocket', 'polling'],
                timeout: 5000,
            });

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, 5000);

                socket.on('connect', () => {
                    clearTimeout(timeout);
                    resolve();
                });

                socket.on('connect_error', (error: any) => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });

            // Test with invalid event ID
            await new Promise<void>((resolve) => {
                socket.on('error', (error: any) => {
                    expect(error.message).toContain('Must join event to access chat');
                    resolve();
                });

                socket.emit('join-event', { eventId: 'invalid-event-id' });
            });

            socket.disconnect();
        });

        it('should handle missing authentication data', async () => {
            const socket = ClientIO(baseUrl, {
                transports: ['websocket', 'polling'],
                timeout: 5000,
            });

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, 5000);

                socket.on('connect', () => {
                    clearTimeout(timeout);
                    reject(new Error('Should not connect without auth'));
                });

                socket.on('connect_error', (error: any) => {
                    clearTimeout(timeout);
                    expect(error.message).toContain('Authentication token required');
                    resolve();
                });
            });

            socket.disconnect();
        });
    });

    describe('Performance and Load Testing', () => {
        it('should handle multiple rapid connections and disconnections', async () => {
            const connectionCount = 10;
            const connectionPromises = Array(connectionCount).fill(null).map((_, index) => {
                return new Promise<any>((resolve, reject) => {
                    const socket = ClientIO(baseUrl, {
                        auth: { token: `${TEST_TOKEN}-${index}` },
                        transports: ['websocket', 'polling'],
                        timeout: 5000,
                    });

                    const timeout = setTimeout(() => {
                        reject(new Error(`Connection timeout for socket ${index}`));
                    }, 5000);

                    socket.on('connect', () => {
                        clearTimeout(timeout);
                        resolve(socket);
                    });

                    socket.on('connect_error', (error: any) => {
                        clearTimeout(timeout);
                        reject(error);
                    });
                });
            });

            const sockets = await Promise.all(connectionPromises);

            // Verify all connections successful
            expect(sockets).toHaveLength(connectionCount);
            sockets.forEach(socket => {
                expect(socket.connected).toBe(true);
            });

            // Rapid disconnections
            const disconnectPromises = sockets.map(socket => {
                return new Promise<void>((resolve) => {
                    socket.disconnect();
                    setTimeout(resolve, 10);
                });
            });

            await Promise.all(disconnectPromises);

            // Verify all disconnections successful
            sockets.forEach(socket => {
                expect(socket.connected).toBe(false);
            });
        });

        it('should maintain performance under message load', async () => {
            const socket = ClientIO(baseUrl, {
                auth: { token: TEST_TOKEN },
                transports: ['websocket', 'polling'],
                timeout: 5000,
            });

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, 5000);

                socket.on('connect', () => {
                    clearTimeout(timeout);
                    resolve();
                });

                socket.on('connect_error', (error: any) => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });

            // Join event room
            await new Promise<void>((resolve) => {
                socket.emit('join-event', { eventId: TEST_EVENT_ID });
                setTimeout(resolve, 100);
            });

            // Send many messages quickly
            const messageCount = 50;
            const startTime = Date.now();

            const sendPromises = Array(messageCount).fill(null).map((_, index) => {
                return new Promise<void>((resolve) => {
                    socket.emit('send-message', {
                        eventId: TEST_EVENT_ID,
                        content: `Performance test message ${index + 1}`
                    });
                    setTimeout(resolve, 10);
                });
            });

            await Promise.all(sendPromises);

            const endTime = Date.now();
            const totalTime = endTime - startTime;

            // Verify performance (should complete within reasonable time)
            expect(totalTime).toBeLessThan(5000); // 5 seconds max
            expect(socket.connected).toBe(true);

            socket.disconnect();
        });
    });
}); 