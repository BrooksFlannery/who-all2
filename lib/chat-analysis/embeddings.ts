import { openai } from '@ai-sdk/openai';
import { cosineSimilarity, embedMany } from 'ai';

/**
 * Calculate similarity scores between user interests and event keywords
 */
export async function calculateSimilarityScores(
    userInterests: string[],
    eventKeywords: string[]
): Promise<number[]> {
    try {
        if (userInterests.length === 0 || eventKeywords.length === 0) {
            return [];
        }

        // Generate embeddings for all interests and keywords
        const { embeddings } = await embedMany({
            model: openai.embedding('text-embedding-3-small'),
            values: [...userInterests, ...eventKeywords],
        });

        const scores: number[] = [];
        const interestEmbeddings = embeddings.slice(0, userInterests.length);
        const keywordEmbeddings = embeddings.slice(userInterests.length);

        // Calculate similarity between each interest and event keyword
        for (const interestEmbedding of interestEmbeddings) {
            for (const keywordEmbedding of keywordEmbeddings) {
                const similarity = cosineSimilarity(interestEmbedding, keywordEmbedding);
                scores.push(similarity);
            }
        }

        return scores;
    } catch (error) {
        console.error('Error calculating similarity scores:', error);
        return [];
    }
}

/**
 * Generate embeddings for a list of texts
 */
export async function generateEmbeddings(texts: string[]) {
    try {
        const { embeddings } = await embedMany({
            model: openai.embedding('text-embedding-3-small'),
            values: texts,
        });
        return embeddings;
    } catch (error) {
        console.error('Error generating embeddings:', error);
        return [];
    }
} 