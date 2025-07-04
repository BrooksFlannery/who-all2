import { neon } from '@neondatabase/serverless';
import 'dotenv/config';
import { isNotNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';

import { event, user } from '../lib/db/schema';
import { getEventRecommendations } from '../lib/embeddings';
import { validateEnv } from '../lib/validation';

// Validate environment variables
const env = validateEnv();
const databaseUrl = env.DATABASE_URL;

if (!databaseUrl) {
    console.error('DATABASE_URL is not defined');
    process.exit(1);
}

// Create database connection
const sql = neon(databaseUrl);
const db = drizzle(sql);

async function testEmbeddingQuality() {
    console.log('🧪 EMBEDDING QUALITY VALIDATION');
    console.log('='.repeat(50));

    try {
        // Test 1: Check user weighted interests
        console.log('\n📊 Test 1: User Weighted Interests');
        const users = await db.select().from(user).where(isNotNull(user.weightedInterests));
        console.log(`✅ Found ${users.length} users with weighted interests`);

        users.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.name}: ${user.weightedInterests?.substring(0, 80)}...`);
        });

        // Test 2: Check event embedding descriptions
        console.log('\n📝 Test 2: Event Embedding Descriptions');
        const events = await db.select().from(event).where(isNotNull(event.embeddingDescription));
        console.log(`✅ Found ${events.length} events with embedding descriptions`);

        events.forEach((event, index) => {
            console.log(`   ${index + 1}. ${event.title}: ${event.embeddingDescription?.substring(0, 80)}...`);
        });

        // Test 3: Test recommendation quality for each user
        console.log('\n🎯 Test 3: Recommendation Quality');
        for (const testUser of users.slice(0, 3)) { // Test first 3 users
            console.log(`\n👤 Testing recommendations for ${testUser.name}:`);
            const recommendations = await getEventRecommendations(testUser.id);

            if (recommendations.length > 0) {
                console.log(`   📊 Found ${recommendations.length} recommendations`);
                recommendations.slice(0, 3).forEach((rec, index) => {
                    const quality = rec.similarity >= 0.7 ? '🟢 Excellent' :
                        rec.similarity >= 0.5 ? '🟡 Good' : '🔴 Poor';
                    console.log(`   ${index + 1}. ${rec.title} (${rec.similarity.toFixed(3)}) ${quality}`);
                });
            } else {
                console.log('   ⚠️ No recommendations found');
            }
        }

        // Test 4: Overall system health
        console.log('\n🏥 Test 4: System Health Check');
        const totalUsers = await db.select().from(user);
        const totalEvents = await db.select().from(event);
        const usersWithEmbeddings = await db.select().from(user).where(isNotNull(user.interestEmbedding));
        const eventsWithEmbeddings = await db.select().from(event).where(isNotNull(event.embedding));

        console.log(`   👥 Total users: ${totalUsers.length}`);
        console.log(`   📅 Total events: ${totalEvents.length}`);
        console.log(`   🔍 Users with embeddings: ${usersWithEmbeddings.length} (${((usersWithEmbeddings.length / totalUsers.length) * 100).toFixed(1)}%)`);
        console.log(`   🔍 Events with embeddings: ${eventsWithEmbeddings.length} (${((eventsWithEmbeddings.length / totalEvents.length) * 100).toFixed(1)}%)`);

        // Test 5: Quality metrics
        console.log('\n📈 Test 5: Quality Metrics');
        let excellentMatches = 0;
        let goodMatches = 0;
        let poorMatches = 0;
        let totalRecommendations = 0;

        for (const testUser of users.slice(0, 3)) {
            const recommendations = await getEventRecommendations(testUser.id);
            totalRecommendations += recommendations.length;

            recommendations.forEach(rec => {
                if (rec.similarity >= 0.7) excellentMatches++;
                else if (rec.similarity >= 0.5) goodMatches++;
                else poorMatches++;
            });
        }

        console.log(`   🟢 Excellent matches (≥0.7): ${excellentMatches} (${((excellentMatches / totalRecommendations) * 100).toFixed(1)}%)`);
        console.log(`   🟡 Good matches (0.5-0.7): ${goodMatches} (${((goodMatches / totalRecommendations) * 100).toFixed(1)}%)`);
        console.log(`   🔴 Poor matches (<0.5): ${poorMatches} (${((poorMatches / totalRecommendations) * 100).toFixed(1)}%)`);

        console.log('\n✅ Embedding quality validation completed successfully!');

    } catch (error) {
        console.error('❌ Error during embedding quality validation:', error);
    }
}

// Run the test if this script is executed directly
if (require.main === module) {
    testEmbeddingQuality()
        .then(() => {
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Unexpected error:', error);
            process.exit(1);
        });
}

export { testEmbeddingQuality };
