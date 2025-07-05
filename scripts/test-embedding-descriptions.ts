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

        const event = await generateRealEvent(samplePseudoEvent, GOOGLE_PLACES_API_KEY!);

        if (!event) {
            console.error('❌ Failed to generate event');
            return;
        }




        const eventId = await insertEvent(event);



        const { getEventById } = await import('../lib/db/events');
        const savedEvent = await getEventById(eventId);

        if (savedEvent) {
            // Event retrieved from database successfully

            if (savedEvent.embeddingDescription) {
                // SUCCESS: Embedding description was generated and saved
            } else {
                // FAILURE: Embedding description was not saved to database
            }
        } else {
            // Failed to retrieve event from database
        }



    } catch (error: any) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run the test
testEmbeddingDescriptions(); 