import { openai } from '@ai-sdk/openai';
import { cosineSimilarity, embed, embedMany } from 'ai';
import { eq, isNotNull } from 'drizzle-orm';
import { db } from './db/index';
import { event, user } from './db/schema';

// Embedding model configuration
const EMBEDDING_MODEL = openai.embedding('text-embedding-3-small');
const EMBEDDING_DIMENSIONS = 1536;

/**
 * Generate embedding for a single text value
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const { embedding } = await embed({
            model: EMBEDDING_MODEL,
            value: text,
        });
        return embedding;
    } catch (error) {
        console.error('Error generating embedding:', error);
        throw new Error('Failed to generate embedding');
    }
}

/**
 * Generate embeddings for multiple text values
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
        const { embeddings } = await embedMany({
            model: EMBEDDING_MODEL,
            values: texts,
        });
        return embeddings;
    } catch (error) {
        console.error('Error generating embeddings:', error);
        throw new Error('Failed to generate embeddings');
    }
}

/**
 * Generate embedding for user interest summary and store in database
 */
export async function updateUserInterestEmbedding(userId: string, interestSummary: string): Promise<void> {
    if (!db) {
        console.error('Database not available');
        return;
    }

    try {
        const embedding = await generateEmbedding(interestSummary);

        await db.update(user)
            .set({
                interestEmbedding: JSON.stringify(embedding),
                updatedAt: new Date()
            })
            .where(eq(user.id, userId));

        console.log(`Updated interest embedding for user ${userId}`);
    } catch (error) {
        console.error('Error updating user interest embedding:', error);
        // Don't throw - fail gracefully as specified
    }
}

/**
 * Generate embedding for event and store in database
 */
export async function updateEventEmbedding(eventId: string, title: string, description: string, categories: string[]): Promise<void> {
    if (!db) {
        console.error('Database not available');
        return;
    }

    try {
        // Combine title, description, and categories for embedding
        const eventText = `${title} ${description} ${categories.join(' ')}`;
        const embedding = await generateEmbedding(eventText);

        await db.update(event)
            .set({
                embedding: JSON.stringify(embedding),
                updatedAt: new Date()
            })
            .where(eq(event.id, eventId));

        console.log(`Updated embedding for event ${eventId}`);
    } catch (error) {
        console.error('Error updating event embedding:', error);
        // Don't throw - fail gracefully as specified
    }
}

/**
 * Get event recommendations for a user based on similarity
 */
export async function getEventRecommendations(userId: string): Promise<Array<{
    id: string;
    title: string;
    description: string;
    similarity: number;
}>> {
    if (!db) {
        console.error('Database not available');
        return [];
    }

    try {
        // Get user's interest embedding
        const userResult = await db.select({ interestEmbedding: user.interestEmbedding })
            .from(user)
            .where(eq(user.id, userId))
            .limit(1);

        if (!userResult[0]?.interestEmbedding) {
            console.log(`No interest embedding found for user ${userId}`);
            return [];
        }

        const userEmbedding = JSON.parse(userResult[0].interestEmbedding) as number[];

        // Get all events with embeddings
        const events = await db.select({
            id: event.id,
            title: event.title,
            description: event.description,
            embedding: event.embedding
        })
            .from(event)
            .where(isNotNull(event.embedding));

        // Calculate similarities
        const recommendations = events
            .filter(e => e.embedding)
            .map(e => {
                const eventEmbedding = JSON.parse(e.embedding!) as number[];
                const similarity = cosineSimilarity(userEmbedding, eventEmbedding);
                return {
                    id: e.id,
                    title: e.title,
                    description: e.description,
                    similarity
                };
            })
            .sort((a, b) => b.similarity - a.similarity); // Sort by similarity descending

        // Limit to top 15 recommendations
        const topRecommendations = recommendations.slice(0, 15);

        // Update user's cached recommendations
        await updateUserRecommendedEvents(userId, topRecommendations.map(r => r.id));

        // Console log results as specified
        console.log('🎯 Event Recommendations:');
        console.log(`📊 Found ${recommendations.length} events with embeddings`);
        console.log(`👤 Comparing against user ${userId}`);
        console.log(`📝 Caching top ${topRecommendations.length} recommendations`);
        topRecommendations.forEach((rec, index) => {
            console.log(`#${index + 1} ${rec.title}: ${rec.similarity.toFixed(4)}`);
            console.log(`  📝 ${rec.description}`);
        });

        return topRecommendations;
    } catch (error) {
        console.error('Error getting event recommendations:', error);
        return [];
    }
}

/**
 * Update user's cached recommended event IDs
 */
async function updateUserRecommendedEvents(userId: string, eventIds: string[]): Promise<void> {
    if (!db) return;

    try {
        await db.update(user)
            .set({
                recommendedEventIds: eventIds,
                updatedAt: new Date()
            })
            .where(eq(user.id, userId));

        console.log(`Updated cached recommendations for user ${userId}: ${eventIds.length} events`);
    } catch (error) {
        console.error('Error updating user recommended events:', error);
        // Don't throw - fail gracefully
    }
}

/**
 * Generate embeddings for all events in the database
 */
export async function generateAllEventEmbeddings(): Promise<void> {
    if (!db) {
        console.error('Database not available');
        return;
    }

    try {
        const events = await db.select({
            id: event.id,
            title: event.title,
            description: event.description,
            categories: event.categories
        })
            .from(event);

        console.log(`Generating embeddings for ${events.length} events...`);

        for (const eventData of events) {
            await updateEventEmbedding(
                eventData.id,
                eventData.title,
                eventData.description,
                eventData.categories
            );
        }

        console.log('Finished generating all event embeddings');
    } catch (error) {
        console.error('Error generating all event embeddings:', error);
    }
} 