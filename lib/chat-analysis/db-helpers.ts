import { desc, eq, notInArray } from 'drizzle-orm';
import { db } from '../db';
import { event, userEventRecommendation, userInterest } from '../db/schema';

/**
 * Fetch user interests from database
 */
export async function fetchUserInterests(userId: string) {
    if (!db) return [];

    try {
        const interests = await db
            .select()
            .from(userInterest)
            .where(eq(userInterest.userId, userId))
            .orderBy(desc(userInterest.createdAt));

        return interests;
    } catch (error) {
        console.error('Error fetching user interests:', error);
        return [];
    }
}

/**
 * Fetch events excluding previously shown ones
 */
export async function fetchAvailableEvents(userId: string, limit: number = 10) {
    if (!db) return [];

    try {
        // Get previously shown event IDs
        const shownEvents = await db
            .select({ eventId: userEventRecommendation.eventId })
            .from(userEventRecommendation)
            .where(eq(userEventRecommendation.userId, userId));

        const shownEventIds = shownEvents.map(e => e.eventId);

        // Fetch events not previously shown
        const events = await db
            .select()
            .from(event)
            .where(shownEventIds.length > 0 ? notInArray(event.id, shownEventIds) : undefined)
            .orderBy(desc(event.interestedCount))
            .limit(limit);

        return events;
    } catch (error) {
        console.error('Error fetching available events:', error);
        return [];
    }
}

/**
 * Store user interest in database
 */
export async function storeUserInterest(
    userId: string,
    keyword: string,
    confidenceScore: number,
    specificityScore: number,
    sourceMessageId?: string
) {
    if (!db) return false;

    try {
        await db.insert(userInterest).values({
            userId,
            keyword,
            confidenceScore: confidenceScore.toString(),
            specificityScore: specificityScore.toString(),
            sourceMessageId
        });
        return true;
    } catch (error) {
        console.error('Error storing user interest:', error);
        return false;
    }
}

/**
 * Record shown recommendation in database
 */
export async function recordShownRecommendation(
    userId: string,
    eventId: string,
    recommendationScore: number
) {
    if (!db) return false;

    try {
        await db.insert(userEventRecommendation).values({
            userId,
            eventId,
            recommendationScore: recommendationScore.toString(),
            shownAt: new Date()
        });
        return true;
    } catch (error) {
        console.error('Error recording shown recommendation:', error);
        return false;
    }
} 