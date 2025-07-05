import { initializeDatabase } from '../lib/db/index';
import { event, user } from '../lib/db/schema';

async function testNewSchema() {


    const database = initializeDatabase();
    if (!database) {
        console.error('❌ Database not available');
        return;
    }

    try {
        // Test user table with new weightedInterests field

        const userResult = await database.select({
            id: user.id,
            name: user.name,
            weightedInterests: user.weightedInterests
        })
            .from(user)
            .limit(1);



        // Test event table with new embeddingDescription field

        const eventResult = await database.select({
            id: event.id,
            title: event.title,
            description: event.description,
            embeddingDescription: event.embeddingDescription
        })
            .from(event)
            .limit(1);



    } catch (error) {
        console.error('❌ Schema test failed:', error);
    }
}

testNewSchema().catch(console.error); 