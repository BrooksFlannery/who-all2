import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { event, eventRecommendation, userProfile } from "../db/schema";
import { EventRecommendationResult, UserInterestNew } from "../db/types";

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
     * Now weighted by confidence and specificity
     */
    async calculateSimilarity(
        userInterests: UserInterestNew[],
        eventKeywords: string[]
    ): Promise<number> {
        if (userInterests.length === 0 || eventKeywords.length === 0) {
            return 0;
        }

        try {
            // Calculate weighted similarity score
            let totalWeightedScore = 0;
            let totalWeight = 0;

            for (const interest of userInterests) {
                // Calculate keyword similarity for this interest
                const keywordSimilarity = await this.calculateKeywordSimilarity(
                    interest.keyword,
                    eventKeywords
                );

                // Weight by confidence and specificity
                const weight = interest.confidence * interest.specificity;
                const weightedScore = keywordSimilarity * weight;

                totalWeightedScore += weightedScore;
                totalWeight += weight;
            }

            // Return normalized score
            return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
        } catch (error) {
            console.error("Error calculating similarity:", error);
            return 0;
        }
    }

    /**
     * Calculate similarity between a single keyword and event keywords
     */
    private async calculateKeywordSimilarity(
        keyword: string,
        eventKeywords: string[]
    ): Promise<number> {
        try {
            const prompt = `
Rate the similarity between this keyword and these event keywords (0-1):
Keyword: ${keyword}
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
            console.error("Error calculating keyword similarity:", error);
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
     * Updated to use new interest format with weighted scoring
     */
    async matchEventsToInterests(
        userId: string,
        userInterests: UserInterestNew[],
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

            for (const eventItem of availableEvents) {
                const eventKeywords = eventItem.keywords || [];

                if (userInterests.length === 0 || eventKeywords.length === 0) {
                    continue;
                }

                const similarityScore = await this.calculateSimilarity(
                    userInterests,
                    eventKeywords
                );

                // Apply popularity weighting
                const popularityScore = Math.min(
                    (eventItem.attendeesCount + eventItem.interestedCount) / 10,
                    0.3
                );

                const totalScore = similarityScore + popularityScore;

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
        interests: UserInterestNew[];
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
            // For now, return empty array since we're migrating to new schema
            const interests: UserInterestNew[] = [];

            const needsUpdate = false; // Will be updated when we implement new interest retrieval

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
                preferences: profileData.preferences || { distance_radius_km: 10, preferred_categories: [] }
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
        interests: UserInterestNew[]
    ): Promise<void> {
        try {
            if (!db) {
                console.error("Database not available");
                return;
            }

            // For now, just update the updatedAt timestamp
            // The actual interest storage will be handled by the new user_interests table
            await db
                .update(userProfile)
                .set({
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
    private shouldUpdateInterests(interests: UserInterestNew[]): boolean {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return interests.some(i => i.lastUpdated < twentyFourHoursAgo);
    }
} 