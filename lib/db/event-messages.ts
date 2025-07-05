import { and, desc, eq, lt } from 'drizzle-orm';
import { initializeDatabase } from './index';
import { eventMessage } from './schema';
import { EventMessage } from './types';

/**
 * Save a new message to an event
 * @param eventId - The event ID
 * @param userId - The user ID
 * @param content - The message content
 * @param userName - The user's name
 * @param userImage - The user's profile image URL (optional)
 * @returns Promise<EventMessage>
 */
export async function saveEventMessage(
    eventId: string,
    userId: string,
    content: string,
    userName: string,
    userImage?: string
): Promise<EventMessage> {
    const db = initializeDatabase();
    if (!db) {
        throw new Error('Database not available');
    }

    try {
        const [result] = await db.insert(eventMessage).values({
            eventId,
            userId,
            content,
            userName,
            userImage: userImage || null,
            createdAt: new Date()
        }).returning();

        if (!result) {
            throw new Error('Failed to save message');
        }

        return result;
    } catch (error) {
        console.error('Error saving event message:', error);
        throw error;
    }
}

/**
 * Get messages for an event with pagination
 * @param eventId - The event ID
 * @param limit - Number of messages to return (default: 20)
 * @param before - Get messages before this timestamp (for pagination)
 * @returns Promise<{ messages: EventMessage[], hasMore: boolean }>
 */
export async function getEventMessages(
    eventId: string,
    limit: number = 20,
    before?: Date
): Promise<{ messages: EventMessage[], hasMore: boolean }> {
    const db = initializeDatabase();
    if (!db) {
        throw new Error('Database not available');
    }

    try {
        const conditions = [eq(eventMessage.eventId, eventId)];

        if (before) {
            conditions.push(lt(eventMessage.createdAt, before));
        }

        const messages = await db
            .select()
            .from(eventMessage)
            .where(and(...conditions))
            .orderBy(desc(eventMessage.createdAt))
            .limit(limit + 1); // Get one extra to check if there are more

        const hasMore = messages.length > limit;
        const resultMessages = hasMore ? messages.slice(0, limit) : messages;

        return {
            messages: resultMessages.reverse(), // Return in chronological order
            hasMore
        };
    } catch (error) {
        console.error('Error getting event messages:', error);
        throw error;
    }
}

/**
 * Get the most recent messages for an event
 * @param eventId - The event ID
 * @param limit - Number of messages to return (default: 20)
 * @returns Promise<EventMessage[]>
 */
export async function getRecentEventMessages(
    eventId: string,
    limit: number = 20
): Promise<EventMessage[]> {
    const db = initializeDatabase();
    if (!db) {
        throw new Error('Database not available');
    }

    try {
        const messages = await db
            .select()
            .from(eventMessage)
            .where(eq(eventMessage.eventId, eventId))
            .orderBy(desc(eventMessage.createdAt))
            .limit(limit);

        return messages.reverse(); // Return in chronological order
    } catch (error) {
        console.error('Error getting recent event messages:', error);
        throw error;
    }
}

/**
 * Delete old messages for events (cleanup function)
 * @param daysOld - Delete messages older than this many days (default: 30)
 * @returns Promise<number> - Number of messages deleted
 */
export async function cleanupOldMessages(daysOld: number = 30): Promise<number> {
    const db = initializeDatabase();
    if (!db) {
        throw new Error('Database not available');
    }

    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const result = await db
            .delete(eventMessage)
            .where(lt(eventMessage.createdAt, cutoffDate));

        return result.rowCount || 0;
    } catch (error) {
        console.error('Error cleaning up old messages:', error);
        throw error;
    }
}

/**
 * Get message count for an event
 * @param eventId - The event ID
 * @returns Promise<number>
 */
export async function getEventMessageCount(eventId: string): Promise<number> {
    const db = initializeDatabase();
    if (!db) {
        throw new Error('Database not available');
    }

    try {
        const result = await db
            .select({ count: eventMessage.id })
            .from(eventMessage)
            .where(eq(eventMessage.eventId, eventId));

        return result.length;
    } catch (error) {
        console.error('Error getting event message count:', error);
        throw error;
    }
} 