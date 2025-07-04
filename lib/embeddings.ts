import { openai } from '@ai-sdk/openai';
import { cosineSimilarity, embed, embedMany, generateText } from 'ai';
import { eq, isNotNull } from 'drizzle-orm';
import { initializeDatabase } from './db/index';
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
export async function updateUserInterestEmbedding(userId: string, conversationContext: string, existingWeightedInterests?: string): Promise<void> {
    const database = initializeDatabase();
    if (!database) {
        console.error('Database not available');
        return;
    }

    try {
        // Generate weighted interest profile from conversation context and existing interests
        const weightedInterests = await generateWeightedInterests(conversationContext, existingWeightedInterests);

        // Use weighted interests for embedding generation
        const embedding = await generateEmbedding(weightedInterests);

        // Store weighted interests (replacing user summary)
        await database.update(user)
            .set({
                weightedInterests: weightedInterests,
                interestEmbedding: JSON.stringify(embedding),
                updatedAt: new Date()
            })
            .where(eq(user.id, userId));


    } catch (error) {
        console.error('Error updating user interest embedding:', error);
        // Don't throw - fail gracefully as specified
    }
}

/**
 * Generate embedding for event and store in database
 */
export async function updateEventEmbedding(eventId: string, title: string, description: string, categories: string[]): Promise<void> {
    const database = initializeDatabase();
    if (!database) {
        console.error('Database not available');
        return;
    }

    try {
        // Generate embedding description from human description
        const embeddingDescription = await generateEmbeddingDescription(description);

        // Use embedding description for embedding generation
        const embedding = await generateEmbedding(embeddingDescription);

        // Store both human description and embedding description
        await database.update(event)
            .set({
                description: description, // Keep human-readable version
                embeddingDescription: embeddingDescription,
                embedding: JSON.stringify(embedding),
                updatedAt: new Date()
            })
            .where(eq(event.id, eventId));


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
    const database = initializeDatabase();
    if (!database) {
        console.error('Database not available');
        return [];
    }

    try {
        // Get user's weighted interests and interest embedding
        const userResult = await database.select({
            interestEmbedding: user.interestEmbedding,
            weightedInterests: user.weightedInterests
        })
            .from(user)
            .where(eq(user.id, userId))
            .limit(1);

        if (!userResult[0]?.interestEmbedding) {

            return [];
        }

        const userEmbedding = JSON.parse(userResult[0].interestEmbedding) as number[];
        const userWeightedInterests = userResult[0].weightedInterests;

        // Get all events with embeddings and embedding descriptions
        const events = await database.select({
            id: event.id,
            title: event.title,
            description: event.description,
            embedding: event.embedding,
            embeddingDescription: event.embeddingDescription
        })
            .from(event)
            .where(isNotNull(event.embedding));

        // Calculate similarities with enhanced scoring
        const recommendations = events
            .filter(e => e.embedding)
            .map(e => {
                const eventEmbedding = JSON.parse(e.embedding!) as number[];

                // Base similarity from embeddings
                const baseSimilarity = cosineSimilarity(userEmbedding, eventEmbedding);

                return {
                    id: e.id,
                    title: e.title,
                    description: e.description,
                    similarity: baseSimilarity
                };
            })
            .sort((a, b) => b.similarity - a.similarity); // Sort by similarity descending

        // Limit to top 15 recommendations
        const topRecommendations = recommendations.slice(0, 15);

        // Update user's cached recommendations
        await updateUserRecommendedEvents(userId, topRecommendations.map(r => r.id));

        // Console log results as specified

        if (userWeightedInterests) {

        }

        topRecommendations.forEach((rec, index) => {

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
    const database = initializeDatabase();
    if (!database) return;

    try {
        await database.update(user)
            .set({
                recommendedEventIds: eventIds,
                updatedAt: new Date()
            })
            .where(eq(user.id, userId));


    } catch (error) {
        console.error('Error updating user recommended events:', error);
        // Don't throw - fail gracefully
    }
}

/**
 * Generate embeddings for all events in the database
 */
export async function generateAllEventEmbeddings(): Promise<void> {
    const database = initializeDatabase();
    if (!database) {
        console.error('Database not available');
        return;
    }

    try {
        const events = await database.select({
            id: event.id,
            title: event.title,
            description: event.description,
            categories: event.categories
        })
            .from(event);



        for (const eventData of events) {
            await updateEventEmbedding(
                eventData.id,
                eventData.title,
                eventData.description,
                eventData.categories
            );
        }


    } catch (error) {
        console.error('Error generating all event embeddings:', error);
    }
}

/**
 * Generate an embedding-optimized description for an event
 */
export async function generateEmbeddingDescription(humanDescription: string): Promise<string> {
    const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        messages: [
            {
                role: "system",
                content: "You are an expert at creating embedding-optimized descriptions for event matching. Generate a weighted, activity-based description for use in semantic embeddings."
            },
            {
                role: "user",
                content: `Given this event description: "${humanDescription}"

Generate an embedding description that captures the key activities and characteristics with weights (0.0-1.0) indicating their importance to this event. Focus on:
- Primary activities (e.g., \"BJJ (0.9)\", \"Reading (0.8)\")
- Activity categories (e.g., \"Combat Sports (0.7)\", \"Creative (0.6)\")
- Intensity levels (e.g., \"High-intensity (0.9)\", \"Low-intensity (0.7)\")
- Social aspects (e.g., \"Group (0.8)\", \"Individual (0.3)\")
- Environmental factors (e.g., \"Indoor (0.9)\", \"Outdoor (0.8)\")

Format as: \"Activity1 (weight), Activity2 (weight), Category1 (weight), Skill (weight), Intensity (weight), Social (weight), Environment (weight)\"`
            }
        ],
        maxTokens: 300,
        temperature: 0.3,
    });
    return text;
}

/**
 * Generate a weighted activity-based interest profile for a user
 */
export async function generateWeightedInterests(conversationContext: string, existingWeightedInterests?: string): Promise<string> {
    const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        messages: [
            {
                role: "system",
                content: "You are an expert at creating weighted activity profiles for user interest matching. You must return ONLY the weighted activities in the exact format specified, with no additional text, explanations, or commentary."
            },
            {
                role: "user",
                content: `${existingWeightedInterests ? `Existing weighted interests: ${existingWeightedInterests}\n\n` : ''}Based on this user's conversation history: "${conversationContext}"

Generate ONLY a weighted activity profile with weights (0.0-1.0) indicating how important each activity is to them. Focus on:
- Specific activities they mention (e.g., "BJJ (0.8)", "Filmmaking (0.6)")
- Activity categories (e.g., "Combat Sports (0.7)", "Creative (0.5)")
- Lifestyle factors (e.g., "Athletic (0.8)", "Technical (0.4)")

${existingWeightedInterests ? 'IMPORTANT: Consider both existing interests and new conversation context. Update weights based on new information while preserving important existing interests.' : ''}

CRITICAL: Return ONLY the weighted activities in this exact format:
Activity1 (weight), Activity2 (weight), Category1 (weight), Lifestyle (weight)

Do NOT include any explanatory text, introductions, or commentary. Just the weighted activities separated by commas.`
            }
        ],
        maxTokens: 200,
        temperature: 0.1,
    });
    return text;
} 