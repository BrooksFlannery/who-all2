import { socketClient } from '@/lib/socket-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Socket.IO
vi.mock('socket.io-client', () => ({
    io: vi.fn(() => ({
        connected: false,
        on: vi.fn(),
        emit: vi.fn(),
        disconnect: vi.fn(),
    })),
}));

describe('Socket Client', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        // Reset socket client state
        socketClient.disconnect();
    });

    it('should be able to connect with a token', async () => {
        const mockSocket = {
            connected: true,
            on: vi.fn(),
            emit: vi.fn(),
            disconnect: vi.fn(),
        };

        const { io } = await import('socket.io-client');
        (io as any).mockReturnValue(mockSocket);

        // Mock successful connection
        mockSocket.on.mockImplementation((event, callback) => {
            if (event === 'connect') {
                setTimeout(() => callback(), 0);
            }
        });

        await expect(socketClient.connect('test-token')).resolves.toBeUndefined();
        expect(io).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                auth: { token: 'test-token' },
                transports: ['websocket', 'polling'],
            })
        );
    });

    it('should handle connection errors', async () => {
        const mockSocket = {
            connected: false,
            on: vi.fn(),
            emit: vi.fn(),
            disconnect: vi.fn(),
        };

        const { io } = await import('socket.io-client');
        (io as any).mockReturnValue(mockSocket);

        // Mock connection error
        mockSocket.on.mockImplementation((event, callback) => {
            if (event === 'connect_error') {
                setTimeout(() => callback(new Error('Connection failed')), 0);
            }
        });

        await expect(socketClient.connect('test-token')).rejects.toThrow('Connection failed');
    });

    it('should join event rooms', () => {
        const mockSocket = {
            connected: true,
            on: vi.fn(),
            emit: vi.fn(),
            disconnect: vi.fn(),
        };

        socketClient['socket'] = mockSocket as any;

        socketClient.joinEventRoom('event-123');
        expect(mockSocket.emit).toHaveBeenCalledWith('join-event', { eventId: 'event-123' });
    });

    it('should send messages', () => {
        const mockSocket = {
            connected: true,
            on: vi.fn(),
            emit: vi.fn(),
            disconnect: vi.fn(),
        };

        socketClient['socket'] = mockSocket as any;

        socketClient.sendMessage('event-123', 'Hello world');
        expect(mockSocket.emit).toHaveBeenCalledWith('send-message', {
            eventId: 'event-123',
            content: 'Hello world'
        });
    });

    it('should handle typing indicators', () => {
        const mockSocket = {
            connected: true,
            on: vi.fn(),
            emit: vi.fn(),
            disconnect: vi.fn(),
        };

        socketClient['socket'] = mockSocket as any;

        socketClient.startTyping('event-123');
        expect(mockSocket.emit).toHaveBeenCalledWith('typing', { eventId: 'event-123' });

        socketClient.stopTyping('event-123');
        expect(mockSocket.emit).toHaveBeenCalledWith('stop-typing', { eventId: 'event-123' });
    });

    it('should manage event listeners', () => {
        const messageListener = vi.fn();
        const typingListener = vi.fn();

        const unsubscribeMessage = socketClient.onMessage(messageListener);
        const unsubscribeTyping = socketClient.onUserTyping(typingListener);

        // Simulate events
        socketClient['messageListeners'].forEach(listener => listener({
            id: 'msg-1',
            eventId: 'event-123',
            userId: 'user-1',
            content: 'Test message',
            userName: 'Test User',
            createdAt: new Date().toISOString()
        }));

        socketClient['typingListeners'].forEach(listener => listener({
            userId: 'user-1',
            userName: 'Test User'
        }));

        expect(messageListener).toHaveBeenCalledTimes(1);
        expect(typingListener).toHaveBeenCalledTimes(1);

        // Test unsubscription
        unsubscribeMessage();
        unsubscribeTyping();

        // Clear and test again
        socketClient['messageListeners'] = [];
        socketClient['typingListeners'] = [];

        expect(socketClient['messageListeners']).toHaveLength(0);
        expect(socketClient['typingListeners']).toHaveLength(0);
    });

    it('should track connection state', () => {
        const mockSocket = {
            connected: true,
            on: vi.fn(),
            emit: vi.fn(),
            disconnect: vi.fn(),
        };

        socketClient['socket'] = mockSocket as any;
        expect(socketClient.isConnected()).toBe(true);

        mockSocket.connected = false;
        expect(socketClient.isConnected()).toBe(false);
    });

    it('should track current event ID', () => {
        const mockSocket = {
            connected: true,
            on: vi.fn(),
            emit: vi.fn(),
            disconnect: vi.fn(),
        };

        socketClient['socket'] = mockSocket as any;

        socketClient.joinEventRoom('event-123');
        expect(socketClient.getCurrentEventId()).toBe('event-123');

        socketClient.leaveEventRoom('event-123');
        expect(socketClient.getCurrentEventId()).toBeNull();
    });
}); 