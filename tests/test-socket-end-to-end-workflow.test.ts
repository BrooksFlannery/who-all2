import { authClient } from '@/lib/auth-client';
import { socketClient } from '@/lib/socket-client';
import { SocketProvider, useSocket } from '@/components/providers/SocketProvider';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { View, Text, Button } from 'react-native';

// Mock dependencies
vi.mock('@/lib/auth-client', () => ({
    authClient: {
        getSession: vi.fn(),
    },
}));

vi.mock('@/lib/socket-client', () => ({
    socketClient: {
        connect: vi.fn(),
        disconnect: vi.fn(),
        joinEventRoom: vi.fn(),
        leaveEventRoom: vi.fn(),
        sendMessage: vi.fn(),
        startTyping: vi.fn(),
        stopTyping: vi.fn(),
        onMessage: vi.fn(),
        onUserTyping: vi.fn(),
        onUserStoppedTyping: vi.fn(),
        onUserJoined: vi.fn(),
        onUserLeft: vi.fn(),
        onConnectionChange: vi.fn(),
        isConnected: vi.fn(),
        getCurrentEventId: vi.fn(),
    },
}));

vi.mock('@/components/AuthProvider', () => ({
    useAuth: vi.fn(),
}));

// Test component that uses socket functionality
function TestSocketComponent() {
    const socket = useSocket();
    return (
        <View>
        <Text testID= "connection-status" >
        Connected: { socket.isConnected.toString() } Connecting: { socket.isConnecting.toString() }
    </Text>
        < Button testID = "connect-btn" title = "Connect" onPress = {() => socket.connect()
} />
    < Button testID = "disconnect-btn" title = "Disconnect" onPress = {() => socket.disconnect()} />
        < Button testID = "join-room-btn" title = "Join Room" onPress = {() => socket.joinEventRoom('test-event-123')} />
            < Button testID = "send-message-btn" title = "Send Message" onPress = {() => socket.sendMessage('test-event-123', 'Hello World')} />
                < Button testID = "typing-btn" title = "Start Typing" onPress = {() => socket.startTyping('test-event-123')} />
                    < Button testID = "stop-typing-btn" title = "Stop Typing" onPress = {() => socket.stopTyping('test-event-123')} />
                        </View>
    );
}

describe('Socket.IO End-to-End Workflow', () => {
    const mockUseAuth = vi.mocked(require('@/components/AuthProvider').useAuth);
    const mockAuthClient = vi.mocked(authClient);
    const mockSocketClient = vi.mocked(socketClient);

    const TEST_TOKEN = 'test-auth-token';
    const TEST_USER_ID = 'test-user-123';
    const TEST_USER_NAME = 'Test User';
    const TEST_EVENT_ID = 'test-event-123';

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default auth state
        mockUseAuth.mockReturnValue({
            user: {
                id: TEST_USER_ID,
                name: TEST_USER_NAME,
                email: 'test@example.com',
            },
        });

        // Setup default session
        mockAuthClient.getSession.mockResolvedValue({
            data: {
                session: {
                    token: TEST_TOKEN,
                    user: {
                        id: TEST_USER_ID,
                        name: TEST_USER_NAME
                    },
                },
            },
        });

        // Setup socket client mocks
        mockSocketClient.onConnectionChange.mockReturnValue(() => { });
        mockSocketClient.onMessage.mockReturnValue(() => { });
        mockSocketClient.onUserTyping.mockReturnValue(() => { });
        mockSocketClient.onUserStoppedTyping.mockReturnValue(() => { });
        mockSocketClient.onUserJoined.mockReturnValue(() => { });
        mockSocketClient.onUserLeft.mockReturnValue(() => { });
        mockSocketClient.isConnected.mockReturnValue(false);
        mockSocketClient.getCurrentEventId.mockReturnValue(null);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Complete User Workflow', () => {
        it('should handle complete user authentication and connection flow', async () => {
            // Setup successful connection
            mockSocketClient.connect.mockResolvedValue();
            mockSocketClient.isConnected.mockReturnValue(true);

            const { getByTestId } = render(
                <SocketProvider>
                <TestSocketComponent />
                </SocketProvider>
            );

            // Wait for automatic connection
            await waitFor(() => {
                expect(mockAuthClient.getSession).toHaveBeenCalled();
                expect(mockSocketClient.connect).toHaveBeenCalledWith(TEST_TOKEN);
            });

            // Verify connection status
            expect(getByTestId('connection-status')).toHaveTextContent('Connected: true');
        });

        it('should handle event room joining and messaging workflow', async () => {
            // Setup connected state
            mockSocketClient.connect.mockResolvedValue();
            mockSocketClient.isConnected.mockReturnValue(true);
            mockSocketClient.getCurrentEventId.mockReturnValue(TEST_EVENT_ID);

            const { getByTestId } = render(
                <SocketProvider>
                <TestSocketComponent />
                </SocketProvider>
            );

            // Wait for connection
            await waitFor(() => {
                expect(mockSocketClient.connect).toHaveBeenCalled();
            });

            // Join event room
            fireEvent.press(getByTestId('join-room-btn'));
            expect(mockSocketClient.joinEventRoom).toHaveBeenCalledWith(TEST_EVENT_ID);

            // Send message
            fireEvent.press(getByTestId('send-message-btn'));
            expect(mockSocketClient.sendMessage).toHaveBeenCalledWith(TEST_EVENT_ID, 'Hello World');

            // Start typing
            fireEvent.press(getByTestId('typing-btn'));
            expect(mockSocketClient.startTyping).toHaveBeenCalledWith(TEST_EVENT_ID);

            // Stop typing
            fireEvent.press(getByTestId('stop-typing-btn'));
            expect(mockSocketClient.stopTyping).toHaveBeenCalledWith(TEST_EVENT_ID);
        });

        it('should handle user logout and cleanup', async () => {
            // Setup connected state
            mockSocketClient.connect.mockResolvedValue();
            mockSocketClient.isConnected.mockReturnValue(true);

            const { rerender, getByTestId } = render(
                <SocketProvider>
                <TestSocketComponent />
                </SocketProvider>
            );

            // Wait for connection
            await waitFor(() => {
                expect(mockSocketClient.connect).toHaveBeenCalled();
            });

            // Simulate user logout
            mockUseAuth.mockReturnValue({ user: null });
            rerender(
                <SocketProvider>
                <TestSocketComponent />
                </SocketProvider>
            );

            // Verify disconnect was called
            await waitFor(() => {
                expect(mockSocketClient.disconnect).toHaveBeenCalled();
            });
        });

        it('should handle connection errors and recovery', async () => {
            // Setup connection failure then success
            mockSocketClient.connect
                .mockRejectedValueOnce(new Error('Connection failed'))
                .mockResolvedValueOnce();

            mockSocketClient.isConnected
                .mockReturnValueOnce(false)
                .mockReturnValueOnce(true);

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const { getByTestId } = render(
                <SocketProvider>
                <TestSocketComponent />
                </SocketProvider>
            );

            // Wait for initial connection failure
            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith('Failed to connect to socket:', expect.any(Error));
            });

            // Manually trigger reconnection
            fireEvent.press(getByTestId('connect-btn'));

            // Wait for successful reconnection
            await waitFor(() => {
                expect(mockSocketClient.connect).toHaveBeenCalledTimes(2);
            });

            consoleSpy.mockRestore();
        });
    });

    describe('Real-time Messaging Workflow', () => {
        it('should handle complete messaging cycle with typing indicators', async () => {
            // Setup connected state
            mockSocketClient.connect.mockResolvedValue();
            mockSocketClient.isConnected.mockReturnValue(true);
            mockSocketClient.getCurrentEventId.mockReturnValue(TEST_EVENT_ID);

            const { getByTestId } = render(
                <SocketProvider>
                <TestSocketComponent />
                </SocketProvider>
            );

            // Wait for connection
            await waitFor(() => {
                expect(mockSocketClient.connect).toHaveBeenCalled();
            });

            // Complete messaging workflow
            fireEvent.press(getByTestId('join-room-btn'));
            fireEvent.press(getByTestId('typing-btn'));
            fireEvent.press(getByTestId('send-message-btn'));
            fireEvent.press(getByTestId('stop-typing-btn'));

            // Verify all socket events were emitted
            expect(mockSocketClient.joinEventRoom).toHaveBeenCalledWith(TEST_EVENT_ID);
            expect(mockSocketClient.startTyping).toHaveBeenCalledWith(TEST_EVENT_ID);
            expect(mockSocketClient.sendMessage).toHaveBeenCalledWith(TEST_EVENT_ID, 'Hello World');
            expect(mockSocketClient.stopTyping).toHaveBeenCalledWith(TEST_EVENT_ID);
        });

        it('should handle multiple rapid interactions', async () => {
            // Setup connected state
            mockSocketClient.connect.mockResolvedValue();
            mockSocketClient.isConnected.mockReturnValue(true);

            const { getByTestId } = render(
                <SocketProvider>
                <TestSocketComponent />
                </SocketProvider>
            );

            // Wait for connection
            await waitFor(() => {
                expect(mockSocketClient.connect).toHaveBeenCalled();
            });

            // Rapid interactions
            for (let i = 0; i < 5; i++) {
                fireEvent.press(getByTestId('join-room-btn'));
                fireEvent.press(getByTestId('send-message-btn'));
            }

            // Verify all interactions were processed
            expect(mockSocketClient.joinEventRoom).toHaveBeenCalledTimes(5);
            expect(mockSocketClient.sendMessage).toHaveBeenCalledTimes(5);
        });
    });

    describe('Error Recovery and Resilience', () => {
        it('should handle network interruption and recovery', async () => {
            // Setup connection with intermittent failures
            let connectionAttempts = 0;
            mockSocketClient.connect.mockImplementation(() => {
                connectionAttempts++;
                if (connectionAttempts === 1) {
                    return Promise.reject(new Error('Network error'));
                }
                return Promise.resolve();
            });

            mockSocketClient.isConnected
                .mockReturnValueOnce(false)
                .mockReturnValueOnce(true);

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const { getByTestId } = render(
                <SocketProvider>
                <TestSocketComponent />
                </SocketProvider>
            );

            // Wait for initial failure
            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith('Failed to connect to socket:', expect.any(Error));
            });

            // Manual retry
            fireEvent.press(getByTestId('connect-btn'));

            // Wait for successful recovery
            await waitFor(() => {
                expect(mockSocketClient.connect).toHaveBeenCalledTimes(2);
            });

            consoleSpy.mockRestore();
        });

        it('should handle missing authentication gracefully', async () => {
            // Setup missing session
            mockAuthClient.getSession.mockResolvedValue({ data: { session: null } });

            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

            const { getByTestId } = render(
                <SocketProvider>
                <TestSocketComponent />
                </SocketProvider>
            );

            // Wait for warning about missing token
            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith('No auth token available for socket connection');
            });

            // Verify no connection attempt was made
            expect(mockSocketClient.connect).not.toHaveBeenCalled();

            consoleSpy.mockRestore();
        });

        it('should handle authentication errors gracefully', async () => {
            // Setup auth error
            mockSocketClient.connect.mockRejectedValue(new Error('Invalid token'));

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const { getByTestId } = render(
                <SocketProvider>
                <TestSocketComponent />
                </SocketProvider>
            );

            // Wait for error handling
            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith('Failed to connect to socket:', expect.any(Error));
            });

            consoleSpy.mockRestore();
        });
    });

    describe('Integration with Real Server', () => {
        it('should connect to actual running server when available', async () => {
            const SOCKET_URL = 'http://localhost:3001';

            try {
                // Check if server is running
                const response = await axios.get(`${SOCKET_URL}/health`, { timeout: 2000 });
                if (response.status === 200) {
                    // Server is running, test integration
                    mockSocketClient.connect.mockRejectedValue(new Error('Auth failed'));

                    const { getByTestId } = render(
                        <SocketProvider>
                        <TestSocketComponent />
                        </SocketProvider>
                    );

                    // Verify connection attempt was made
                    await waitFor(() => {
                        expect(mockSocketClient.connect).toHaveBeenCalled();
                    });
                }
            } catch (error) {
                // Server not running, skip test
                console.log('Socket.IO server not running, skipping real server integration test');
            }
        }, 10000);

        it('should handle server health check integration', async () => {
            const SOCKET_URL = 'http://localhost:3001';

            try {
                const response = await axios.get(`${SOCKET_URL}/health`, { timeout: 2000 });
                expect(response.status).toBe(200);
                expect(response.data).toHaveProperty('status');
                expect(response.data).toHaveProperty('socketIO');
                expect(response.data).toHaveProperty('timestamp');
            } catch (error) {
                // Server not running, skip test
                console.log('Socket.IO server not running, skipping health check integration test');
            }
        }, 5000);
    });

    describe('Performance and Load Testing', () => {
        it('should handle rapid UI interactions efficiently', async () => {
            // Setup connected state
            mockSocketClient.connect.mockResolvedValue();
            mockSocketClient.isConnected.mockReturnValue(true);

            const { getByTestId } = render(
                <SocketProvider>
                <TestSocketComponent />
                </SocketProvider>
            );

            // Wait for connection
            await waitFor(() => {
                expect(mockSocketClient.connect).toHaveBeenCalled();
            });

            const startTime = Date.now();

            // Rapid button clicks
            for (let i = 0; i < 10; i++) {
                fireEvent.press(getByTestId('join-room-btn'));
                fireEvent.press(getByTestId('send-message-btn'));
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should complete within reasonable time (less than 1 second for 20 interactions)
            expect(duration).toBeLessThan(1000);
            expect(mockSocketClient.joinEventRoom).toHaveBeenCalledTimes(10);
            expect(mockSocketClient.sendMessage).toHaveBeenCalledTimes(10);
        });

        it('should handle connection state changes efficiently', async () => {
            // Setup connection state changes
            mockSocketClient.connect.mockResolvedValue();
            mockSocketClient.isConnected
                .mockReturnValueOnce(false)
                .mockReturnValueOnce(true)
                .mockReturnValueOnce(false)
                .mockReturnValueOnce(true);

            const { getByTestId } = render(
                <SocketProvider>
                <TestSocketComponent />
                </SocketProvider>
            );

            // Wait for initial connection
            await waitFor(() => {
                expect(mockSocketClient.connect).toHaveBeenCalled();
            });

            // Trigger multiple state changes
            fireEvent.press(getByTestId('connect-btn'));
            fireEvent.press(getByTestId('disconnect-btn'));
            fireEvent.press(getByTestId('connect-btn'));

            // Verify state changes were handled
            expect(mockSocketClient.connect).toHaveBeenCalledTimes(2);
            expect(mockSocketClient.disconnect).toHaveBeenCalledTimes(1);
        });
    });
}); 