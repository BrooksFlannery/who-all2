import { neon } from '@neondatabase/serverless';
import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';

import { user } from '../lib/db/schema';
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

async function testEmbeddings() {
    console.log('🧪 TESTING USER EMBEDDINGS');
    console.log('='.repeat(50));

    try {
        // Get all seeded users
        const users = await db.select().from(user).where(eq(user.id, 'user-fitness-1'));

        if (users.length === 0) {
            console.log('❌ No seeded users found. Run the seeding script first.');
            return;
        }

        const testUser = users[0];
        console.log(`👤 Testing user: ${testUser.name}`);
        console.log(`📧 Email: ${testUser.email}`);

        if (testUser.weightedInterests) {
            console.log(`📊 Weighted Interests: ${testUser.weightedInterests.substring(0, 200)}...`);
        } else {
            console.log('❌ No weighted interests found');
        }

        if (testUser.interestEmbedding) {
            console.log(`🔍 Interest Embedding: ${testUser.interestEmbedding.substring(0, 100)}...`);
        } else {
            console.log('❌ No interest embedding found');
        }

        // Test event recommendations
        console.log('\n🎯 Testing Event Recommendations...');
        const recommendations = await getEventRecommendations(testUser.id);

        if (recommendations.length > 0) {
            console.log(`✅ Found ${recommendations.length} recommendations`);
            recommendations.slice(0, 3).forEach((rec, index) => {
                console.log(`   ${index + 1}. ${rec.title} (similarity: ${rec.similarity.toFixed(3)})`);
            });
        } else {
            console.log('⚠️ No event recommendations found (no events with embeddings in database)');
        }

        console.log('\n✅ Embedding test completed successfully!');

    } catch (error) {
        console.error('❌ Error testing embeddings:', error);
    }
}

// Run the test if this script is executed directly
if (require.main === module) {
    testEmbeddings()
        .then(() => {
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Unexpected error:', error);
            process.exit(1);
        });
}

export { testEmbeddings };
