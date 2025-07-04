import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { initializeDatabase } from '../lib/db/index';
import { event, user } from '../lib/db/schema';
import { updateEventEmbedding, updateUserInterestEmbedding } from '../lib/embeddings';

async function testUpdatedFunctions() {
    console.log('🧪 Testing updated embedding functions...');

    const database = initializeDatabase();
    if (!database) {
        console.error('❌ Database not available');
        return;
    }

    try {
        // Test 1: Create a test event and update its embedding
        console.log('\n--- Test 1: Event Embedding ---');
        const testEventDescription = "Join our high-intensity Brazilian Jiu-Jitsu training session for intermediate to advanced practitioners. This is a structured class focusing on technique refinement and sparring. Perfect for athletes looking to improve their grappling skills in a competitive environment.";

        // First, let's create a test event
        const testEvent = await database.insert(event).values({
            title: "Advanced BJJ Training",
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            location: { lat: 37.7749, lng: -122.4194 },
            description: testEventDescription,
            categories: ["fitness", "sports"],
            venue: { name: "Elite BJJ Academy" },
            venueType: "gym",
            venueRating: 45,
            venuePriceLevel: 2
        }).returning();

        const eventId = testEvent[0].id;
        console.log(`✅ Created test event: ${eventId}`);

        // Update the event embedding
        await updateEventEmbedding(eventId, "Advanced BJJ Training", testEventDescription, ["fitness", "sports"]);

        // Verify the embedding description was stored
        const updatedEvent = await database.select({
            description: event.description,
            embeddingDescription: event.embeddingDescription,
            embedding: event.embedding
        })
            .from(event)
            .where(eq(event.id, eventId))
            .limit(1);

        console.log('📊 Event embedding results:');
        console.log(`   Human description: ${updatedEvent[0]?.description}`);
        console.log(`   Embedding description: ${updatedEvent[0]?.embeddingDescription}`);
        console.log(`   Has embedding: ${!!updatedEvent[0]?.embedding}`);

        // Test 2: Create a test user and update their interest embedding
        console.log('\n--- Test 2: User Interest Embedding ---');
        const testUserContext = "I'm a professional athlete who loves Brazilian Jiu-Jitsu and combat sports. I also enjoy filmmaking as a creative outlet and do some coding on the side. I'm looking for high-intensity fitness events and training opportunities.";

        // First, let's create a test user
        const testUser = await database.insert(user).values({
            id: "test-user-" + Date.now(),
            name: "Test Athlete",
            email: "test-athlete@example.com",
            emailVerified: true,
            userInterestSummary: "Professional athlete interested in BJJ, filmmaking, and coding"
        }).returning();

        const userId = testUser[0].id;
        console.log(`✅ Created test user: ${userId}`);

        // Update the user interest embedding
        await updateUserInterestEmbedding(userId, testUserContext);

        // Verify the weighted interests were stored
        const updatedUser = await database.select({
            userInterestSummary: user.userInterestSummary,
            weightedInterests: user.weightedInterests,
            interestEmbedding: user.interestEmbedding
        })
            .from(user)
            .where(eq(user.id, userId))
            .limit(1);

        console.log('📊 User embedding results:');
        console.log(`   Old summary: ${updatedUser[0]?.userInterestSummary}`);
        console.log(`   Weighted interests: ${updatedUser[0]?.weightedInterests}`);
        console.log(`   Has embedding: ${!!updatedUser[0]?.interestEmbedding}`);

        console.log('\n🎉 All updated function tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testUpdatedFunctions().catch(console.error); 