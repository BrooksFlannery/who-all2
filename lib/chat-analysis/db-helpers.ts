import { desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { event, userEventRecommendation, userInterest } from '../db/schema';

/**
 * Fetches all user interests from the database for a specific user
 * 
 * This function retrieves the user's interest profile that was built up through
 * conversations with the AI. Each interest includes confidence and specificity scores
 * that indicate how certain the AI was about the interest and how specific it is.
 * 
 * The interests are ordered by creation date (newest first) to prioritize
 * recently discovered interests in recommendations.
 * 
 * @param userId - Unique identifier for the user
 * @returns Promise resolving to array of user interest objects, or empty array if error
 */
export async function fetchUserInterests(userId: string) {
    if (!db) {
        return [];
    }

    try {
        const interests = await db
            .select()
            .from(userInterest)
            .where(eq(userInterest.userId, userId))
            .orderBy(desc(userInterest.createdAt)); // Newest interests first

        return interests;
    } catch (error) {
        return [];
    }
}

/**
 * Fetches available events for a user, excluding those they've already seen
 * 
 * This function implements a recommendation diversity strategy by:
 * 1. Fetching all events from the database
 * 2. Filtering out events the user has already been shown
 * 3. Returning a limited subset for recommendation processing
 * 
 * The "previously shown" tracking prevents the same events from being
 * recommended repeatedly, ensuring users see fresh content.
 * 
 * @param userId - Unique identifier for the user
 * @param limit - Maximum number of events to return (default: 10)
 * @returns Promise resolving to array of available events, or empty array if error
 */
export async function fetchAvailableEvents(userId: string, limit: number = 10) {
    if (!db) {
        return [];
    }

    try {
        // Step 1: Get list of events this user has already been shown
        // This prevents repetitive recommendations
        const shownEvents = await db
            .select({ eventId: userEventRecommendation.eventId })
            .from(userEventRecommendation)
            .where(eq(userEventRecommendation.userId, userId));

        const shownEventIds = new Set(shownEvents.map((e) => e.eventId));

        // Step 2: Fetch all events from database, ordered by popularity
        // We fetch more than needed to ensure good selection after filtering
        const rawEvents = await db
            .select()
            .from(event)
            .orderBy(desc(event.interestedCount)); // Most popular first

        // Step 3: Filter out previously shown events
        const unseenEvents = rawEvents.filter((e) => !shownEventIds.has(e.id));

        // Step 4: Return limited subset
        const finalEvents = unseenEvents.slice(0, limit);

        return finalEvents;
    } catch (error) {
        return [];
    }
}

/**
 * Stores a new user interest in the database
 * 
 * This function is called when the AI extracts interests from user messages.
 * Each interest includes metadata about the AI's confidence in the extraction
 * and how specific the interest is, which helps in recommendation scoring.
 * 
 * @param userId - Unique identifier for the user
 * @param keyword - The interest keyword (e.g., "rock climbing", "photography")
 * @param confidenceScore - AI's confidence in this interest (0-1)
 * @param specificityScore - How specific this interest is (0-1)
 * @param sourceMessageId - Optional ID of the message that generated this interest
 * @returns Promise resolving to boolean indicating success
 */
export async function storeUserInterest(
    userId: string,
    keyword: string,
    confidenceScore: number,
    specificityScore: number,
    sourceMessageId?: string
) {
    if (!db) {
        return false;
    }

    try {
        await db.insert(userInterest).values({
            userId,
            keyword,
            confidenceScore: confidenceScore.toString(), // Store as string for decimal precision
            specificityScore: specificityScore.toString(),
            sourceMessageId
        });
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Records that an event was shown to a user as a recommendation
 * 
 * This function maintains the user's recommendation history to prevent
 * showing the same events repeatedly. It also stores a recommendation score
 * that indicates how well the event matched the user's interests.
 * 
 * The recommendation score helps with:
 * - Preventing repetitive recommendations
 * - Future recommendation algorithm improvements
 * - User engagement analytics
 * 
 * @param userId - Unique identifier for the user
 * @param eventId - Unique identifier for the event that was shown
 * @param recommendationScore - Score indicating how well the event matched (0-1)
 * @returns Promise resolving to boolean indicating success
 */
export async function recordShownRecommendation(
    userId: string,
    eventId: string,
    recommendationScore: number
) {
    if (!db) {
        return false;
    }

    try {
        await db.insert(userEventRecommendation).values({
            userId,
            eventId,
            recommendationScore: recommendationScore.toString(), // Store as string for decimal precision
            shownAt: new Date() // Timestamp when the recommendation was shown
        });
        return true;
    } catch (error) {
        return false;
    }
} 