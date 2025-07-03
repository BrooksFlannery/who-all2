import { Event, Location } from '../db/types';
import { fetchAvailableEvents, fetchUserInterests, recordShownRecommendation } from './db-helpers';
import { calculateSimilarityScores } from './embeddings';

/**
 * Response structure for event recommendations
 * Contains the recommended events, a user-friendly message, and success status
 */
export interface RecommendationResponse {
    events: Event[];
    message: string;
    success: boolean;
    error?: string;
}

/**
 * Converts a database event object to the standardized Event type
 * This ensures type safety and consistent data structure across the application
 * 
 * @param dbEvent - Raw event data from the database
 * @returns Standardized Event object with proper typing
 */
function convertDbEventToEvent(dbEvent: any): Event {
    const converted = {
        id: dbEvent.id,
        title: dbEvent.title,
        date: dbEvent.date,
        location: dbEvent.location as Location,
        description: dbEvent.description,
        categories: dbEvent.categories as any as Event['categories'],
        hostId: dbEvent.hostId || undefined,
        createdAt: dbEvent.createdAt,
        updatedAt: dbEvent.updatedAt,
        attendeesCount: dbEvent.attendeesCount,
        interestedCount: dbEvent.interestedCount,
    };
    return converted;
}

/**
 * Main recommendation engine that provides personalized event suggestions
 * 
 * This function implements a sophisticated scoring algorithm that combines:
 * 1. Semantic similarity between user interests and event keywords
 * 2. User interest confidence and specificity scores
 * 3. Event popularity metrics
 * 4. Fallback strategies for users with no interests or events without keywords
 * 
 * Algorithm Overview:
 * - Fetches user interests and available events (excluding previously shown)
 * - If no user interests exist, falls back to popularity-based recommendations
 * - For users with interests: calculates semantic similarity using embeddings
 * - Scores each event using a weighted formula combining multiple factors
 * - Returns top-scoring events and records them as "shown" to prevent repetition
 * 
 * @param userId - Unique identifier for the user requesting recommendations
 * @param limit - Maximum number of events to recommend (default: 3)
 * @returns Promise resolving to RecommendationResponse with events and metadata
 */
export async function getEventRecommendations(
    userId: string,
    limit: number = 3
): Promise<RecommendationResponse> {
    try {
        // Step 1: Gather user data and available events
        const userInterests = await fetchUserInterests(userId);
        const interestKeywords = userInterests.map(interest => interest.keyword);

        // Fetch more events than needed to ensure good selection pool
        // We request 50 events but only return 'limit' number
        const availableEvents = await fetchAvailableEvents(userId, 50);

        // Early exit if no events are available
        if (availableEvents.length === 0) {
            return {
                events: [],
                message: "I don't have any events to recommend right now, but I'm working on finding more activities that match your interests!",
                success: true
            };
        }

        // Step 2: Handle users with no interests - fallback to popularity-based recommendations
        if (interestKeywords.length === 0) {
            // Sort events by combined popularity (interested + attending)
            const popularEvents = availableEvents
                .sort((a, b) => {
                    const aPopularity = a.interestedCount + a.attendeesCount;
                    const bPopularity = b.interestedCount + b.attendeesCount;
                    return bPopularity - aPopularity; // Descending order
                })
                .slice(0, limit);

            // Record these events as shown to prevent future repetition
            for (const event of popularEvents) {
                await recordShownRecommendation(userId, event.id, 0.5); // Lower score for non-personalized recommendations
            }

            const convertedEvents = popularEvents.map(convertDbEventToEvent);

            return {
                events: convertedEvents,
                message: `Here are some popular events you might enjoy!`,
                success: true
            };
        }

        // Step 3: Filter events to only those with keywords for semantic matching
        // Events without keywords cannot be semantically matched to user interests
        const eventsWithKeywords = availableEvents.filter(e => {
            const hasKeywords = e.keywords && e.keywords.length > 0;
            return hasKeywords;
        });

        // Step 4: Handle case where no events have keywords - fallback to popularity
        if (eventsWithKeywords.length === 0) {
            const popularEvents = availableEvents
                .sort((a, b) => {
                    const aPopularity = a.interestedCount + a.attendeesCount;
                    const bPopularity = b.interestedCount + b.attendeesCount;
                    return bPopularity - aPopularity;
                })
                .slice(0, limit);

            for (const event of popularEvents) {
                await recordShownRecommendation(userId, event.id, 0.5);
            }

            const convertedEvents = popularEvents.map(convertDbEventToEvent);

            return {
                events: convertedEvents,
                message: `Here are some popular events you might enjoy!`,
                success: true
            };
        }

        // Step 5: Calculate semantic similarity between user interests and event keywords
        // This is the core of our recommendation algorithm
        const allEventKeywords = eventsWithKeywords.flatMap(e => e.keywords || []);

        // Get similarity scores for all interest-keyword pairs
        // Returns a flat array in interest-major order: [interest1_keyword1, interest1_keyword2, ..., interest2_keyword1, ...]
        const similarityScores = await calculateSimilarityScores(interestKeywords, allEventKeywords);

        // Step 6: Build index mapping for efficient similarity score lookup
        // This maps each unique keyword to its position in the flattened allEventKeywords array
        const keywordIndexMap = new Map<string, number>();
        allEventKeywords.forEach((kw, idx) => {
            if (!keywordIndexMap.has(kw)) {
                keywordIndexMap.set(kw, idx);
            }
        });

        // Step 7: Calculate comprehensive scores for each event
        // This is where we combine multiple factors into a single recommendation score
        const eventScores: Array<{
            event: typeof eventsWithKeywords[0];
            score: number;
            matchReasons: string[];
        }> = [];

        for (const event of eventsWithKeywords) {
            const eventKeywords = event.keywords || [];
            const eventSimilarities: number[] = [];
            const matchReasons: string[] = [];

            // Step 7a: Extract similarity scores for this event's keywords
            // We need to map from the flat similarity array back to specific interest-keyword pairs
            for (const eventKeyword of eventKeywords) {
                const globalKeywordIdx = keywordIndexMap.get(eventKeyword);
                if (globalKeywordIdx === undefined) {
                    continue; // Skip if keyword not found (shouldn't happen with proper data)
                }

                // For each user interest, get the similarity score with this event keyword
                for (let interestIdx = 0; interestIdx < interestKeywords.length; interestIdx++) {
                    // Calculate the correct index in the flat similarity array
                    // Formula: (interest_index * total_keywords) + keyword_index
                    const similarityIdx = (interestIdx * allEventKeywords.length) + globalKeywordIdx;
                    const similarity = similarityScores[similarityIdx] || 0;
                    eventSimilarities.push(similarity);

                    // Collect match reasons for any positive similarity (no threshold filtering)
                    if (similarity > 0) {
                        const reason = `Matches your interest in "${interestKeywords[interestIdx]}"`;
                        matchReasons.push(reason);
                    }
                }
            }

            // Step 7b: Calculate average scores from user interest metadata
            // These provide context about how confident we are in the user's interests
            const avgConfidence = userInterests.reduce((sum, interest) => sum + parseFloat(interest.confidenceScore), 0) / userInterests.length;
            const avgSpecificity = userInterests.reduce((sum, interest) => sum + parseFloat(interest.specificityScore), 0) / userInterests.length;

            // Calculate average similarity score for this event
            const avgSimilarity = eventSimilarities.length > 0 ? eventSimilarities.reduce((sum, score) => sum + score, 0) / eventSimilarities.length : 0;

            // Step 7c: Calculate normalized popularity score
            // This ensures events with high engagement get a boost, but not overwhelming
            const maxPopularity = Math.max(...eventsWithKeywords.map(e => e.interestedCount + e.attendeesCount));
            const popularityScore = (event.interestedCount + event.attendeesCount) / (maxPopularity || 1);

            // Step 7d: Apply the final scoring formula
            // Weights: 50% similarity, 20% confidence, 20% specificity, 10% popularity
            // This balances personalization with social proof and interest quality
            const score = (0.5 * avgSimilarity) + (0.2 * avgConfidence) + (0.2 * avgSpecificity) + (0.1 * popularityScore);

            eventScores.push({
                event,
                score,
                matchReasons: [...new Set(matchReasons)] // Remove duplicate reasons
            });
        }

        // Step 8: Sort events by score and select top recommendations
        const topEvents = eventScores
            .sort((a, b) => b.score - a.score) // Descending order
            .slice(0, limit);

        // Step 9: Record these events as shown to prevent future repetition
        // Higher score (0.8) indicates these were personalized recommendations
        for (const { event } of topEvents) {
            await recordShownRecommendation(userId, event.id, 0.8);
        }

        // Step 10: Handle edge case where no events scored well
        if (topEvents.length === 0) {
            return {
                events: [],
                message: "I couldn't find any events that match your interests right now, but I'm working on finding more activities for you!",
                success: true
            };
        }

        // Step 11: Convert and return final recommendations
        const finalEvents = topEvents.map(({ event }) => convertDbEventToEvent(event));

        return {
            events: finalEvents,
            message: `I found ${topEvents.length} events that might interest you!`,
            success: true
        };

    } catch (error) {
        // Graceful error handling - return empty result rather than crashing
        return {
            events: [],
            message: "I'm having trouble finding events right now, but I'm working on it!",
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
} 