import { openai } from '@ai-sdk/openai';
import { cosineSimilarity, embedMany } from 'ai';

/**
 * Calculates semantic similarity scores between user interests and event keywords
 * 
 * This function is the core of our semantic matching system. It:
 * 1. Converts text strings (interests and keywords) into high-dimensional vector embeddings
 * 2. Calculates cosine similarity between each interest-keyword pair
 * 3. Returns a flat array of similarity scores in interest-major order
 * 
 * The embeddings capture semantic meaning, so "rock climbing" will have high similarity
 * with "bouldering" even though they're different words.
 * 
 * @param userInterests - Array of user interest strings (e.g., ["rock climbing", "photography"])
 * @param eventKeywords - Array of event keyword strings (e.g., ["hiking", "outdoors", "adventure"])
 * @returns Promise resolving to array of similarity scores (0-1, where 1 is identical)
 * 
 * Example return format for 2 interests and 3 keywords:
 * [interest1_keyword1, interest1_keyword2, interest1_keyword3, interest2_keyword1, interest2_keyword2, interest2_keyword3]
 */
export async function calculateSimilarityScores(
    userInterests: string[],
    eventKeywords: string[]
): Promise<number[]> {
    try {
        // Early exit for empty inputs to avoid unnecessary API calls
        if (userInterests.length === 0 || eventKeywords.length === 0) {
            return [];
        }

        // Generate embeddings for all texts in a single API call
        // This is more efficient than calling the API multiple times
        // The embedMany function handles batching and rate limiting
        const { embeddings } = await embedMany({
            model: openai.embedding('text-embedding-3-small'), // OpenAI's latest embedding model
            values: [...userInterests, ...eventKeywords], // Combine all texts
        });

        // Split embeddings back into interests and keywords
        // The order matches the input: first all interests, then all keywords
        const scores: number[] = [];
        const interestEmbeddings = embeddings.slice(0, userInterests.length);
        const keywordEmbeddings = embeddings.slice(userInterests.length);

        // Calculate similarity between every interest-keyword pair
        // This creates a matrix of similarities that we flatten into a 1D array
        for (let i = 0; i < interestEmbeddings.length; i++) {
            for (let j = 0; j < keywordEmbeddings.length; j++) {
                // Cosine similarity measures the cosine of the angle between two vectors
                // Range: -1 to 1, where 1 means identical, 0 means orthogonal, -1 means opposite
                // We typically get positive values since both are text embeddings
                const similarity = cosineSimilarity(interestEmbeddings[i], keywordEmbeddings[j]);
                scores.push(similarity);
            }
        }

        return scores;
    } catch (error) {
        // Return empty array on error to prevent crashes
        // The calling function should handle this gracefully
        return [];
    }
}

/**
 * Generates embeddings for a list of text strings
 * 
 * This is a utility function for generating embeddings outside of the similarity
 * calculation context. It's used for other semantic operations in the application.
 * 
 * @param texts - Array of text strings to embed
 * @returns Promise resolving to array of embedding vectors
 */
export async function generateEmbeddings(texts: string[]) {
    try {
        const { embeddings } = await embedMany({
            model: openai.embedding('text-embedding-3-small'),
            values: texts,
        });
        return embeddings;
    } catch (error) {
        // Return empty array on error to prevent crashes
        return [];
    }
} 