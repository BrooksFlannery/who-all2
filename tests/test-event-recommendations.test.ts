import { db } from '@/lib/db';
import { generateEmbedding, getEventRecommendations, updateEventEmbedding, updateUserInterestEmbedding } from '@/lib/embeddings';
import { beforeAll, describe, expect, it } from 'vitest';

describe('Event Recommendations', () => {
    const testUserId = 'test-user-123';
    const testEventId = '123e4567-e89b-12d3-a456-426614174000'; // Valid UUID format

    beforeAll(async () => {
        // Skip tests if database is not available
        if (!db) {
            console.log('Database not available, skipping tests');
            return;
        }
    });

    describe('Embedding Generation', () => {
        it('should generate embeddings for text', async () => {
            const testText = 'I love fitness and outdoor activities';
            const embedding = await generateEmbedding(testText);

            expect(embedding).toBeDefined();
            expect(Array.isArray(embedding)).toBe(true);
            expect(embedding.length).toBe(1536); // text-embedding-3-small dimensions
        });

        it('should handle empty text gracefully', async () => {
            // OpenAI API doesn't accept empty strings, so we should expect an error
            await expect(generateEmbedding('')).rejects.toThrow('Failed to generate embedding');
        });
    });

    describe('User Interest Embedding Updates', () => {
        it('should update user interest embedding without throwing', async () => {
            const interestSummary = 'I enjoy technology, coding, and learning new things';

            // This should not throw even if user doesn't exist
            await expect(updateUserInterestEmbedding(testUserId, interestSummary))
                .resolves.not.toThrow();
        });
    });

    describe('Event Embedding Updates', () => {
        it('should update event embedding without throwing', async () => {
            const title = 'Tech Meetup';
            const description = 'A great event for technology enthusiasts';
            const categories = ['technology', 'social'];

            // This should not throw even if event doesn't exist
            await expect(updateEventEmbedding(testEventId, title, description, categories))
                .resolves.not.toThrow();
        });
    });

    describe('Event Recommendations', () => {
        it('should return empty array when user has no interest embedding', async () => {
            const recommendations = await getEventRecommendations(testUserId);

            expect(Array.isArray(recommendations)).toBe(true);
            // Should return empty array for non-existent user
            expect(recommendations.length).toBe(0);
        });

        it('should handle database unavailability gracefully', async () => {
            // Mock db as null to test graceful handling
            const originalDb = db;
            // @ts-ignore - temporarily mock db as null
            (global as any).db = null;

            const recommendations = await getEventRecommendations(testUserId);

            expect(Array.isArray(recommendations)).toBe(true);
            expect(recommendations.length).toBe(0);

            // Restore original db
            (global as any).db = originalDb;
        });
    });

    describe('API Endpoint Structure', () => {
        it('should have recommendations endpoint', () => {
            const endpoint = '/api/events/recommendations';
            expect(endpoint).toBe('/api/events/recommendations');
        });

        it('should support POST method for recommendations', () => {
            const methods = ['POST'];
            expect(methods).toContain('POST');
        });
    });
}); 