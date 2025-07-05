import { io, Socket } from 'socket.io-client';
import { getSocketAuthHeaders } from './auth-client';

// Types for Socket.IO events
export interface EventMessage {
    id: string;
    eventId: string;
    userId: string;
    content: string;
    userName: string;
    userImage?: string;
    createdAt: string;
}

export interface TypingUser {
    userId: string;
    userName: string;
}

export interface UserParticipationUpdate {
    userId: string;
    status: 'attending' | 'interested' | null;
    user: {
        id: string;
        name: string;
        image?: string;
    };
}

// Socket event types
export interface SocketEvents {
    // Message events
    'new-message': (message: EventMessage) => void;
    'user-typing': (data: TypingUser) => void;
    'user-stopped-typing': (userId: string) => void;

    // Participation events
    'user-joined': (data: UserParticipationUpdate) => void;
    'user-left': (data: { userId: string; status: string }) => void;

    // Connection events
    'connect': () => void;
    'disconnect': (reason: string) => void;
    'connect_error': (error: Error) => void;
}

class SocketClient {
    private socket: Socket | null = null;
    private isConnecting = false;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000; // Start with 1 second
    private currentEventId: string | null = null;
    private authToken: string | null = null;

    // Event listeners
    private messageListeners: ((message: EventMessage) => void)[] = [];
    private typingListeners: ((user: TypingUser) => void)[] = [];
    private stopTypingListeners: ((userId: string) => void)[] = [];
    private userJoinedListeners: ((data: UserParticipationUpdate) => void)[] = [];
    private userLeftListeners: ((data: { userId: string; status: string }) => void)[] = [];
    private connectionListeners: ((connected: boolean) => void)[] = [];

    constructor() {
        // Auto-reconnect logic
        this.setupReconnection();
    }

    private setupReconnection() {
        // Exponential backoff for reconnection
        const attemptReconnect = () => {
            if (this.reconnectAttempts < this.maxReconnectAttempts && this.authToken) {
                this.reconnectAttempts++;
                this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds

                setTimeout(() => {
                    this.connect(this.authToken!);
                }, this.reconnectDelay);
            }
        };

        // Listen for disconnection to trigger reconnection
        if (this.socket) {
            this.socket.on('disconnect', (reason) => {
                console.log('Socket disconnected:', reason);
                this.notifyConnectionChange(false);

                if (reason === 'io server disconnect') {
                    // Server disconnected us, don't auto-reconnect
                    return;
                }

                attemptReconnect();
            });
        }
    }

    public async connect(token?: string): Promise<void> {
        return new Promise(async (resolve, reject) => {
            if (this.socket?.connected) {
                resolve();
                return;
            }

            if (this.isConnecting) {
                reject(new Error('Connection already in progress'));
                return;
            }

            this.isConnecting = true;
            console.log('=== Socket Connection Attempt ===');

            try {
                // Get authentication headers
                const authHeaders = await getSocketAuthHeaders();
                if (!authHeaders) {
                    throw new Error('No authentication available');
                }

                // Store token for reconnection
                this.authToken = token || 'authenticated';

                console.log('🔥 SOCKET DEBUG:');
                console.log('  Auth headers:', Object.keys(authHeaders));
                console.log('  Token available:', !!token);

                // Get socket URL from environment or fallback
                const socketUrl = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3001';
                console.log('🔥 SOCKET DEBUG:');
                console.log('  URL:', socketUrl);
                console.log('  Env var:', process.env.EXPO_PUBLIC_SOCKET_URL || 'NOT SET');
                console.log('  Platform:', typeof window !== 'undefined' ? 'web' : 'native');

                // Create socket connection with authentication
                this.socket = io(socketUrl, {
                    auth: { token: authHeaders.Authorization?.replace('Bearer ', '') || authHeaders.Cookie?.match(/better-auth\.session_token=([^;]+)/)?.[1] },
                    transports: ['websocket', 'polling'],
                    timeout: 20000,
                    forceNew: true,
                    extraHeaders: authHeaders,
                });

                this.socket.on('connect', () => {
                    console.log('🔥 SOCKET CONNECTED!');
                    this.isConnecting = false;
                    this.reconnectAttempts = 0;
                    this.reconnectDelay = 1000;
                    this.notifyConnectionChange(true);

                    // Rejoin current event room if we were in one
                    if (this.currentEventId) {
                        this.joinEventRoom(this.currentEventId);
                    }

                    resolve();
                });

                this.socket.on('connect_error', (error) => {
                    console.error('🔥 SOCKET ERROR:');
                    console.error('  Message:', error.message);
                    console.error('  Type:', error.name);
                    console.error('  Details:', error);
                    this.isConnecting = false;
                    this.notifyConnectionChange(false);
                    reject(error);
                });

                this.socket.on('disconnect', (reason) => {
                    console.log('Socket disconnected:', reason);
                    this.notifyConnectionChange(false);
                });

                // Set up event listeners
                this.setupEventListeners();

            } catch (error) {
                this.isConnecting = false;
                reject(error);
            }
        });
    }

    private setupEventListeners() {
        if (!this.socket) return;

        // Message events
        this.socket.on('new-message', (message: EventMessage) => {
            console.log('Received new message:', message);
            this.messageListeners.forEach(listener => listener(message));
        });

        // Typing events
        this.socket.on('user-typing', (user: TypingUser) => {
            console.log('User typing:', user);
            this.typingListeners.forEach(listener => listener(user));
        });

        this.socket.on('user-stopped-typing', (userId: string) => {
            console.log('User stopped typing:', userId);
            this.stopTypingListeners.forEach(listener => listener(userId));
        });

        // Participation events
        this.socket.on('user-joined', (data: UserParticipationUpdate) => {
            console.log('User joined:', data);
            this.userJoinedListeners.forEach(listener => listener(data));
        });

        this.socket.on('user-left', (data: { userId: string; status: string }) => {
            console.log('User left:', data);
            this.userLeftListeners.forEach(listener => listener(data));
        });
    }

    public disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.currentEventId = null;
        this.authToken = null;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.notifyConnectionChange(false);
    }

    public joinEventRoom(eventId: string): void {
        if (!this.socket?.connected) {
            console.warn('Socket not connected, cannot join event room');
            return;
        }

        console.log('Joining event room:', eventId);
        this.socket.emit('join-event', { eventId });
        this.currentEventId = eventId;
    }

    public leaveEventRoom(eventId: string): void {
        if (!this.socket?.connected) {
            console.warn('Socket not connected, cannot leave event room');
            return;
        }

        console.log('Leaving event room:', eventId);
        this.socket.emit('leave-event', { eventId });

        if (this.currentEventId === eventId) {
            this.currentEventId = null;
        }
    }

    public sendMessage(eventId: string, content: string): void {
        if (!this.socket?.connected) {
            console.warn('Socket not connected, cannot send message');
            return;
        }

        console.log('Sending message to event:', eventId);
        this.socket.emit('send-message', { eventId, content });
    }

    public startTyping(eventId: string): void {
        if (!this.socket?.connected) {
            console.warn('Socket not connected, cannot send typing indicator');
            return;
        }

        this.socket.emit('typing', { eventId });
    }

    public stopTyping(eventId: string): void {
        if (!this.socket?.connected) {
            console.warn('Socket not connected, cannot send stop typing indicator');
            return;
        }

        this.socket.emit('stop-typing', { eventId });
    }

    // Event listener management
    public onMessage(listener: (message: EventMessage) => void): () => void {
        this.messageListeners.push(listener);
        return () => {
            this.messageListeners = this.messageListeners.filter(l => l !== listener);
        };
    }

    public onUserTyping(listener: (user: TypingUser) => void): () => void {
        this.typingListeners.push(listener);
        return () => {
            this.typingListeners = this.typingListeners.filter(l => l !== listener);
        };
    }

    public onUserStoppedTyping(listener: (userId: string) => void): () => void {
        this.stopTypingListeners.push(listener);
        return () => {
            this.stopTypingListeners = this.stopTypingListeners.filter(l => l !== listener);
        };
    }

    public onUserJoined(listener: (data: UserParticipationUpdate) => void): () => void {
        this.userJoinedListeners.push(listener);
        return () => {
            this.userJoinedListeners = this.userJoinedListeners.filter(l => l !== listener);
        };
    }

    public onUserLeft(listener: (data: { userId: string; status: string }) => void): () => void {
        this.userLeftListeners.push(listener);
        return () => {
            this.userLeftListeners = this.userLeftListeners.filter(l => l !== listener);
        };
    }

    public onConnectionChange(listener: (connected: boolean) => void): () => void {
        this.connectionListeners.push(listener);
        return () => {
            this.connectionListeners = this.connectionListeners.filter(l => l !== listener);
        };
    }

    private notifyConnectionChange(connected: boolean): void {
        this.connectionListeners.forEach(listener => listener(connected));
    }

    // Utility methods
    public isConnected(): boolean {
        return this.socket?.connected || false;
    }

    public getCurrentEventId(): string | null {
        return this.currentEventId;
    }
}

// Export singleton instance
export const socketClient = new SocketClient(); 