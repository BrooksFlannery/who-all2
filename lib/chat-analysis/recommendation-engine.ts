import { Event, Location } from '../db/types';
import { fetchAvailableEvents, fetchUserInterests, recordShownRecommendation } from './db-helpers';
import { calculateSimilarityScores } from './embeddings';

// New interface for recommendation responses
export interface RecommendationResponse {
    events: Event[];
    message: string;
    success: boolean;
    error?: string;
}

// Helper function to convert database event to Event type
function convertDbEventToEvent(dbEvent: any): Event {
    return {
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
}

/**
 * Get personalized event recommendations for a user based on their interests.
 * Returns full event objects with a conversational message.
 */
export async function getEventRecommendations(
    userId: string,
    limit: number = 3
): Promise<RecommendationResponse> {
    try {
        console.log(`🎪 Getting recommendations for user ${userId}`);

        // Fetch user interests from database
        const userInterests = await fetchUserInterests(userId);
        const interestKeywords = userInterests.map(interest => interest.keyword);

        console.log(`📊 User has ${interestKeywords.length} interests: ${interestKeywords.join(', ')}`);

        // Fetch events (excluding previously shown)
        const availableEvents = await fetchAvailableEvents(userId, 50); // Get more events for better selection
        console.log(`📋 Found ${availableEvents.length} available events`);

        if (availableEvents.length === 0) {
            console.log("❌ No events available");
            return {
                events: [],
                message: "I don't have any events to recommend right now, but I'm working on finding more activities that match your interests!",
                success: true
            };
        }

        // If user has no interests, fall back to popular events
        if (interestKeywords.length === 0) {
            console.log("📈 No user interests found, recommending popular events");
            const popularEvents = availableEvents
                .sort((a, b) => (b.interestedCount + b.attendeesCount) - (a.interestedCount + a.attendeesCount))
                .slice(0, limit);

            // Record shown recommendations
            for (const event of popularEvents) {
                await recordShownRecommendation(userId, event.id, 0.5); // Default score for popular events
            }

            console.log(`✅ Recommended ${popularEvents.length} popular events`);
            return {
                events: popularEvents.map(convertDbEventToEvent),
                message: `Here are some popular events you might enjoy!`,
                success: true
            };
        }

        // Calculate similarity scores for events with keywords
        const eventsWithKeywords = availableEvents.filter(e => e.keywords && e.keywords.length > 0);
        console.log(`🏷️  Found ${eventsWithKeywords.length} events with keywords`);

        // Log some sample events and their keywords
        if (eventsWithKeywords.length > 0) {
            console.log("📝 Sample events with keywords:");
            eventsWithKeywords.slice(0, 3).forEach((event, i) => {
                console.log(`  ${i + 1}. "${event.title}" - Keywords: [${event.keywords?.join(', ')}]`);
            });
        }

        if (eventsWithKeywords.length === 0) {
            // Fall back to popular events if no events have keywords
            console.log("📈 No events with keywords found, recommending popular events");
            const popularEvents = availableEvents
                .sort((a, b) => (b.interestedCount + b.attendeesCount) - (a.interestedCount + a.attendeesCount))
                .slice(0, limit);

            for (const event of popularEvents) {
                await recordShownRecommendation(userId, event.id, 0.5);
            }

            console.log(`✅ Recommended ${popularEvents.length} popular events (fallback)`);
            return {
                events: popularEvents.map(convertDbEventToEvent),
                message: `Here are some popular events you might enjoy!`,
                success: true
            };
        }

        // Calculate similarity scores
        const allEventKeywords = eventsWithKeywords.flatMap(e => e.keywords || []);
        console.log(`🔍 Calculating similarity between ${interestKeywords.length} user interests and ${allEventKeywords.length} event keywords`);
        console.log(`👤 User interests: [${interestKeywords.join(', ')}]`);
        console.log(`🎪 Event keywords sample: [${allEventKeywords.slice(0, 10).join(', ')}${allEventKeywords.length > 10 ? '...' : ''}]`);

        const similarityScores = await calculateSimilarityScores(interestKeywords, allEventKeywords);
        console.log(`📊 Got ${similarityScores.length} similarity scores`);

        // Calculate event scores using the scoring formula
        const eventScores: Array<{
            event: typeof eventsWithKeywords[0];
            score: number;
            matchReasons: string[];
        }> = [];

        let keywordIndex = 0;
        for (const event of eventsWithKeywords) {
            const eventKeywords = event.keywords || [];
            const eventSimilarities: number[] = [];
            const matchReasons: string[] = [];

            // Get similarity scores for this event's keywords
            for (const eventKeyword of eventKeywords) {
                for (const interestKeyword of interestKeywords) {
                    const similarity = similarityScores[keywordIndex++];
                    eventSimilarities.push(similarity);
                    if (similarity > 0.3) {
                        matchReasons.push(`Matches your interest in "${interestKeyword}"`);
                    }
                }
            }

            // Always calculate a score for every event, even if no strong matches
            const avgConfidence = userInterests.reduce((sum, interest) => sum + parseFloat(interest.confidenceScore), 0) / userInterests.length;
            const avgSpecificity = userInterests.reduce((sum, interest) => sum + parseFloat(interest.specificityScore), 0) / userInterests.length;
            const avgSimilarity = eventSimilarities.length > 0 ? eventSimilarities.reduce((sum, score) => sum + score, 0) / eventSimilarities.length : 0;

            // Popularity score (normalized)
            const maxPopularity = Math.max(...eventsWithKeywords.map(e => e.interestedCount + e.attendeesCount));
            const popularityScore = (event.interestedCount + event.attendeesCount) / (maxPopularity || 1);

            // Apply scoring formula: (0.5 * semantic_similarity) + (0.2 * confidence) + (0.2 * specificity) + (0.1 * popularity)
            const score = (0.5 * avgSimilarity) + (0.2 * avgConfidence) + (0.2 * avgSpecificity) + (0.1 * popularityScore);

            eventScores.push({
                event,
                score,
                matchReasons: [...new Set(matchReasons)] // Remove duplicates
            });
        }

        // Sort by score and take top results
        const topEvents = eventScores
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        console.log(`🎯 Found ${eventScores.length} events with matches, top ${topEvents.length} scores:`);
        topEvents.forEach(({ event, score, matchReasons }, i) => {
            console.log(`  ${i + 1}. "${event.title}" - Score: ${score.toFixed(3)}, Reasons: [${matchReasons.join(', ')}]`);
        });

        // Also log the scores for all returned events
        console.log('🔢 Returned event scores:');
        topEvents.forEach(({ event, score }, i) => {
            console.log(`  ${i + 1}. ${event.title} (score: ${score.toFixed(3)})`);
        });

        // Record shown recommendations
        for (const { event } of topEvents) {
            await recordShownRecommendation(userId, event.id, 0.8); // High score for personalized recommendations
        }

        if (topEvents.length === 0) {
            console.log("❌ No matching events found");
            console.log("🔍 Debug: eventScores array is empty, which means no events passed the similarity threshold");
            return {
                events: [],
                message: "I couldn't find any events that match your interests right now, but I'm working on finding more activities for you!",
                success: true
            };
        }

        console.log(`✅ Recommended ${topEvents.length} personalized events`);
        return {
            events: topEvents.map(({ event }) => convertDbEventToEvent(event)),
            message: `I found ${topEvents.length} events that might interest you!`,
            success: true
        };

    } catch (error) {
        console.error('❌ Error in getEventRecommendations:', error);
        return {
            events: [],
            message: "I'm having trouble finding events right now, but I'm working on it!",
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
} 