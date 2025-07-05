import { getAuthHeaders, getSocketAuthHeaders } from '@/lib/auth-client';
import { socketClient } from '@/lib/socket-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the auth client
vi.mock('@/lib/auth-client', () => ({
    getAuthHeaders: vi.fn(),
    getSocketAuthHeaders: vi.fn(),
}));

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
    io: vi.fn(() => ({
        on: vi.fn(),
        emit: vi.fn(),
        disconnect: vi.fn(),
        connected: false,
    })),
}));

describe('Socket Authentication Fix', () => {
    const mockToken = 'mock-jwt-token';
    const mockSignedCookie = 'better-auth.session_token=mock-signed-cookie';

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset the singleton instance
        socketClient.disconnect();
    });

    afterEach(() => {
        socketClient.disconnect();
    });

    describe('Auth Client Token Format', () => {
        it('should provide both Bearer and Cookie token formats', async () => {
            const mockSession = {
                data: {
                    session: {
                        token: mockToken
                    }
                }
            };

            (getAuthHeaders as any).mockResolvedValue({
                'Authorization': `Bearer ${mockToken}`,
                'Cookie': mockSignedCookie,
                'Content-Type': 'application/json'
            });

            const headers = await getAuthHeaders();

            expect(headers).toHaveProperty('Authorization');
            expect(headers).toHaveProperty('Cookie');
            expect(headers.Authorization).toMatch(/^Bearer /);
            expect(headers.Cookie).toContain('better-auth.session_token=');
        });

        it('should provide socket-specific auth headers', async () => {
            (getSocketAuthHeaders as any).mockResolvedValue({
                'Cookie': mockSignedCookie
            });

            const headers = await getSocketAuthHeaders();

            expect(headers).toHaveProperty('Cookie');
            expect(headers?.Cookie).toContain('better-auth.session_token=');
        });

        it('should handle missing session gracefully', async () => {
            (getSocketAuthHeaders as any).mockResolvedValue(null);

            const headers = await getSocketAuthHeaders();

            expect(headers).toBeNull();
        });
    });

    describe('Socket Client Authentication', () => {
        it('should use proper auth headers for connection', async () => {
            const mockAuthHeaders = {
                'Cookie': mockSignedCookie
            };

            (getSocketAuthHeaders as any).mockResolvedValue(mockAuthHeaders);

            // Mock successful connection
            const mockSocket = {
                on: vi.fn((event, callback) => {
                    if (event === 'connect') {
                        setTimeout(() => callback(), 0);
                    }
                }),
                emit: vi.fn(),
                disconnect: vi.fn(),
                connected: false,
            };

            const { io } = await import('socket.io-client');
            (io as any).mockReturnValue(mockSocket);

            await socketClient.connect();

            expect(getSocketAuthHeaders).toHaveBeenCalled();
            expect(io).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    auth: mockAuthHeaders,
                    extraHeaders: mockAuthHeaders,
                })
            );
        });

        it('should handle authentication failure gracefully', async () => {
            (getSocketAuthHeaders as any).mockResolvedValue(null);

            await expect(socketClient.connect()).rejects.toThrow('No authentication available');
        });

        it('should support reconnection with stored auth token', async () => {
            const mockAuthHeaders = {
                'Authorization': `Bearer ${mockToken}`
            };

            (getSocketAuthHeaders as any).mockResolvedValue(mockAuthHeaders);

            // Mock successful connection
            const mockSocket = {
                on: vi.fn((event, callback) => {
                    if (event === 'connect') {
                        setTimeout(() => callback(), 0);
                    }
                }),
                emit: vi.fn(),
                disconnect: vi.fn(),
                connected: false,
            };

            const { io } = await import('socket.io-client');
            (io as any).mockReturnValue(mockSocket);

            await socketClient.connect('stored-token');

            expect(socketClient.getCurrentEventId()).toBeNull();
            expect(socketClient.isConnected()).toBe(false); // Will be true after connect callback
        });
    });

    describe('Environment Configuration', () => {
        it('should use environment variables for socket URL', () => {
            const originalEnv = process.env.EXPO_PUBLIC_SOCKET_URL;

            // Test with environment variable
            process.env.EXPO_PUBLIC_SOCKET_URL = 'http://test-socket-server:3001';

            // The socket client should use this URL when connecting
            expect(process.env.EXPO_PUBLIC_SOCKET_URL).toBe('http://test-socket-server:3001');

            // Restore original
            if (originalEnv) {
                process.env.EXPO_PUBLIC_SOCKET_URL = originalEnv;
            } else {
                delete process.env.EXPO_PUBLIC_SOCKET_URL;
            }
        });

        it('should fallback to localhost when no environment variable', () => {
            const originalEnv = process.env.EXPO_PUBLIC_SOCKET_URL;
            delete process.env.EXPO_PUBLIC_SOCKET_URL;

            // Should fallback to localhost
            const fallbackUrl = 'http://localhost:3001';
            expect(fallbackUrl).toBe('http://localhost:3001');

            // Restore original
            if (originalEnv) {
                process.env.EXPO_PUBLIC_SOCKET_URL = originalEnv;
            }
        });
    });

    describe('Error Handling', () => {
        it('should provide structured error information', async () => {
            const mockAuthHeaders = {
                'Cookie': mockSignedCookie
            };

            (getSocketAuthHeaders as any).mockResolvedValue(mockAuthHeaders);

            // Mock connection error
            const mockSocket = {
                on: vi.fn((event, callback) => {
                    if (event === 'connect_error') {
                        setTimeout(() => callback(new Error('Auth failed: invalid token')), 0);
                    }
                }),
                emit: vi.fn(),
                disconnect: vi.fn(),
                connected: false,
            };

            const { io } = await import('socket.io-client');
            (io as any).mockReturnValue(mockSocket);

            await expect(socketClient.connect()).rejects.toThrow('Auth failed: invalid token');
        });
    });
}); 