import { socketServer } from './socket-server';

/**
 * Broadcast user participation update to all users in an event room
 */
export async function broadcastParticipationUpdate(
    eventId: string,
    userId: string,
    status: string | null,
    user: { id: string; name: string; image?: string }
) {
    try {
        if (socketServer.isReady()) {
            if (status) {
                // User joined the event
                socketServer.broadcastParticipationUpdate(eventId, userId, status, user);
            } else {
                // User left the event
                socketServer.broadcastUserLeft(eventId, userId, 'left');
            }
            // Broadcasted participation update
        } else {
            // Socket.IO server not ready, skipping broadcast
        }
    } catch (error) {
        console.error('Error broadcasting participation update:', error);
    }
}

/**
 * Broadcast new message to all users in an event room
 */
export async function broadcastNewMessage(message: {
    id: string;
    eventId: string;
    userId: string;
    content: string;
    userName: string;
    userImage?: string;
    createdAt: string;
}) {
    try {
        if (socketServer.isReady()) {
            const io = socketServer.getIO();
            if (io) {
                io.to(`event-${message.eventId}`).emit('new-message', message);
                // Broadcasted new message
            }
        } else {
            // Socket.IO server not ready, skipping message broadcast
        }
    } catch (error) {
        console.error('Error broadcasting new message:', error);
    }
} 