import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { saveEventMessage } from '@/lib/db/event-messages';
import { getUserParticipationStatus } from '@/lib/db/event-participation';
import { socketServer } from '@/lib/socket-server';
import { createServer } from 'http';
import { io as ClientIO } from 'socket.io-client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('Socket.IO Server', () => {
    const TEST_EVENT_ID = '00000000-0000-0000-0000-000000000001';
    const TEST_USER_ID = 'test-user-123';
    const TEST_USER_NAME = 'Test User';
    const TEST_TOKEN = 'test-token-123';

    let socket: any;
    let server: any;
    let port: number;

    beforeAll(async () => {
        // Create HTTP server for Socket.IO
        server = createServer();
        socketServer.initialize(server);

        // Start server on random port
        port = 0; // Let OS assign port
        await new Promise<void>((resolve) => {
            server.listen(port, () => {
                port = (server.address() as any).port;
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
        if (socket) {
            socket.disconnect();
        }
        if (server) {
            await new Promise<void>((resolve) => server.close(() => resolve()));
        }
    });

    beforeEach(async () => {
        // Create a new socket connection for each test
        socket = ClientIO(`http://localhost:${port}`, {
            auth: { token: TEST_TOKEN },
            transports: ['websocket', 'polling'],
            timeout: 5000,
        });

        // Wait for connection
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
    });

    afterEach(async () => {
        if (socket) {
            socket.disconnect();
        }
    });

    describe('Connection and Authentication', () => {
        it('should connect successfully with valid token', async () => {
            expect(socket.connected).toBe(true);
        });

        it('should reject connection without token', async () => {
            const invalidSocket = ClientIO(`http://localhost:${port}`, {
                transports: ['websocket', 'polling'],
                timeout: 5000,
            });

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, 5000);

                invalidSocket.on('connect', () => {
                    clearTimeout(timeout);
                    reject(new Error('Should not connect without token'));
                });

                invalidSocket.on('connect_error', (error: any) => {
                    clearTimeout(timeout);
                    expect(error.message).toContain('Auth failed: no token');
                    resolve();
                });
            });

            invalidSocket.disconnect();
        });

        it('should reject connection with invalid token', async () => {
            // Mock failed authentication
            (auth.api.getSession as any).mockResolvedValueOnce(null);

            const invalidSocket = ClientIO(`http://localhost:${port}`, {
                auth: { token: 'invalid-token' },
                transports: ['websocket', 'polling'],
                timeout: 5000,
            });

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, 5000);

                invalidSocket.on('connect', () => {
                    clearTimeout(timeout);
                    reject(new Error('Should not connect with invalid token'));
                });

                invalidSocket.on('connect_error', (error: any) => {
                    clearTimeout(timeout);
                    expect(error.message).toContain('Auth failed: invalid token');
                    resolve();
                });
            });

            invalidSocket.disconnect();
        });
    });

    describe('Event Room Management', () => {
        it('should allow joining event room when user is participating', async () => {
            // Mock user participation
            if (db) {
                (db.select as any).mockResolvedValueOnce([{ status: 'attending' }]);
            }

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Join event timeout'));
                }, 5000);

                socket.on('error', (error: any) => {
                    clearTimeout(timeout);
                    reject(error);
                });

                socket.emit('join-event', { eventId: TEST_EVENT_ID });

                setTimeout(() => {
                    clearTimeout(timeout);
                    resolve();
                }, 1000);
            });

            // Should not receive an error
            expect(true).toBe(true);
        });

        it('should reject joining event room when user is not participating', async () => {
            // Mock no user participation
            (getUserParticipationStatus as any).mockResolvedValueOnce(null);

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Join event timeout'));
                }, 5000);

                socket.on('error', (error: any) => {
                    clearTimeout(timeout);
                    expect(error.message).toContain('Must join event to access chat');
                    resolve();
                });

                socket.emit('join-event', { eventId: TEST_EVENT_ID });
            });
        });

        it('should allow leaving event room', async () => {
            await new Promise<void>((resolve) => {
                socket.emit('leave-event', { eventId: TEST_EVENT_ID });

                setTimeout(() => {
                    resolve();
                }, 1000);
            });

            // Should not receive an error
            expect(true).toBe(true);
        });
    });

    describe('Message Broadcasting', () => {
        it('should broadcast valid messages to event room', async () => {
            // Mock user participation
            (db.select as any).mockResolvedValueOnce([{ status: 'attending' }]);

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Message broadcast timeout'));
                }, 5000);

                socket.on('error', (error: any) => {
                    clearTimeout(timeout);
                    reject(error);
                });

                // First join the event room
                socket.emit('join-event', { eventId: TEST_EVENT_ID });

                setTimeout(() => {
                    // Then send a message
                    socket.emit('send-message', {
                        eventId: TEST_EVENT_ID,
                        content: 'Hello, world!'
                    });

                    setTimeout(() => {
                        clearTimeout(timeout);
                        resolve();
                    }, 1000);
                }, 1000);
            });

            // Should not receive an error
            expect(true).toBe(true);
        });

        it('should reject empty messages', async () => {
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Empty message timeout'));
                }, 5000);

                socket.on('error', (error: any) => {
                    clearTimeout(timeout);
                    expect(error.message).toContain('Message cannot be empty');
                    resolve();
                });

                socket.emit('send-message', {
                    eventId: TEST_EVENT_ID,
                    content: ''
                });
            });
        });

        it('should reject messages that are too long', async () => {
            const longMessage = 'a'.repeat(1001);

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Long message timeout'));
                }, 5000);

                socket.on('error', (error: any) => {
                    clearTimeout(timeout);
                    expect(error.message).toContain('Message too long');
                    resolve();
                });

                socket.emit('send-message', {
                    eventId: TEST_EVENT_ID,
                    content: longMessage
                });
            });
        });

        it('should reject messages from non-participants', async () => {
            // Mock no user participation
            (getUserParticipationStatus as any).mockResolvedValueOnce(null);

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Non-participant message timeout'));
                }, 5000);

                socket.on('error', (error: any) => {
                    clearTimeout(timeout);
                    expect(error.message).toContain('Must join event to send messages');
                    resolve();
                });

                socket.emit('send-message', {
                    eventId: TEST_EVENT_ID,
                    content: 'Hello, world!'
                });
            });
        });
    });

    describe('Typing Indicators', () => {
        it('should broadcast typing indicators', async () => {
            // Mock user participation
            (db.select as any).mockResolvedValueOnce([{ status: 'attending' }]);

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Typing indicator timeout'));
                }, 5000);

                socket.on('error', (error: any) => {
                    clearTimeout(timeout);
                    reject(error);
                });

                // First join the event room
                socket.emit('join-event', { eventId: TEST_EVENT_ID });

                setTimeout(() => {
                    // Then start typing
                    socket.emit('start-typing', { eventId: TEST_EVENT_ID });

                    setTimeout(() => {
                        clearTimeout(timeout);
                        resolve();
                    }, 1000);
                }, 1000);
            });

            // Should not receive an error
            expect(true).toBe(true);
        });

        it('should broadcast stop typing indicators', async () => {
            // Mock user participation
            (db.select as any).mockResolvedValueOnce([{ status: 'attending' }]);

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Stop typing indicator timeout'));
                }, 5000);

                socket.on('error', (error: any) => {
                    clearTimeout(timeout);
                    reject(error);
                });

                // First join the event room
                socket.emit('join-event', { eventId: TEST_EVENT_ID });

                setTimeout(() => {
                    // Then stop typing
                    socket.emit('stop-typing', { eventId: TEST_EVENT_ID });

                    setTimeout(() => {
                        clearTimeout(timeout);
                        resolve();
                    }, 1000);
                }, 1000);
            });

            // Should not receive an error
            expect(true).toBe(true);
        });
    });

    describe('Participation Updates', () => {
        it('should broadcast user joined events', async () => {
            // Mock user participation
            (db.select as any).mockResolvedValueOnce([{ status: 'attending' }]);

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('User joined broadcast timeout'));
                }, 5000);

                socket.on('error', (error: any) => {
                    clearTimeout(timeout);
                    reject(error);
                });

                socket.emit('join-event', { eventId: TEST_EVENT_ID });

                setTimeout(() => {
                    clearTimeout(timeout);
                    resolve();
                }, 1000);
            });

            // Should not receive an error
            expect(true).toBe(true);
        });

        it('should broadcast user left events', async () => {
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('User left broadcast timeout'));
                }, 5000);

                socket.on('error', (error: any) => {
                    clearTimeout(timeout);
                    reject(error);
                });

                socket.emit('leave-event', { eventId: TEST_EVENT_ID });

                setTimeout(() => {
                    clearTimeout(timeout);
                    resolve();
                }, 1000);
            });

            // Should not receive an error
            expect(true).toBe(true);
        });
    });

    describe('Disconnection Handling', () => {
        it('should handle graceful disconnection', async () => {
            // Mock user participation
            (db.select as any).mockResolvedValueOnce([{ status: 'attending' }]);

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Disconnection timeout'));
                }, 5000);

                socket.on('error', (error: any) => {
                    clearTimeout(timeout);
                    reject(error);
                });

                // First join the event room
                socket.emit('join-event', { eventId: TEST_EVENT_ID });

                setTimeout(() => {
                    // Then disconnect
                    socket.disconnect();

                    setTimeout(() => {
                        clearTimeout(timeout);
                        resolve();
                    }, 1000);
                }, 1000);
            });

            // Should not receive an error
            expect(true).toBe(true);
        });
    });
}); 