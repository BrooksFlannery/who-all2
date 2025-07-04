import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';

// Embedding model configuration
const EMBEDDING_MODEL = openai.embedding('text-embedding-3-small');

/**
 * Generate embedding for a single text value (venue matching only)
 */
export async function generateVenueEmbedding(text: string): Promise<number[]> {
    try {
        const { embedding } = await embed({
            model: EMBEDDING_MODEL,
            value: text,
        });
        return embedding;
    } catch (error) {
        console.error('Error generating venue embedding:', error);
        throw new Error('Failed to generate venue embedding');
    }
} 