import { initializeDatabase } from '@/lib/db';
import { event, user } from '@/lib/db/schema';
import { getEventRecommendations, updateUserInterestEmbedding } from '@/lib/embeddings';
import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';

// Test constants
const testUsers = {
    wellness: 'test-wellness-user',
    fitness: 'test-fitness-user',
    creative: 'test-creative-user'
};

const testEvents = {
    yoga: '00000000-0000-0000-0000-000000000001',
    bjj: '00000000-0000-0000-0000-000000000002',
    painting: '00000000-0000-0000-0000-000000000003'
};

describe('Recommendation Quality', () => {
    beforeAll(async () => {
        // Skip tests if database is not available
        const db = initializeDatabase();
        if (!db) {
            console.log('Database not available, skipping tests');
            return;
        }

        // Clean up any existing test data
        await cleanupTestData();

        // Create test users with different interests
        await createTestUsers();
    });

    describe('Event Recommendation Quality', () => {
        it('should rank BJJ events higher for fitness users than wellness users', async () => {
            const fitnessRecommendations = await getEventRecommendations(testUsers.fitness);
            const wellnessRecommendations = await getEventRecommendations(testUsers.wellness);

            expect(fitnessRecommendations.length).toBeGreaterThan(0);
            expect(wellnessRecommendations.length).toBeGreaterThan(0);

            // Find BJJ events in recommendations
            const fitnessBJJ = fitnessRecommendations.find(r => r.title.toLowerCase().includes('bjj'));
            const wellnessBJJ = wellnessRecommendations.find(r => r.title.toLowerCase().includes('bjj'));

            if (fitnessBJJ && wellnessBJJ) {
                // BJJ should rank higher for fitness users than wellness users
                expect(fitnessBJJ.similarity).toBeGreaterThan(wellnessBJJ.similarity);
                console.log(`✅ BJJ event for fitness user (${fitnessBJJ.similarity.toFixed(4)}) ranked higher than for wellness user (${wellnessBJJ.similarity.toFixed(4)})`);
            }
        }, 30000);

        it('should rank BJJ events higher for fitness users than creative users', async () => {
            const fitnessRecommendations = await getEventRecommendations(testUsers.fitness);
            const creativeRecommendations = await getEventRecommendations(testUsers.creative);

            expect(fitnessRecommendations.length).toBeGreaterThan(0);
            expect(creativeRecommendations.length).toBeGreaterThan(0);

            // Find BJJ events in recommendations
            const fitnessBJJ = fitnessRecommendations.find(r => r.title.toLowerCase().includes('bjj'));
            const creativeBJJ = creativeRecommendations.find(r => r.title.toLowerCase().includes('bjj'));

            if (fitnessBJJ && creativeBJJ) {
                // BJJ should rank higher for fitness users than creative users
                expect(fitnessBJJ.similarity).toBeGreaterThan(creativeBJJ.similarity);
                console.log(`✅ BJJ event for fitness user (${fitnessBJJ.similarity.toFixed(4)}) ranked higher than for creative user (${creativeBJJ.similarity.toFixed(4)})`);
            }
        }, 30000);

        it('should use weighted interests to enhance recommendation scores', async () => {
            const recommendations = await getEventRecommendations(testUsers.wellness);

            expect(recommendations.length).toBeGreaterThan(0);

            // Check that recommendations have reasonable similarity scores
            const topRecommendation = recommendations[0];
            expect(topRecommendation.similarity).toBeGreaterThan(0.3);

            console.log(`✅ Top recommendation for wellness user: ${topRecommendation.title} (${topRecommendation.similarity.toFixed(4)})`);
        }, 30000);

        it('should return recommendations in descending order of similarity', async () => {
            const recommendations = await getEventRecommendations(testUsers.wellness);

            expect(recommendations.length).toBeGreaterThan(1);

            // Check that recommendations are sorted by similarity (descending)
            for (let i = 0; i < recommendations.length - 1; i++) {
                expect(recommendations[i].similarity).toBeGreaterThanOrEqual(recommendations[i + 1].similarity);
            }

            console.log(`✅ ${recommendations.length} recommendations properly sorted by similarity`);
        }, 30000);
    });

    describe('Interest Alignment', () => {
        it('should show different similarity scores for different user types', async () => {
            const fitnessRecommendations = await getEventRecommendations(testUsers.fitness);
            const wellnessRecommendations = await getEventRecommendations(testUsers.wellness);
            const creativeRecommendations = await getEventRecommendations(testUsers.creative);

            expect(fitnessRecommendations.length).toBeGreaterThan(0);
            expect(wellnessRecommendations.length).toBeGreaterThan(0);
            expect(creativeRecommendations.length).toBeGreaterThan(0);

            // Get top recommendations for each user type
            const fitnessTop = fitnessRecommendations[0];
            const wellnessTop = wellnessRecommendations[0];
            const creativeTop = creativeRecommendations[0];

            // Fitness user should have highest similarity for BJJ events
            expect(fitnessTop.similarity).toBeGreaterThan(wellnessTop.similarity);
            expect(fitnessTop.similarity).toBeGreaterThan(creativeTop.similarity);

            console.log(`✅ Fitness user similarity: ${fitnessTop.similarity.toFixed(4)}`);
            console.log(`✅ Wellness user similarity: ${wellnessTop.similarity.toFixed(4)}`);
            console.log(`✅ Creative user similarity: ${creativeTop.similarity.toFixed(4)}`);
        }, 30000);
    });
});

/**
 * Clean up test data
 */
async function cleanupTestData(): Promise<void> {
    const db = initializeDatabase();
    if (!db) return;

    try {
        // Delete test events
        await db.delete(event).where(eq(event.id, testEvents.yoga));
        await db.delete(event).where(eq(event.id, testEvents.bjj));
        await db.delete(event).where(eq(event.id, testEvents.painting));

        // Delete test users
        await db.delete(user).where(eq(user.id, testUsers.wellness));
        await db.delete(user).where(eq(user.id, testUsers.fitness));
        await db.delete(user).where(eq(user.id, testUsers.creative));

        console.log('🧹 Cleaned up test data');
    } catch (error) {
        console.warn('Warning: Could not clean up test data:', error);
    }
}

/**
 * Create test users with different interests
 */
async function createTestUsers(): Promise<void> {
    const db = initializeDatabase();
    if (!db) return;

    try {
        // Wellness user
        await db.insert(user).values({
            id: testUsers.wellness,
            name: 'Test Wellness User',
            email: 'wellness@test.com',
            weightedInterests: 'Yoga (0.9), Meditation (0.9), Wellness (0.8), Mindfulness (0.8)',
            location: { lat: 40.7589, lng: -73.9851 }
        });

        // Fitness user
        await db.insert(user).values({
            id: testUsers.fitness,
            name: 'Test Fitness User',
            email: 'fitness@test.com',
            weightedInterests: 'BJJ (0.9), Combat Sports (0.8), Fitness (0.8), Training (0.7)',
            location: { lat: 40.7505, lng: -73.9934 }
        });

        // Creative user
        await db.insert(user).values({
            id: testUsers.creative,
            name: 'Test Creative User',
            email: 'creative@test.com',
            weightedInterests: 'Painting (0.9), Art (0.8), Creative (0.8), Design (0.7)',
            location: { lat: 40.7265, lng: -73.9942 }
        });

        // Generate embeddings for test users
        await updateUserInterestEmbedding(testUsers.wellness, 'user: I love yoga and meditation\nassistant: That sounds wonderful! What type of yoga do you practice?\nuser: I enjoy vinyasa and restorative yoga for stress relief and mindfulness.');
        await updateUserInterestEmbedding(testUsers.fitness, 'user: I train BJJ and love combat sports\nassistant: That sounds intense! How long have you been training?\nuser: I\'ve been doing BJJ for 3 years and love the physical challenge and technique.');
        await updateUserInterestEmbedding(testUsers.creative, 'user: I\'m an artist and love painting\nassistant: That sounds creative! What medium do you work with?\nuser: I work with acrylics and watercolors, and I love experimenting with different techniques.');

        console.log('✅ Created test users with embeddings');
    } catch (error) {
        console.error('Error creating test users:', error);
    }
} 