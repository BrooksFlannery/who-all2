import 'dotenv/config';
import { insertEvent } from '../lib/db/events';
import { generateRealEvent } from '../lib/event-generation';
import { PseudoEvent } from '../lib/pseudo-events';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!GOOGLE_PLACES_API_KEY) {
    console.error('❌ GOOGLE_PLACES_API_KEY not found in environment variables');
    process.exit(1);
}

async function testEmbeddingDescriptions() {
    console.log('🧪 Testing embedding description generation and database saving...');

    // Create a single sample pseudo-event for testing
    const samplePseudoEvent: PseudoEvent = {
        title: "Advanced BJJ Training Session",
        description: "Join our high-intensity Brazilian Jiu-Jitsu training session for intermediate to advanced practitioners. This is a structured class focusing on technique refinement and sparring. Perfect for athletes looking to improve their grappling skills in a competitive environment.",
        categories: ["fitness", "sports"],
        targetLocation: {
            center: { lat: 40.7580, lng: -73.9855 }, // Times Square, NYC
            radiusMeters: 1000
        },
        venueTypeQuery: "martial arts gym",
        clusterUserIds: ["user1", "user2", "user3"],
        generatedFrom: {
            centroidUserIds: ["user1", "user2"],
            clusterId: "cluster1"
        }
    };

    try {
        console.log('🔍 Step 1: Generating real event with embedding description...');
        const event = await generateRealEvent(samplePseudoEvent, GOOGLE_PLACES_API_KEY!);

        if (!event) {
            console.error('❌ Failed to generate event');
            return;
        }

        console.log('✅ Event generated successfully!');
        console.log(`📅 Title: ${event.title}`);
        console.log(`📝 Description: ${event.description}`);
        console.log(`🧠 Embedding Description: ${event.embeddingDescription || 'NOT GENERATED'}`);
        console.log(`🏷️  Categories: ${event.categories.join(', ')}`);
        console.log(`📍 Location: ${event.location.lat}, ${event.location.lng}`);
        if (event.venue) {
            console.log(`🏢 Venue: ${event.venue.name}`);
        }

        console.log('\n🔍 Step 2: Saving event to database...');
        const eventId = await insertEvent(event);
        console.log(`✅ Event saved to database with ID: ${eventId}`);

        console.log('\n🔍 Step 3: Verifying event in database...');
        const { getEventById } = await import('../lib/db/events');
        const savedEvent = await getEventById(eventId);

        if (savedEvent) {
            console.log('✅ Event retrieved from database successfully!');
            console.log(`📅 Title: ${savedEvent.title}`);
            console.log(`📝 Description: ${savedEvent.description}`);
            console.log(`🧠 Embedding Description: ${savedEvent.embeddingDescription || 'NOT SAVED'}`);
            console.log(`🏷️  Categories: ${savedEvent.categories.join(', ')}`);

            if (savedEvent.embeddingDescription) {
                console.log('\n🎉 SUCCESS: Embedding description was generated and saved!');
            } else {
                console.log('\n❌ FAILURE: Embedding description was not saved to database');
            }
        } else {
            console.log('❌ Failed to retrieve event from database');
        }

        console.log('\n🎉 Embedding description test completed!');

    } catch (error: any) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run the test
testEmbeddingDescriptions(); 