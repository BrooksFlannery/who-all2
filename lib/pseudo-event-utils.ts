import { cosineSimilarity } from 'ai';
import { EVENT_CONFIG } from './constants';
import { CentroidUser, Location } from './pseudo-events';

/**
 * Calculate cosine similarity between two vectors
 * Using the ai package's cosineSimilarity function
 */
export function calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
    return cosineSimilarity(vectorA, vectorB);
}

/**
 * Calculate the centroid (average) of a set of embeddings
 */
export function calculateCentroid(embeddings: number[][], userIds: string[], allUsers: any[]): number[] {
    if (embeddings.length === 0) {
        throw new Error('No embeddings provided for centroid calculation');
    }

    const dimension = embeddings[0].length;
    const centroid = new Array(dimension).fill(0);

    // Sum all embeddings
    for (const embedding of embeddings) {
        for (let i = 0; i < dimension; i++) {
            centroid[i] += embedding[i];
        }
    }

    // Divide by number of embeddings to get average
    for (let i = 0; i < dimension; i++) {
        centroid[i] /= embeddings.length;
    }

    return centroid;
}

/**
 * Find centroid users (most similar to cluster centroid)
 */
export function findCentroidUsers(
    clusterUserIds: string[],
    users: any[],
    clusterCentroid: number[],
    count: number = EVENT_CONFIG.CENTROID_USERS_COUNT
): string[] {
    console.log(`🔍 Finding centroid users: ${clusterUserIds.length} user IDs, ${users.length} user objects`);

    const userScores: CentroidUser[] = clusterUserIds.map(userId => {
        const user = users.find(u => u.id === userId);
        if (!user || !user.interestEmbedding) {
            console.log(`⚠️ User ${userId} not found or missing embedding`);
            return { userId, similarity: -1 };
        }

        const userEmbedding = JSON.parse(user.interestEmbedding);
        const similarity = calculateCosineSimilarity(userEmbedding, clusterCentroid);
        console.log(`📊 User ${userId} similarity: ${similarity.toFixed(4)}`);
        return { userId, similarity };
    });

    const validUsers = userScores.filter(u => u.similarity >= 0);
    console.log(`✅ Found ${validUsers.length} valid users with embeddings`);

    // If we have 5 or fewer users, use all of them
    const targetCount = Math.min(count, validUsers.length);
    console.log(`🎯 Selecting top ${targetCount} users (requested: ${count}, available: ${validUsers.length})`);

    // Return top N most similar users
    return validUsers
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, targetCount)
        .map(u => u.userId);
}

/**
 * Calculate cluster location from user locations
 */
export function calculateClusterLocation(clusterUserIds: string[], users: any[]): Location {
    const clusterUsers = users.filter(u => clusterUserIds.includes(u.id));

    // Filter users with location data
    const usersWithLocation = clusterUsers.filter(u => u.location);

    if (usersWithLocation.length === 0) {
        // Default NYC location if no users have location data
        return { latitude: 40.7685, longitude: -73.9822 }; // Your specified coordinates
    }

    // Calculate average location
    const totalLat = usersWithLocation.reduce((sum, u) => sum + u.location.latitude, 0);
    const totalLng = usersWithLocation.reduce((sum, u) => sum + u.location.longitude, 0);

    return {
        latitude: totalLat / usersWithLocation.length,
        longitude: totalLng / usersWithLocation.length
    };
}

/**
 * Extract title from event description
 */
export function extractTitle(description: string): string {
    // First, check if it's in "Title - Description" format
    const dashMatch = description.match(/^(.+?)\s*-\s*(.+)$/);
    if (dashMatch) {
        return dashMatch[1].trim();
    }

    // Simple extraction - take first line or first sentence
    const lines = description.split('\n');
    const firstLine = lines[0].trim();

    // If first line looks like a title (short, no period), use it
    if (firstLine.length < 100 && !firstLine.includes('.')) {
        return firstLine;
    }

    // Otherwise, take first sentence
    const sentences = description.split('.');
    return sentences[0].trim();
}

/**
 * Extract categories from event description using simple keyword matching
 */
export function extractCategories(description: string): string[] {
    const categories = [
        'fitness', 'social', 'creative', 'technology', 'education',
        'food', 'music', 'outdoors', 'business', 'sports', 'other'
    ];

    const lowerDescription = description.toLowerCase();
    const foundCategories = categories.filter(category =>
        lowerDescription.includes(category)
    );

    // Default to 'social' if no categories found
    return foundCategories.length > 0 ? foundCategories : ['social'];
}

/**
 * Parse event descriptions from OpenAI response
 */
export function parseEventDescriptions(response: string): string[] {
    const lines = response.split('\n').filter(line => line.trim());
    const descriptions: string[] = [];

    for (const line of lines) {
        // Look for numbered lines like "1. [Title] - [Description]"
        const match = line.match(/^\d+\.\s*(.+?)\s*-\s*(.+)$/);
        if (match) {
            const title = match[1].trim();
            const description = match[2].trim();
            descriptions.push(`${title} - ${description}`);
        } else if (line.trim().length > 10) {
            // If no numbered format, just take non-empty lines
            descriptions.push(line.trim());
        }
    }

    return descriptions;
}

/**
 * Parse event descriptions from OpenAI response and return separate title and description
 */
export function parseEventDescriptionsWithTitles(response: string): Array<{ title: string, description: string }> {
    const lines = response.split('\n').filter(line => line.trim());
    const events: Array<{ title: string, description: string }> = [];

    for (const line of lines) {
        // Look for numbered lines like "1. [Title] - [Description]"
        const match = line.match(/^\d+\.\s*(.+?)\s*-\s*(.+)$/);
        if (match) {
            const title = match[1].trim();
            const description = match[2].trim();
            events.push({ title, description });
        } else if (line.trim().length > 10) {
            // If no numbered format, just take non-empty lines as description
            events.push({
                title: extractTitle(line.trim()),
                description: line.trim()
            });
        }
    }

    return events;
}

/**
 * Parse venue types from OpenAI response
 */
export function parseVenueTypes(response: string): string[] {
    const lines = response.split('\n').filter(line => line.trim());
    const venueTypes: string[] = [];

    for (const line of lines) {
        // Look for numbered lines like "1. [venue type]"
        const match = line.match(/^\d+\.\s*(.+)$/);
        if (match) {
            venueTypes.push(match[1].trim());
        } else if (line.trim().length > 3) {
            // If no numbered format, just take non-empty lines
            venueTypes.push(line.trim());
        }
    }

    return venueTypes;
} 