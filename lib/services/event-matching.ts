import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { event, eventRecommendation, userProfile } from "../db/schema";
import { EventRecommendationResult, UserInterests } from "../db/types";

export class EventMatchingService {
    private static instance: EventMatchingService;

    private constructor() { }

    public static getInstance(): EventMatchingService {
        if (!EventMatchingService.instance) {
            EventMatchingService.instance = new EventMatchingService();
        }
        return EventMatchingService.instance;
    }

    /**
     * Calculate similarity score between user interests and event keywords
     */
    async calculateSimilarity(
        userInterests: string[],
        eventKeywords: string[]
    ): Promise<number> {
        if (userInterests.length === 0 || eventKeywords.length === 0) {
            return 0;
        }

        try {
            const prompt = `
Rate the similarity between these interests (0-1):
User Interests: ${userInterests.join(', ')}
Event Keywords: ${eventKeywords.join(', ')}

Consider related activities, synonyms, and broader categories.
Return only a number between 0 and 1.`;

            const result = await generateText({
                model: openai("gpt-4o-mini"),
                prompt,
                maxTokens: 50,
            });

            const similarity = parseFloat(result.text.trim());
            return isNaN(similarity) ? 0 : Math.max(0, Math.min(1, similarity));
        } catch (error) {
            console.error("Error calculating similarity:", error);
            return 0;
        }
    }

    /**
 * Get previously recommended events for a user
 */
    async getPreviouslyRecommendedEvents(userId: string): Promise<string[]> {
        try {
            if (!db) {
                console.error("Database not available");
                return [];
            }

            const recommendations = await db
                .select({ eventId: eventRecommendation.eventId })
                .from(eventRecommendation)
                .where(eq(eventRecommendation.userId, userId));

            return recommendations.map(r => r.eventId);
        } catch (error) {
            console.error("Error fetching previously recommended events:", error);
            return [];
        }
    }

    /**
 * Match user interests to events using semantic similarity
 */
    async matchEventsToInterests(
        userId: string,
        userInterests: UserInterests,
        maxResults: number = 5
    ): Promise<EventRecommendationResult[]> {
        try {
            if (!db) {
                console.error("Database not available");
                return [];
            }

            // Get all events and filter for those with keywords
            const allEvents = await db.select().from(event);
            const events = allEvents.filter(event => event.keywords && event.keywords.length > 0);

            if (events.length === 0) {
                console.log("No events found with keywords");
                return [];
            }

            // Get previously recommended events
            const previouslyRecommended = await this.getPreviouslyRecommendedEvents(userId);

            // Filter out previously recommended events
            const availableEvents = events.filter(
                event => !previouslyRecommended.includes(event.id)
            );

            if (availableEvents.length === 0) {
                return [];
            }

            // Calculate similarity scores for each event
            const eventScores: Array<{
                event: typeof events[0];
                score: number;
            }> = [];

            console.log(`Processing ${availableEvents.length} events for user interests:`, {
                broad: userInterests.broad,
                specific: userInterests.specific
            });

            for (const eventItem of availableEvents) {
                const eventKeywords = eventItem.keywords || [];
                const allUserInterests = [
                    ...userInterests.broad,
                    ...userInterests.specific
                ];

                if (allUserInterests.length === 0 || eventKeywords.length === 0) {
                    console.log(`Skipping event "${eventItem.title}" - no interests or keywords`);
                    continue;
                }

                console.log(`Calculating similarity for "${eventItem.title}" with keywords:`, eventKeywords);

                const similarityScore = await this.calculateSimilarity(
                    allUserInterests,
                    eventKeywords
                );

                // Apply popularity weighting
                const popularityScore = Math.min(
                    (eventItem.attendeesCount + eventItem.interestedCount) / 10,
                    0.3
                );

                const totalScore = similarityScore + popularityScore;

                console.log(`Event "${eventItem.title}" - Similarity: ${similarityScore}, Popularity: ${popularityScore}, Total: ${totalScore}`);

                if (totalScore > 0.3) { // Only include events with reasonable match
                    eventScores.push({
                        event: eventItem,
                        score: totalScore
                    });
                }
            }

            // Sort by score and return top results
            const matchedEvents = eventScores
                .sort((a, b) => b.score - a.score)
                .slice(0, maxResults)
                .map(({ event: eventItem, score }) => ({
                    id: eventItem.id,
                    title: eventItem.title,
                    description: eventItem.description,
                    categories: eventItem.categories,
                    attendeesCount: eventItem.attendeesCount,
                    interestedCount: eventItem.interestedCount,
                    location: eventItem.location as { neighborhood?: string },
                    similarityScore: score
                }));

            if (matchedEvents.length === 0) {
                console.log("No matching events found, returning popular events as fallback");
                // Return popular events as fallback
                const popularEvents = allEvents
                    .sort((a, b) => (b.attendeesCount + b.interestedCount) - (a.attendeesCount + a.interestedCount))
                    .slice(0, maxResults)
                    .map(eventItem => ({
                        id: eventItem.id,
                        title: eventItem.title,
                        description: eventItem.description,
                        categories: eventItem.categories,
                        attendeesCount: eventItem.attendeesCount,
                        interestedCount: eventItem.interestedCount,
                        location: eventItem.location as { neighborhood?: string },
                        similarityScore: 0.1 // Low similarity score for fallback
                    }));
                return popularEvents;
            }

            return matchedEvents;
        } catch (error) {
            console.error("Error matching events to interests:", error);
            return [];
        }
    }

    /**
 * Record an event recommendation for a user
 */
    async recordRecommendation(
        userId: string,
        eventId: string,
        context?: string
    ): Promise<void> {
        try {
            if (!db) {
                console.error("Database not available");
                return;
            }

            await db.insert(eventRecommendation).values({
                userId,
                eventId,
                context
            });
        } catch (error) {
            console.error("Error recording event recommendation:", error);
        }
    }

    /**
 * Get user profile with interests
 */
    async getUserProfile(userId: string): Promise<{
        interests: UserInterests;
        needsUpdate: boolean;
    } | null> {
        try {
            if (!db) {
                console.error("Database not available");
                return null;
            }

            const profile = await db
                .select()
                .from(userProfile)
                .where(eq(userProfile.userId, userId))
                .limit(1);

            if (profile.length === 0) {
                return null;
            }

            const userProfileData = profile[0];
            const interests: UserInterests = {
                broad: userProfileData.interests || [],
                specific: [],
                scores: (userProfileData.interestScores as Record<string, number>) || {},
                lastUpdated: userProfileData.lastInterestUpdate || new Date()
            };

            const needsUpdate = this.shouldUpdateInterests(interests);

            return { interests, needsUpdate };
        } catch (error) {
            console.error("Error fetching user profile:", error);
            return null;
        }
    }

    /**
     * Create a new user profile
     */
    async createUserProfile(
        userId: string,
        profileData: {
            name: string;
            location: { lat: number; lng: number };
            interests?: string[];
            preferences?: { distance_radius_km: number; preferred_categories: string[] };
        }
    ): Promise<void> {
        try {
            if (!db) {
                console.error("Database not available");
                return;
            }

            await db.insert(userProfile).values({
                userId,
                name: profileData.name,
                location: profileData.location,
                interests: profileData.interests || [],
                preferences: profileData.preferences || { distance_radius_km: 10, preferred_categories: [] },
                interestsJson: {},
                interestScores: {},
                lastInterestUpdate: new Date()
            });
        } catch (error) {
            console.error("Error creating user profile:", error);
        }
    }

    /**
 * Update user profile with new interests
 */
    async updateUserProfile(
        userId: string,
        interests: UserInterests
    ): Promise<void> {
        try {
            if (!db) {
                console.error("Database not available");
                return;
            }

            await db
                .update(userProfile)
                .set({
                    interestsJson: interests,
                    interestScores: interests.scores,
                    lastInterestUpdate: interests.lastUpdated,
                    updatedAt: new Date()
                })
                .where(eq(userProfile.userId, userId));
        } catch (error) {
            console.error("Error updating user profile:", error);
        }
    }

    /**
     * Check if interests need updating (older than 24 hours)
     */
    private shouldUpdateInterests(interests: UserInterests): boolean {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return interests.lastUpdated < twentyFourHoursAgo;
    }
} 