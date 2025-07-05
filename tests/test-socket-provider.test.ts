import { authClient } from '@/lib/auth-client';
import { socketClient } from '@/lib/socket-client';
import { render, waitFor } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SocketProvider, useSocket } from '@/components/providers/SocketProvider';
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
    },
}));

vi.mock('@/components/AuthProvider', () => ({
    useAuth: vi.fn(),
}));

function TestComponent() {
    const socket = useSocket();
    return (
        <View>
        <Text testID= "is-connected" > { socket.isConnected.toString() } </Text>
        < Text testID = "is-connecting" > { socket.isConnecting.toString() } </Text>
            < Button testID = "connect-btn" title = "Connect" onPress = {() => socket.connect()
} />
    < Button testID = "disconnect-btn" title = "Disconnect" onPress = {() => socket.disconnect()} />
        < Button testID = "join-room-btn" title = "Join Room" onPress = {() => socket.joinEventRoom('test-event')} />
            < Button testID = "send-message-btn" title = "Send Message" onPress = {() => socket.sendMessage('test-event', 'Hello')} />
                </View>
    );
}

describe('SocketProvider', () => {
    const mockUseAuth = vi.mocked(require('@/components/AuthProvider').useAuth);
    const mockAuthClient = vi.mocked(authClient);
    const mockSocketClient = vi.mocked(socketClient);

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseAuth.mockReturnValue({
            user: {
                id: 'test-user-123',
                name: 'Test User',
                email: 'test@example.com',
            },
        });
        mockAuthClient.getSession.mockResolvedValue({
            data: {
                session: {
                    token: 'test-token-123',
                    user: { id: 'test-user-123', name: 'Test User' },
                },
            },
        });
        mockSocketClient.onConnectionChange.mockReturnValue(() => { });
        mockSocketClient.onMessage.mockReturnValue(() => { });
        mockSocketClient.onUserTyping.mockReturnValue(() => { });
        mockSocketClient.onUserStoppedTyping.mockReturnValue(() => { });
        mockSocketClient.onUserJoined.mockReturnValue(() => { });
        mockSocketClient.onUserLeft.mockReturnValue(() => { });
        mockSocketClient.isConnected.mockReturnValue(false);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should connect automatically when user is authenticated', async () => {
        mockSocketClient.connect.mockResolvedValue();
        const { getByTestId } = render(
            <SocketProvider>
            <TestComponent />
            </SocketProvider>
        );
        await waitFor(() => {
            expect(mockAuthClient.getSession).toHaveBeenCalled();
            expect(mockSocketClient.connect).toHaveBeenCalledWith('test-token-123');
        });
    });

    it('should handle missing auth token gracefully', async () => {
        mockAuthClient.getSession.mockResolvedValue({ data: { session: null } });
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        const { getByTestId } = render(
            <SocketProvider>
            <TestComponent />
            </SocketProvider>
        );
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith('No auth token available for socket connection');
            expect(mockSocketClient.connect).not.toHaveBeenCalled();
        });
        consoleSpy.mockRestore();
    });

    it('should handle authentication errors gracefully', async () => {
        mockSocketClient.connect.mockRejectedValue(new Error('Auth failed'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        const { getByTestId } = render(
            <SocketProvider>
            <TestComponent />
            </SocketProvider>
        );
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith('Failed to connect to socket:', expect.any(Error));
        });
        consoleSpy.mockRestore();
    });

    it('should disconnect when user logs out', async () => {
        mockSocketClient.connect.mockResolvedValue();
        mockSocketClient.isConnected.mockReturnValue(true);
        const { rerender } = render(
            <SocketProvider>
            <TestComponent />
            </SocketProvider>
        );
        await waitFor(() => {
            expect(mockSocketClient.connect).toHaveBeenCalled();
        });
        mockUseAuth.mockReturnValue({ user: null });
        rerender(
            <SocketProvider>
            <TestComponent />
            </SocketProvider>
        );
        await waitFor(() => {
            expect(mockSocketClient.disconnect).toHaveBeenCalled();
        });
    });
}); 