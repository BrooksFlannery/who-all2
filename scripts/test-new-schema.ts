import { initializeDatabase } from '../lib/db/index';
import { event, user } from '../lib/db/schema';

async function testNewSchema() {
    console.log('🧪 Testing new database schema...');

    const database = initializeDatabase();
    if (!database) {
        console.error('❌ Database not available');
        return;
    }

    try {
        // Test user table with new weightedInterests field
        console.log('📋 Testing user table schema...');
        const userResult = await database.select({
            id: user.id,
            name: user.name,
            weightedInterests: user.weightedInterests,
            userInterestSummary: user.userInterestSummary
        })
            .from(user)
            .limit(1);

        console.log('✅ User table schema test passed');
        console.log('📊 Sample user data:', userResult[0] || 'No users found');

        // Test event table with new embeddingDescription field
        console.log('📋 Testing event table schema...');
        const eventResult = await database.select({
            id: event.id,
            title: event.title,
            description: event.description,
            embeddingDescription: event.embeddingDescription
        })
            .from(event)
            .limit(1);

        console.log('✅ Event table schema test passed');
        console.log('📊 Sample event data:', eventResult[0] || 'No events found');

        console.log('🎉 All schema tests passed!');

    } catch (error) {
        console.error('❌ Schema test failed:', error);
    }
}

testNewSchema().catch(console.error); 