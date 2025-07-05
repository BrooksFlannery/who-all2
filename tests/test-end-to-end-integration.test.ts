import { initializeDatabase } from '@/lib/db';
import { event, user } from '@/lib/db/schema';
import { getEventRecommendations, updateUserInterestEmbedding } from '@/lib/embeddings';
import { eq, isNotNull } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';

describe('End-to-End Integration', () => {
    beforeAll(async () => {
        // Skip tests if database is not available
        const db = initializeDatabase();
        if (!db) {
            console.log('Database not available, skipping tests');
            return;
        }
    });

    describe('Complete Pipeline Integration', () => {
        it('should process existing users and generate recommendations', async () => {
            const db = initializeDatabase();
            if (!db) return;

            // First, check if there are events with embeddings
            const eventsWithEmbeddings = await db
                .select({ id: event.id })
                .from(event)
                .where(isNotNull(event.embedding));

            if (eventsWithEmbeddings.length === 0) {
                console.log('No events with embeddings found, skipping recommendation test');
                return;
            }

            // Get existing users with embeddings
            const usersWithEmbeddings = await db
                .select({
                    id: user.id,
                    name: user.name,
                    weightedInterests: user.weightedInterests,
                    interestEmbedding: user.interestEmbedding
                })
                .from(user)
                .where(isNotNull(user.interestEmbedding))
                .limit(3);

            expect(usersWithEmbeddings.length).toBeGreaterThan(0);

            // Test recommendations for each user
            for (const userData of usersWithEmbeddings) {
                console.log(`\n🧪 Testing recommendations for ${userData.name}...`);

                // Verify user has weighted interests
                if (userData.weightedInterests) {
                    console.log(`   ✅ Has weighted interests: ${userData.weightedInterests.substring(0, 80)}...`);
                }

                // Get recommendations
                const recommendations = await getEventRecommendations(userData.id);
                expect(recommendations.length).toBeGreaterThan(0);

                console.log(`   📊 Got ${recommendations.length} recommendations`);
                console.log(`   🏆 Top: ${recommendations[0].title} (${recommendations[0].similarity.toFixed(4)})`);
            }

        }, 30000);

        it('should show different recommendation rankings for different users', async () => {
            const db = initializeDatabase();
            if (!db) return;

            // Get multiple users with embeddings
            const usersWithEmbeddings = await db
                .select({
                    id: user.id,
                    name: user.name
                })
                .from(user)
                .where(isNotNull(user.interestEmbedding))
                .limit(3);

            expect(usersWithEmbeddings.length).toBeGreaterThan(1);

            // Get recommendations for each user
            const userRecommendations = [];
            for (const userData of usersWithEmbeddings) {
                const recommendations = await getEventRecommendations(userData.id);
                if (recommendations.length > 0) {
                    userRecommendations.push({
                        user: userData.name,
                        topRecommendation: recommendations[0]
                    });
                }
            }

            expect(userRecommendations.length).toBeGreaterThan(1);

            // Compare top recommendations
            console.log(`\n📊 Recommendation Comparison:`);
            userRecommendations.forEach(({ user: userName, topRecommendation }) => {
                console.log(`   ${userName}: ${topRecommendation.title} (${topRecommendation.similarity.toFixed(4)})`);
            });

            // Verify that different users get different similarity scores
            const scores = userRecommendations.map(r => r.topRecommendation.similarity);
            const uniqueScores = new Set(scores.map(s => s.toFixed(3)));
            expect(uniqueScores.size).toBeGreaterThan(1);

        }, 30000);
    });

    describe('Embedding Description Quality', () => {
        it('should verify events have embedding descriptions', async () => {
            const db = initializeDatabase();
            if (!db) return;

            const eventsWithDescriptions = await db
                .select({
                    id: event.id,
                    title: event.title,
                    embeddingDescription: event.embeddingDescription
                })
                .from(event)
                .where(isNotNull(event.embeddingDescription));

            expect(eventsWithDescriptions.length).toBeGreaterThan(0);

            eventsWithDescriptions.forEach(eventData => {
                expect(eventData.embeddingDescription).toBeDefined();
                expect(eventData.embeddingDescription).not.toBeNull();
                expect(eventData.embeddingDescription!.length).toBeGreaterThan(0);
            });

            console.log(`✅ Found ${eventsWithDescriptions.length} events with embedding descriptions`);
            eventsWithDescriptions.slice(0, 2).forEach(eventData => {
                console.log(`   📝 ${eventData.title}: ${eventData.embeddingDescription!.substring(0, 80)}...`);
            });

        });

        it('should verify users have weighted interests', async () => {
            const db = initializeDatabase();
            if (!db) return;

            const usersWithInterests = await db
                .select({
                    id: user.id,
                    name: user.name,
                    weightedInterests: user.weightedInterests
                })
                .from(user)
                .where(isNotNull(user.weightedInterests));

            expect(usersWithInterests.length).toBeGreaterThan(0);

            usersWithInterests.forEach(userData => {
                expect(userData.weightedInterests).toBeDefined();
                expect(userData.weightedInterests).not.toBeNull();
                expect(userData.weightedInterests!.length).toBeGreaterThan(0);
            });

            console.log(`✅ Found ${usersWithInterests.length} users with weighted interests`);
            usersWithInterests.slice(0, 2).forEach(userData => {
                console.log(`   👤 ${userData.name}: ${userData.weightedInterests!.substring(0, 80)}...`);
            });

        });
    });

    describe('Pipeline Performance', () => {
        it('should complete recommendation generation within reasonable time', async () => {
            const db = initializeDatabase();
            if (!db) return;

            // Get a user with embeddings
            const userWithEmbedding = await db
                .select({ id: user.id })
                .from(user)
                .where(isNotNull(user.interestEmbedding))
                .limit(1);

            if (userWithEmbedding.length === 0) {
                console.log('No users with embeddings found, skipping performance test');
                return;
            }

            const startTime = Date.now();

            const recommendations = await getEventRecommendations(userWithEmbedding[0].id);

            const endTime = Date.now();
            const duration = (endTime - startTime) / 1000;

            expect(recommendations.length).toBeGreaterThan(0);
            expect(duration).toBeLessThan(10); // Should complete within 10 seconds

            console.log(`✅ Generated ${recommendations.length} recommendations in ${duration.toFixed(2)}s`);

        }, 30000);
    });

    describe('Conversation Processing', () => {
        it('should process new conversation and update user embeddings', async () => {
            const db = initializeDatabase();
            if (!db) return;

            // Get a user without weighted interests
            const userWithoutInterests = await db
                .select({
                    id: user.id,
                    name: user.name,
                    weightedInterests: user.weightedInterests
                })
                .from(user)
                .where(eq(user.weightedInterests, null as any))
                .limit(1);

            if (userWithoutInterests.length === 0) {
                console.log('No users without weighted interests found, skipping conversation test');
                return;
            }

            const testUser = userWithoutInterests[0];
            console.log(`\n🧪 Testing conversation processing for ${testUser.name}...`);

            // Process a new conversation
            const conversation = 'user: I love BJJ and martial arts training\nassistant: That sounds intense! What do you enjoy most about it?\nuser: I love the technical aspect and the physical challenge. It\'s like a physical chess game.\nassistant: How long have you been training?\nuser: I\'ve been doing BJJ for 3 years and I compete regularly.';

            await updateUserInterestEmbedding(testUser.id, conversation);

            // Verify the user now has weighted interests
            const updatedUser = await db
                .select({
                    id: user.id,
                    name: user.name,
                    weightedInterests: user.weightedInterests,
                    interestEmbedding: user.interestEmbedding
                })
                .from(user)
                .where(eq(user.id, testUser.id))
                .limit(1);

            expect(updatedUser[0].weightedInterests).not.toBeNull();
            expect(updatedUser[0].interestEmbedding).not.toBeNull();
            expect(updatedUser[0].weightedInterests!.length).toBeGreaterThan(0);

            console.log(`   ✅ Generated weighted interests: ${updatedUser[0].weightedInterests!.substring(0, 80)}...`);

            // Test recommendations
            const recommendations = await getEventRecommendations(testUser.id);
            expect(recommendations.length).toBeGreaterThan(0);
            console.log(`   📊 Got ${recommendations.length} recommendations after conversation processing`);

        }, 30000);
    });
}); 