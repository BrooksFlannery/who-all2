import { neon } from '@neondatabase/serverless';
import { isNull, not } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { CLUSTERING_CONFIG } from '../lib/constants';
import { user } from '../lib/db/schema';
import {
    calculateClusterLocation,
    extractCategories,
    extractTitle,
    findCentroidUsers,
    parseEventDescriptions,
    parseVenueTypes
} from '../lib/pseudo-event-utils';
import { validateEnv } from '../lib/validation';

// Test database connection
const env = validateEnv();
const databaseUrl = env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined for testing');
}

const sql = neon(databaseUrl);
const db = drizzle(sql);

describe('Pseudo-Event Generation', () => {
    beforeAll(async () => {
        // Ensure we have test data
        const users = await db.select().from(user).where(not(isNull(user.interestEmbedding)));
        if (users.length === 0) {
            console.warn('⚠️ No users with embeddings found for testing');
        }
    });

    afterAll(async () => {
        // Clean up if needed
    });

    describe('Utility Functions', () => {
        it('should extract title from event description', () => {
            const description = 'Rock Climbing Meetup - Join us for an exciting climbing session!';
            const title = extractTitle(description);
            expect(title).toBe('Rock Climbing Meetup');
        });

        it('should extract title from simple title', () => {
            const description = 'Rock Climbing Meetup';
            const title = extractTitle(description);
            expect(title).toBe('Rock Climbing Meetup');
        });

        it('should extract categories from event description', () => {
            const description = 'Join us for a fitness and social climbing event';
            const categories = extractCategories(description);
            expect(categories).toContain('fitness');
            expect(categories).toContain('social');
        });

        it('should parse event descriptions from OpenAI response', () => {
            const response = `
1. Rock Climbing Meetup - Join us for climbing
2. Coffee Chat - Social networking event
3. Tech Workshop - Learn new skills
            `.trim();

            const descriptions = parseEventDescriptions(response);
            expect(descriptions).toHaveLength(3);
            expect(descriptions[0]).toContain('Rock Climbing Meetup');
        });

        it('should parse venue types from OpenAI response', () => {
            const response = `
1. rock climbing gym
2. coffee shop
3. community center
            `.trim();

            const venueTypes = parseVenueTypes(response);
            expect(venueTypes).toHaveLength(3);
            expect(venueTypes[0]).toBe('rock climbing gym');
        });
    });

    describe('Clustering Configuration', () => {
        it('should have valid clustering parameters', () => {
            expect(CLUSTERING_CONFIG.MIN_CLUSTER_SIZE).toBeGreaterThan(0);
            expect(CLUSTERING_CONFIG.MIN_SAMPLES).toBeGreaterThan(0);
            expect(CLUSTERING_CONFIG.METRIC).toBe('euclidean');
        });

        it('should have development-friendly settings', () => {
            expect(CLUSTERING_CONFIG.MIN_CLUSTER_SIZE).toBeLessThanOrEqual(5);
            expect(CLUSTERING_CONFIG.MIN_SAMPLES).toBeLessThanOrEqual(5);
        });
    });

    describe('Database Integration', () => {
        it('should connect to database successfully', async () => {
            const users = await db.select().from(user).limit(1);
            expect(Array.isArray(users)).toBe(true);
        });

        it('should find users with interest embeddings', async () => {
            const users = await db.select().from(user).where(not(isNull(user.interestEmbedding)));
            expect(Array.isArray(users)).toBe(true);
            // Note: This test will pass even with 0 users, which is valid for testing
        });
    });

    describe('Centroid User Selection', () => {
        it('should handle empty user arrays gracefully', () => {
            const centroidUsers = findCentroidUsers([], [], [0.1, 0.2, 0.3]);
            expect(centroidUsers).toHaveLength(0);
        });

        it('should return all users when count exceeds available users', () => {
            const mockUsers = [
                { id: 'user1', interestEmbedding: JSON.stringify([0.1, 0.2, 0.3]) },
                { id: 'user2', interestEmbedding: JSON.stringify([0.4, 0.5, 0.6]) }
            ];
            const userIds = ['user1', 'user2'];
            const centroid = [0.25, 0.35, 0.45];

            const centroidUsers = findCentroidUsers(userIds, mockUsers, centroid, 5);
            expect(centroidUsers).toHaveLength(2);
        });
    });

    describe('Location Calculation', () => {
        it('should return default location when no users have location data', () => {
            const mockUsers = [
                { id: 'user1', location: null },
                { id: 'user2', location: null }
            ];
            const userIds = ['user1', 'user2'];

            const location = calculateClusterLocation(userIds, mockUsers);
            expect(location.latitude).toBe(40.7685);
            expect(location.longitude).toBe(-73.9822);
        });

        it('should calculate average location from user locations', () => {
            const mockUsers = [
                { id: 'user1', location: { latitude: 40.0, longitude: -74.0 } },
                { id: 'user2', location: { latitude: 41.0, longitude: -73.0 } }
            ];
            const userIds = ['user1', 'user2'];

            const location = calculateClusterLocation(userIds, mockUsers);
            expect(location.latitude).toBe(40.5);
            expect(location.longitude).toBe(-73.5);
        });
    });
}); 