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
        console.log(`🧮 Starting similarity calculation for ${userInterests.length} interests vs ${eventKeywords.length} keywords`);

        if (userInterests.length === 0 || eventKeywords.length === 0) {
            console.log("⚠️  Empty input arrays, returning empty scores");
            return [];
        }

        // Generate embeddings for all interests and keywords
        console.log("🔤 Generating embeddings...");
        const { embeddings } = await embedMany({
            model: openai.embedding('text-embedding-3-small'),
            values: [...userInterests, ...eventKeywords],
        });
        console.log(`📊 Generated ${embeddings.length} embeddings`);

        const scores: number[] = [];
        const interestEmbeddings = embeddings.slice(0, userInterests.length);
        const keywordEmbeddings = embeddings.slice(userInterests.length);

        console.log(`🔍 Calculating ${userInterests.length * eventKeywords.length} similarity scores...`);

        // Calculate similarity between each interest and event keyword
        for (let i = 0; i < interestEmbeddings.length; i++) {
            for (let j = 0; j < keywordEmbeddings.length; j++) {
                const similarity = cosineSimilarity(interestEmbeddings[i], keywordEmbeddings[j]);
                scores.push(similarity);

                // Log some sample similarities for debugging
                if (scores.length <= 5) {
                    console.log(`  "${userInterests[i]}" vs "${eventKeywords[j]}" = ${similarity.toFixed(3)}`);
                }
            }
        }

        console.log(`✅ Calculated ${scores.length} similarity scores, range: ${Math.min(...scores).toFixed(3)} - ${Math.max(...scores).toFixed(3)}`);
        return scores;
    } catch (error) {
        console.error('❌ Error calculating similarity scores:', error);
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