import fs from 'fs';
import path from 'path';
import { SEMANTIC_CONFIG, VENUE_SCORING_CONFIG } from './constants';
import { generateEmbedding } from './embeddings';
import { GOOGLE_PLACES_TYPES } from './google-places-types';

const EMBEDDINGS_PATH = path.join(__dirname, 'google-places-embeddings.json');

// Cache for Google Places type embeddings to avoid regenerating them
let googlePlacesEmbeddings: Map<string, number[]> | null = null;

/**
 * Load embeddings from disk if available
 */
function loadEmbeddingsFromDisk(): Map<string, number[]> | null {
    try {
        if (fs.existsSync(EMBEDDINGS_PATH)) {
            const raw = fs.readFileSync(EMBEDDINGS_PATH, 'utf-8');
            const obj = JSON.parse(raw);
            const map = new Map<string, number[]>();
            for (const [type, embedding] of Object.entries(obj)) {
                map.set(type, embedding as number[]);
            }
            return map;
        }
    } catch (err) {
        console.warn('Failed to load Google Places embeddings from disk:', err);
    }
    return null;
}

/**
 * Save embeddings to disk
 */
function saveEmbeddingsToDisk(map: Map<string, number[]>) {
    try {
        const obj: Record<string, number[]> = {};
        for (const [type, embedding] of map.entries()) {
            obj[type] = embedding;
        }
        fs.writeFileSync(EMBEDDINGS_PATH, JSON.stringify(obj, null, 2), 'utf-8');
        console.log(`✅ Saved Google Places embeddings to ${EMBEDDINGS_PATH}`);
    } catch (err) {
        console.warn('Failed to save Google Places embeddings to disk:', err);
    }
}

/**
 * Generate embeddings for all Google Places types (cached, persistent)
 */
async function getGooglePlacesEmbeddings(): Promise<Map<string, number[]>> {
    if (googlePlacesEmbeddings) {
        return googlePlacesEmbeddings;
    }

    // Try to load from disk first
    const loaded = loadEmbeddingsFromDisk();
    if (loaded) {
        googlePlacesEmbeddings = loaded;
        console.log(`✅ Loaded Google Places embeddings from disk (${loaded.size} types)`);
        return loaded;
    }

    console.log('🔄 Generating embeddings for Google Places types...');
    const embeddings = new Map<string, number[]>();

    // Generate embeddings for each Google Places type
    for (const placeType of GOOGLE_PLACES_TYPES) {
        try {
            const embedding = await generateEmbedding(placeType);
            embeddings.set(placeType, embedding);
        } catch (error) {
            console.warn(`Failed to generate embedding for ${placeType}:`, error);
        }
    }

    googlePlacesEmbeddings = embeddings;
    saveEmbeddingsToDisk(embeddings);
    console.log(`✅ Generated embeddings for ${embeddings.size} Google Places types`);
    return embeddings;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
        throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
}

/**
 * Find the best Google Places types for a venue type query using semantic matching
 */
export async function findBestVenueTypes(
    venueTypeQuery: string,
    maxResults: number = SEMANTIC_CONFIG.MAX_VENUE_TYPES_PER_QUERY
): Promise<{ types: string[]; confidence: number }> {
    try {
        // Generate embedding for the venue type query
        const queryEmbedding = await generateEmbedding(venueTypeQuery);

        // Get Google Places type embeddings
        const placeTypeEmbeddings = await getGooglePlacesEmbeddings();

        // Calculate similarities with all Google Places types
        const similarities: Array<{ type: string; similarity: number }> = [];

        for (const [placeType, embedding] of placeTypeEmbeddings) {
            const similarity = cosineSimilarity(queryEmbedding, embedding);
            similarities.push({ type: placeType, similarity });
        }

        // Sort by similarity (highest first)
        similarities.sort((a, b) => b.similarity - a.similarity);

        // Filter by minimum similarity threshold
        const filteredSimilarities = similarities.filter(
            item => item.similarity >= SEMANTIC_CONFIG.SEMANTIC_MATCH_THRESHOLD
        );

        if (filteredSimilarities.length === 0) {
            // Fallback: return top result even if below threshold
            const topResult = similarities[0];
            return {
                types: [topResult.type],
                confidence: topResult.similarity
            };
        }

        // Get the top result
        const topResult = filteredSimilarities[0];
        const topConfidence = topResult.similarity;

        // Only include additional types if they're within the confidence threshold
        const additionalTypes = filteredSimilarities
            .slice(1, maxResults)
            .filter(item => (topConfidence - item.similarity) <= VENUE_SCORING_CONFIG.VENUE_TYPE_CONFIDENCE_THRESHOLD)
            .map(item => item.type);

        // Combine top result with additional types
        const allTypes = [topResult.type, ...additionalTypes];
        const averageConfidence = allTypes.length > 1
            ? allTypes.reduce((sum, type) => {
                const match = similarities.find(s => s.type === type);
                return sum + (match?.similarity || 0);
            }, 0) / allTypes.length
            : topConfidence;

        return {
            types: allTypes,
            confidence: averageConfidence
        };

    } catch (error) {
        console.error('Error in semantic venue type matching:', error);

        // Fallback: return generic types based on keyword matching
        return fallbackKeywordMatching(venueTypeQuery);
    }
}

/**
 * Fallback keyword matching when semantic matching fails
 */
function fallbackKeywordMatching(venueTypeQuery: string): { types: string[]; confidence: number } {
    const query = venueTypeQuery.toLowerCase();

    // Simple keyword matching rules
    if (query.includes('restaurant') || query.includes('food') || query.includes('dining')) {
        return { types: ['restaurant'], confidence: 0.5 };
    }
    if (query.includes('cafe') || query.includes('coffee')) {
        return { types: ['cafe', 'coffee_shop'], confidence: 0.5 };
    }
    if (query.includes('bar') || query.includes('pub')) {
        return { types: ['bar', 'pub'], confidence: 0.5 };
    }
    if (query.includes('gym') || query.includes('fitness') || query.includes('workout')) {
        return { types: ['gym', 'fitness_center'], confidence: 0.5 };
    }
    if (query.includes('park') || query.includes('outdoor')) {
        return { types: ['park'], confidence: 0.5 };
    }
    if (query.includes('museum') || query.includes('gallery')) {
        return { types: ['museum', 'art_gallery'], confidence: 0.5 };
    }
    if (query.includes('library') || query.includes('study')) {
        return { types: ['library'], confidence: 0.5 };
    }
    if (query.includes('store') || query.includes('shop')) {
        return { types: ['store'], confidence: 0.5 };
    }

    // Default fallback
    return { types: ['establishment'], confidence: 0.3 };
}

/**
 * Perform semantic venue type matching for multiple queries
 */
export async function performSemanticVenueTypeMatching(
    venueTypeQueries: string[]
): Promise<{
    googleVenueTypes: string[][];
    venueTypeConfidences: number[];
}> {
    console.log(`🔍 Performing semantic venue type matching for ${venueTypeQueries.length} queries...`);

    const googleVenueTypes: string[][] = [];
    const venueTypeConfidences: number[] = [];

    for (const query of venueTypeQueries) {
        try {
            const result = await findBestVenueTypes(query);
            googleVenueTypes.push(result.types);
            venueTypeConfidences.push(result.confidence);
        } catch (error) {
            console.error(`Error matching venue type for query "${query}":`, error);
            // Use fallback
            const fallback = fallbackKeywordMatching(query);
            googleVenueTypes.push(fallback.types);
            venueTypeConfidences.push(fallback.confidence);
        }
    }

    console.log(`✅ Completed semantic venue type matching`);
    return { googleVenueTypes, venueTypeConfidences };
}

/**
 * Clear the embeddings cache (useful for testing or memory management)
 */
export function clearEmbeddingsCache(): void {
    googlePlacesEmbeddings = null;
} 