import { useAuth } from '@/components/AuthProvider';
import { authClient } from '@/lib/auth-client';
import { EventMessage, socketClient, TypingUser, UserParticipationUpdate } from '@/lib/socket-client';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface SocketContextType {
    isConnected: boolean;
    isConnecting: boolean;
    connect: () => Promise<void>;
    disconnect: () => void;
    joinEventRoom: (eventId: string) => void;
    leaveEventRoom: (eventId: string) => void;
    sendMessage: (eventId: string, content: string) => void;
    startTyping: (eventId: string) => void;
    stopTyping: (eventId: string) => void;
    onMessage: (listener: (message: EventMessage) => void) => () => void;
    onUserTyping: (listener: (user: TypingUser) => void) => () => void;
    onUserStoppedTyping: (listener: (userId: string) => void) => () => void;
    onUserJoined: (listener: (data: UserParticipationUpdate) => void) => () => void;
    onUserLeft: (listener: (data: { userId: string; status: string }) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

interface SocketProviderProps {
    children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
    const { user } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);

    // Connect to socket when user is authenticated
    useEffect(() => {
        if (user && !isConnected && !isConnecting) {
            connect();
        } else if (!user && isConnected) {
            disconnect();
        }
    }, [user, isConnected, isConnecting]);

    // Listen for connection changes
    useEffect(() => {
        const unsubscribe = socketClient.onConnectionChange((connected) => {
            setIsConnected(connected);
            setIsConnecting(false);
        });

        return unsubscribe;
    }, []);

    const connect = async () => {
        try {
            const session = await authClient.getSession();
            if (!session?.data?.session?.token) {
                console.warn('No auth token available for socket connection');
                return;
            }

            setIsConnecting(true);
            await socketClient.connect(session.data.session.token);
        } catch (error) {
            console.error('Failed to connect to socket:', error);
            setIsConnecting(false);
        }
    };

    const disconnect = () => {
        socketClient.disconnect();
        setIsConnected(false);
        setIsConnecting(false);
    };

    const joinEventRoom = (eventId: string) => {
        socketClient.joinEventRoom(eventId);
    };

    const leaveEventRoom = (eventId: string) => {
        socketClient.leaveEventRoom(eventId);
    };

    const sendMessage = (eventId: string, content: string) => {
        socketClient.sendMessage(eventId, content);
    };

    const startTyping = (eventId: string) => {
        socketClient.startTyping(eventId);
    };

    const stopTyping = (eventId: string) => {
        socketClient.stopTyping(eventId);
    };

    const onMessage = (listener: (message: EventMessage) => void) => {
        return socketClient.onMessage(listener);
    };

    const onUserTyping = (listener: (user: TypingUser) => void) => {
        return socketClient.onUserTyping(listener);
    };

    const onUserStoppedTyping = (listener: (userId: string) => void) => {
        return socketClient.onUserStoppedTyping(listener);
    };

    const onUserJoined = (listener: (data: UserParticipationUpdate) => void) => {
        return socketClient.onUserJoined(listener);
    };

    const onUserLeft = (listener: (data: { userId: string; status: string }) => void) => {
        return socketClient.onUserLeft(listener);
    };

    const value: SocketContextType = {
        isConnected,
        isConnecting,
        connect,
        disconnect,
        joinEventRoom,
        leaveEventRoom,
        sendMessage,
        startTyping,
        stopTyping,
        onMessage,
        onUserTyping,
        onUserStoppedTyping,
        onUserJoined,
        onUserLeft,
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
} 