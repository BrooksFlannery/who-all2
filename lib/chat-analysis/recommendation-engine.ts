import { fetchAvailableEvents, fetchUserInterests, recordShownRecommendation } from './db-helpers';
import { calculateSimilarityScores } from './embeddings';

/**
 * Get personalized event recommendations for a user based on their interests.
 * Returns a conversational string with formatted recommendations.
 */
export async function getEventRecommendations(
    userId: string,
    limit: number = 3
): Promise<string> {
    try {
        console.log(`🎪 Getting recommendations for user ${userId}`);

        // Fetch user interests from database
        const userInterests = await fetchUserInterests(userId);
        const interestKeywords = userInterests.map(interest => interest.keyword);

        console.log(`📊 User has ${interestKeywords.length} interests: ${interestKeywords.join(', ')}`);

        // Fetch events (excluding previously shown)
        const availableEvents = await fetchAvailableEvents(userId, 50); // Get more events for better selection

        if (availableEvents.length === 0) {
            console.log("❌ No events available");
            return "I don't have any events to recommend right now, but I'm working on finding more activities that match your interests!";
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

            const eventList = popularEvents.map(event =>
                `• ${event.title} - ${event.description}`
            ).join('\n');

            console.log(`✅ Recommended ${popularEvents.length} popular events`);
            return `Here are some popular events you might enjoy:\n\n${eventList}\n\nWould you like to know more about any of these?`;
        }

        // Calculate similarity scores for events with keywords
        const eventsWithKeywords = availableEvents.filter(e => e.keywords && e.keywords.length > 0);

        if (eventsWithKeywords.length === 0) {
            // Fall back to popular events if no events have keywords
            console.log("📈 No events with keywords found, recommending popular events");
            const popularEvents = availableEvents
                .sort((a, b) => (b.interestedCount + b.attendeesCount) - (a.interestedCount + a.attendeesCount))
                .slice(0, limit);

            for (const event of popularEvents) {
                await recordShownRecommendation(userId, event.id, 0.5);
            }

            const eventList = popularEvents.map(event =>
                `• ${event.title} - ${event.description}`
            ).join('\n');

            console.log(`✅ Recommended ${popularEvents.length} popular events (fallback)`);
            return `Here are some popular events you might enjoy:\n\n${eventList}\n\nWould you like to know more about any of these?`;
        }

        // Calculate similarity scores
        const allEventKeywords = eventsWithKeywords.flatMap(e => e.keywords || []);
        const similarityScores = await calculateSimilarityScores(interestKeywords, allEventKeywords);

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
                    if (similarity > 0.3) { // Threshold for meaningful similarity
                        eventSimilarities.push(similarity);
                        matchReasons.push(`Matches your interest in "${interestKeyword}"`);
                    }
                }
            }

            if (eventSimilarities.length > 0) {
                // Calculate average scores for this event
                const avgConfidence = userInterests.reduce((sum, interest) => sum + parseFloat(interest.confidenceScore), 0) / userInterests.length;
                const avgSpecificity = userInterests.reduce((sum, interest) => sum + parseFloat(interest.specificityScore), 0) / userInterests.length;
                const avgSimilarity = eventSimilarities.reduce((sum, score) => sum + score, 0) / eventSimilarities.length;

                // Popularity score (normalized)
                const maxPopularity = Math.max(...eventsWithKeywords.map(e => e.interestedCount + e.attendeesCount));
                const popularityScore = (event.interestedCount + event.attendeesCount) / maxPopularity;

                // Apply scoring formula: (0.5 * semantic_similarity) + (0.2 * confidence) + (0.2 * specificity) + (0.1 * popularity)
                const score = (0.5 * avgSimilarity) + (0.2 * avgConfidence) + (0.2 * avgSpecificity) + (0.1 * popularityScore);

                eventScores.push({
                    event,
                    score,
                    matchReasons: [...new Set(matchReasons)] // Remove duplicates
                });
            }
        }

        // Sort by score and take top results
        const topEvents = eventScores
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        // Record shown recommendations
        for (const { event } of topEvents) {
            await recordShownRecommendation(userId, event.id, 0.8); // High score for personalized recommendations
        }

        if (topEvents.length === 0) {
            console.log("❌ No matching events found");
            return "I couldn't find any events that match your interests right now, but I'm working on finding more activities for you!";
        }

        const eventList = topEvents.map(({ event, score, matchReasons }) =>
            `• ${event.title} - ${event.description}`
        ).join('\n');

        console.log(`✅ Recommended ${topEvents.length} personalized events`);
        return `Here are some events that match your interests:\n\n${eventList}\n\nWould you like to know more about any of these?`;

    } catch (error) {
        console.error('❌ Error in getEventRecommendations:', error);
        return "I'm having trouble finding events right now, but I'm working on it!";
    }
} 