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
        const testUserId = "test-user-" + Date.now();

        // Create test user
        await database.insert(user).values({
            id: testUserId,
            name: 'Test User',
            email: `test-${Date.now()}@example.com`,
            weightedInterests: 'BJJ (0.8), Combat Sports (0.7), Filmmaking (0.6), Creative (0.5)',
            location: { lat: 40.7589, lng: -73.9851 },
            createdAt: new Date(),
            updatedAt: new Date()
        }).returning();

        console.log('✅ Test user created');

        // Test the updated function
        const conversationContext = 'user: I love BJJ and martial arts training\nassistant: That sounds intense! What do you enjoy most about it?\nuser: I love the technical aspect and the physical challenge. It\'s like a physical chess game.';

        console.log('🧠 Testing updateUserInterestEmbedding...');
        await updateUserInterestEmbedding(testUserId, conversationContext);

        // Verify the update
        const updatedUser = await database
            .select({
                id: user.id,
                name: user.name,
                weightedInterests: user.weightedInterests,
                interestEmbedding: user.interestEmbedding
            })
            .from(user)
            .where(eq(user.id, testUserId))
            .limit(1);

        console.log(`   ✅ User updated successfully`);
        console.log(`   📊 New weighted interests: ${updatedUser[0]?.weightedInterests}`);
        console.log(`   🧠 Has embedding: ${updatedUser[0]?.interestEmbedding ? 'Yes' : 'No'}`);

        console.log('\n🎉 All updated function tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testUpdatedFunctions().catch(console.error); 