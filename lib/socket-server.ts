import { auth } from '@/lib/auth';
import { saveEventMessage } from '@/lib/db/event-messages';
import { getUserParticipationStatus } from '@/lib/db/event-participation';
import { Server as SocketIOServer } from 'socket.io';

// Extend Socket interface to include custom properties
declare module 'socket.io' {
    interface Socket {
        userId?: string;
        userName?: string;
        userImage?: string;
        currentEventId?: string | null;
    }
}

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
    status: string;
    user: {
        id: string;
        name: string;
        image?: string;
    };
}

// Store typing users per event room
const typingUsers = new Map<string, Map<string, { userId: string; userName: string; timer: NodeJS.Timeout }>>();

// Store user sessions for authentication
const userSessions = new Map<string, { userId: string; userName: string; userImage?: string }>();

class SocketServer {
    private io: SocketIOServer | null = null;
    private isInitialized = false;

    /**
     * Initialize the Socket.IO server
     */
    public initialize(server: any) {
        if (this.isInitialized) {
            console.log('Socket.IO server already initialized');
            return;
        }

        console.log('Initializing Socket.IO server...');

        this.io = new SocketIOServer(server, {
            cors: {
                origin: process.env.EXPO_PUBLIC_CLIENT_URL || "http://localhost:8081",
                methods: ["GET", "POST"],
                credentials: true
            },
            transports: ['websocket', 'polling'],
            allowEIO3: true,
        });

        this.setupMiddleware();
        this.setupEventHandlers();

        this.isInitialized = true;
        console.log('Socket.IO server initialized successfully');
    }

    /**
     * Set up authentication middleware
     */
    private setupMiddleware() {
        if (!this.io) return;

        this.io.use(async (socket, next) => {
            try {
                // --- Begin detailed logging ---
                console.log('--- Socket Auth Middleware ---');
                const authHeaders = socket.handshake.auth || {};
                const handshakeHeaders = socket.handshake.headers || {};
                console.log('Auth headers:', authHeaders);
                console.log('Handshake headers:', handshakeHeaders);

                // Try to extract token from multiple sources
                let token: string | null = null;
                let tokenSource = '';

                // 1. Check Bearer token in Authorization header
                const authz = handshakeHeaders['authorization'] || handshakeHeaders['Authorization'];
                if (authz && typeof authz === 'string' && authz.startsWith('Bearer ')) {
                    token = authz.replace('Bearer ', '').trim();
                    tokenSource = 'authorization header';
                }

                // 2. Check Cookie header for better-auth.session_token
                if (!token && handshakeHeaders['cookie']) {
                    const cookieHeader = handshakeHeaders['cookie'];
                    const match = cookieHeader.match(/better-auth\.session_token=([^;]+)/);
                    if (match) {
                        token = match[1];
                        tokenSource = 'cookie';
                    }
                }

                // 3. Check socket handshake auth.token (legacy/compat)
                if (!token && authHeaders.token) {
                    token = authHeaders.token;
                    tokenSource = 'handshake auth.token';
                }

                if (!token) {
                    console.warn('No auth token provided from any source');
                    return next(Object.assign(new Error('Auth failed: no token'), {
                        data: { step: 'no_token', socketId: socket.id }
                    }));
                }

                console.log(`Token found from ${tokenSource}:`, token ? token.substring(0, 10) + '...' : 'none');
                console.log(`Token length: ${token.length}`);

                // Verify the token using the auth system
                let session = null;
                try {
                    // Create headers object similar to what API routes receive
                    const headers = new Headers();
                    headers.set('authorization', `Bearer ${token}`);

                    // Also include the cookie if available
                    if (handshakeHeaders['cookie']) {
                        headers.set('cookie', handshakeHeaders['cookie'] as string);
                    }

                    session = await auth.api.getSession({ headers });
                } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                    console.error('Error calling auth.api.getSession:', err);
                    return next(Object.assign(new Error('Auth failed: session error'), {
                        data: { step: 'session_error', reason: errorMessage, socketId: socket.id }
                    }));
                }

                if (!session || !session.user?.id) {
                    console.log('Invalid session for token:', token ? token.substring(0, 10) + '...' : 'none');
                    return next(Object.assign(new Error('Auth failed: invalid token'), {
                        data: { step: 'invalid_token', reason: 'No valid session', socketId: socket.id }
                    }));
                }

                // Store user information in socket
                socket.userId = session.user.id;
                socket.userName = session.user.name || 'Anonymous';
                socket.userImage = (session.user.image as string | undefined) || undefined;

                // Store in user sessions map
                userSessions.set(socket.userId, {
                    userId: socket.userId,
                    userName: socket.userName,
                    userImage: socket.userImage || undefined
                });

                console.log(`User authenticated: ${socket.userId} (${socket.userName})`);
                next();
            } catch (error) {
                console.error('Socket authentication error:', error);
                next(new Error('Authentication failed'));
            }
        });
    }

    /**
     * Set up Socket.IO event handlers
     */
    private setupEventHandlers() {
        if (!this.io) return;

        this.io.on('connection', (socket) => {
            console.log(`User connected: ${socket.userId} (${socket.userName})`);

            // Handle joining event rooms
            socket.on('join-event', async (data: { eventId: string }) => {
                try {
                    const { eventId } = data;
                    const userId = socket.userId;
                    const userName = socket.userName || 'Anonymous';

                    if (!userId) {
                        socket.emit('error', { message: 'User not authenticated' });
                        return;
                    }

                    console.log(`User ${userId} joining event room: ${eventId}`);

                    // Check if user is participating in the event
                    const participation = await getUserParticipationStatus(eventId, userId);
                    if (!participation) {
                        console.log(`User ${userId} not participating in event ${eventId}`);
                        socket.emit('error', { message: 'Must join event to access chat' });
                        return;
                    }

                    // Join the event room
                    socket.join(`event-${eventId}`);
                    socket.currentEventId = eventId;

                    // Notify other users in the room
                    socket.to(`event-${eventId}`).emit('user-joined', {
                        userId: userId,
                        status: participation || 'attending',
                        user: {
                            id: userId,
                            name: userName,
                            image: socket.userImage || undefined
                        }
                    });

                    console.log(`User ${userId} joined event room: ${eventId}`);
                } catch (error) {
                    console.error('Error joining event room:', error);
                    socket.emit('error', { message: 'Failed to join event room' });
                }
            });

            // Handle leaving event rooms
            socket.on('leave-event', (data: { eventId: string }) => {
                const { eventId } = data;
                const userId = socket.userId;

                if (!userId) {
                    socket.emit('error', { message: 'User not authenticated' });
                    return;
                }

                console.log(`User ${userId} leaving event room: ${eventId}`);

                // Leave the event room
                socket.leave(`event-${eventId}`);

                // Clear typing status
                this.clearTypingStatus(eventId, userId);

                // Notify other users in the room
                socket.to(`event-${eventId}`).emit('user-left', {
                    userId: userId,
                    status: 'left'
                });

                socket.currentEventId = undefined;
                console.log(`User ${userId} left event room: ${eventId}`);
            });

            // Handle sending messages
            socket.on('send-message', async (data: { eventId: string; content: string }) => {
                try {
                    const { eventId, content } = data;
                    const userId = socket.userId;
                    const userName = socket.userName || 'Anonymous';

                    if (!userId) {
                        socket.emit('error', { message: 'User not authenticated' });
                        return;
                    }

                    console.log(`User ${userId} sending message to event: ${eventId}`);

                    // Validate message content
                    if (!content || content.trim().length === 0) {
                        socket.emit('error', { message: 'Message cannot be empty' });
                        return;
                    }

                    if (content.length > 1000) {
                        socket.emit('error', { message: 'Message too long (max 1000 characters)' });
                        return;
                    }

                    // Check if user is participating in the event
                    const participation = await getUserParticipationStatus(eventId, userId);
                    if (!participation) {
                        socket.emit('error', { message: 'Must join event to send messages' });
                        return;
                    }

                    // Save message to database
                    const message = await saveEventMessage(
                        eventId,
                        userId,
                        content.trim(),
                        userName,
                        socket.userImage || undefined
                    );

                    // Transform message for client
                    const messageForClient: EventMessage = {
                        id: message.id,
                        eventId: message.eventId,
                        userId: message.userId,
                        content: message.content,
                        userName: message.userName,
                        userImage: message.userImage!,
                        createdAt: message.createdAt.toISOString()
                    };

                    // Broadcast message to all users in the event room
                    this.io!.to(`event-${eventId}`).emit('new-message', messageForClient);

                    console.log(`Message sent by ${userId} to event ${eventId}`);
                } catch (error) {
                    console.error('Error sending message:', error);
                    socket.emit('error', { message: 'Failed to send message' });
                }
            });

            // Handle typing indicators
            socket.on('typing', (data: { eventId: string }) => {
                const { eventId } = data;
                const userId = socket.userId;
                const userName = socket.userName || 'Anonymous';

                if (!userId) {
                    socket.emit('error', { message: 'User not authenticated' });
                    return;
                }

                console.log(`User ${userId} typing in event: ${eventId}`);

                // Set typing status
                this.setTypingStatus(eventId, userId, userName);

                // Broadcast typing indicator to other users in the room
                socket.to(`event-${eventId}`).emit('user-typing', {
                    userId: userId,
                    userName: userName
                });
            });

            // Handle stop typing
            socket.on('stop-typing', (data: { eventId: string }) => {
                const { eventId } = data;
                const userId = socket.userId;

                if (!userId) {
                    socket.emit('error', { message: 'User not authenticated' });
                    return;
                }

                console.log(`User ${userId} stopped typing in event: ${eventId}`);

                // Clear typing status
                this.clearTypingStatus(eventId, userId);

                // Broadcast stop typing to other users in the room
                socket.to(`event-${eventId}`).emit('user-stopped-typing', userId);
            });

            // Handle disconnection
            socket.on('disconnect', (reason) => {
                const userId = socket.userId;
                const userName = socket.userName || 'Anonymous';
                const currentEventId = socket.currentEventId;

                console.log(`User disconnected: ${userId} (${userName}) - Reason: ${reason}`);

                // Clear typing status for all events
                if (currentEventId && userId) {
                    this.clearTypingStatus(currentEventId, userId);
                }

                // Remove from user sessions
                if (userId) {
                    userSessions.delete(userId);
                }

                // Notify other users in the current event room
                if (currentEventId && userId) {
                    socket.to(`event-${currentEventId}`).emit('user-left', {
                        userId: userId,
                        status: 'disconnected'
                    });
                }
            });
        });
    }

    /**
     * Set typing status for a user in an event
     */
    private setTypingStatus(eventId: string, userId: string, userName: string) {
        if (!typingUsers.has(eventId)) {
            typingUsers.set(eventId, new Map());
        }

        const eventTypingUsers = typingUsers.get(eventId)!;

        // Clear existing timer if any
        const existing = eventTypingUsers.get(userId);
        if (existing?.timer) {
            clearTimeout(existing.timer);
        }

        // Set new typing status with auto-clear timer
        const timer = setTimeout(() => {
            this.clearTypingStatus(eventId, userId);
        }, 5000) as unknown as NodeJS.Timeout; // Auto-clear after 5 seconds

        eventTypingUsers.set(userId, { userId, userName, timer });
    }

    /**
     * Clear typing status for a user in an event
     */
    private clearTypingStatus(eventId: string, userId: string) {
        const eventTypingUsers = typingUsers.get(eventId);
        if (!eventTypingUsers) return;

        const userTyping = eventTypingUsers.get(userId);
        if (userTyping?.timer) {
            clearTimeout(userTyping.timer);
        }

        eventTypingUsers.delete(userId);

        // Clean up empty event rooms
        if (eventTypingUsers.size === 0) {
            typingUsers.delete(eventId);
        }
    }

    /**
     * Get typing users for an event
     */
    public getTypingUsers(eventId: string): TypingUser[] {
        const eventTypingUsers = typingUsers.get(eventId);
        if (!eventTypingUsers) return [];

        return Array.from(eventTypingUsers.values()).map(({ userId, userName }) => ({
            userId,
            userName
        }));
    }

    /**
     * Broadcast participation update to event room
     */
    public broadcastParticipationUpdate(eventId: string, userId: string, status: string, user: any) {
        if (!this.io) return;

        this.io.to(`event-${eventId}`).emit('user-joined', {
            userId,
            status,
            user: {
                id: userId,
                name: user.name,
                image: user.image
            }
        });
    }

    /**
     * Broadcast user leaving event
     */
    public broadcastUserLeft(eventId: string, userId: string, status: string) {
        if (!this.io) return;

        this.io.to(`event-${eventId}`).emit('user-left', {
            userId,
            status
        });
    }

    /**
     * Get server instance
     */
    public getIO(): SocketIOServer | null {
        return this.io;
    }

    /**
     * Check if server is initialized
     */
    public isReady(): boolean {
        return this.isInitialized && this.io !== null;
    }
}

// Export singleton instance
export const socketServer = new SocketServer(); 