import { and, eq } from 'drizzle-orm';
import { initializeDatabase } from './index';
import { event, eventParticipation, user } from './schema';
import { EventParticipation } from './types';

/**
 * Join or leave an event
 * @param eventId - The event ID
 * @param userId - The user ID
 * @param status - 'attending', 'interested', or null to leave
 * @returns Promise<{ success: boolean, newCounts: { attending: number, interested: number } }>
 */
export async function updateEventParticipation(
    eventId: string,
    userId: string,
    status: 'attending' | 'interested' | null
): Promise<{ success: boolean, newCounts: { attending: number, interested: number } }> {
    const db = initializeDatabase();
    if (!db) {
        throw new Error('Database not available');
    }

    try {
        // If status is null, remove participation
        if (status === null) {
            await db.delete(eventParticipation).where(
                and(
                    eq(eventParticipation.eventId, eventId),
                    eq(eventParticipation.userId, userId)
                )
            );
        } else {
            // Insert or update participation
            await db.insert(eventParticipation).values({
                eventId,
                userId,
                status,
                joinedAt: new Date()
            }).onConflictDoUpdate({
                target: [eventParticipation.eventId, eventParticipation.userId],
                set: { status, joinedAt: new Date() }
            });
        }

        // Get updated counts
        const counts = await getEventParticipationCounts(eventId);

        // Update event table counts
        await db.update(event).set({
            attendeesCount: counts.attending,
            interestedCount: counts.interested,
            updatedAt: new Date()
        }).where(eq(event.id, eventId));

        return {
            success: true,
            newCounts: counts
        };
    } catch (error) {
        console.error('Error updating event participation:', error);
        throw error;
    }
}

/**
 * Get participation counts for an event
 * @param eventId - The event ID
 * @returns Promise<{ attending: number, interested: number }>
 */
export async function getEventParticipationCounts(eventId: string): Promise<{ attending: number, interested: number }> {
    const db = initializeDatabase();
    if (!db) {
        throw new Error('Database not available');
    }

    try {
        const attendingCount = await db
            .select({ count: eventParticipation.id })
            .from(eventParticipation)
            .where(
                and(
                    eq(eventParticipation.eventId, eventId),
                    eq(eventParticipation.status, 'attending')
                )
            );

        const interestedCount = await db
            .select({ count: eventParticipation.id })
            .from(eventParticipation)
            .where(
                and(
                    eq(eventParticipation.eventId, eventId),
                    eq(eventParticipation.status, 'interested')
                )
            );

        return {
            attending: attendingCount.length,
            interested: interestedCount.length
        };
    } catch (error) {
        console.error('Error getting participation counts:', error);
        throw error;
    }
}

/**
 * Get user's participation status for an event
 * @param eventId - The event ID
 * @param userId - The user ID
 * @returns Promise<'attending' | 'interested' | null>
 */
export async function getUserParticipationStatus(eventId: string, userId: string): Promise<'attending' | 'interested' | null> {
    const db = initializeDatabase();
    if (!db) {
        throw new Error('Database not available');
    }

    try {
        const result = await db
            .select({ status: eventParticipation.status })
            .from(eventParticipation)
            .where(
                and(
                    eq(eventParticipation.eventId, eventId),
                    eq(eventParticipation.userId, userId)
                )
            );

        return result.length > 0 ? result[0].status : null;
    } catch (error) {
        console.error('Error getting user participation status:', error);
        throw error;
    }
}

/**
 * Get all participants for an event with user details
 * @param eventId - The event ID
 * @returns Promise<{ attending: any[], interested: any[] }>
 */
export async function getEventParticipants(eventId: string): Promise<{ attending: any[], interested: any[] }> {
    const db = initializeDatabase();
    if (!db) {
        throw new Error('Database not available');
    }

    try {
        const attending = await db
            .select({
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
                joinedAt: eventParticipation.joinedAt
            })
            .from(eventParticipation)
            .innerJoin(user, eq(eventParticipation.userId, user.id))
            .where(
                and(
                    eq(eventParticipation.eventId, eventId),
                    eq(eventParticipation.status, 'attending')
                )
            )
            .orderBy(eventParticipation.joinedAt);

        const interested = await db
            .select({
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
                joinedAt: eventParticipation.joinedAt
            })
            .from(eventParticipation)
            .innerJoin(user, eq(eventParticipation.userId, user.id))
            .where(
                and(
                    eq(eventParticipation.eventId, eventId),
                    eq(eventParticipation.status, 'interested')
                )
            )
            .orderBy(eventParticipation.joinedAt);

        return { attending, interested };
    } catch (error) {
        console.error('Error getting event participants:', error);
        throw error;
    }
}

/**
 * Get events that a user is participating in
 * @param userId - The user ID
 * @param status - Optional filter by status
 * @returns Promise<EventParticipation[]>
 */
export async function getUserParticipations(
    userId: string,
    status?: 'attending' | 'interested'
): Promise<EventParticipation[]> {
    const db = initializeDatabase();
    if (!db) {
        throw new Error('Database not available');
    }

    try {
        const conditions = [eq(eventParticipation.userId, userId)];

        if (status) {
            conditions.push(eq(eventParticipation.status, status));
        }

        const result = await db
            .select()
            .from(eventParticipation)
            .where(and(...conditions))
            .orderBy(eventParticipation.joinedAt);

        return result;
    } catch (error) {
        console.error('Error getting user participations:', error);
        throw error;
    }
} 