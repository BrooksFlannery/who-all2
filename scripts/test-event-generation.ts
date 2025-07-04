import dotenv from 'dotenv';
import { generateRealEvents } from '../lib/event-generation';
import { PseudoEvent } from '../lib/google-places';

// Load environment variables
dotenv.config();

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!GOOGLE_PLACES_API_KEY) {
    console.error('❌ GOOGLE_PLACES_API_KEY not found in environment variables');
    process.exit(1);
}

async function testEventGeneration() {
    console.log('🧪 Testing event generation functions...');

    // Create sample pseudo-events for testing
    const samplePseudoEvents: PseudoEvent[] = [
        {
            title: "Coffee Shop Meetup",
            description: "A casual meetup at a local coffee shop for networking and conversation",
            categories: ["social", "food"],
            targetLocation: {
                center: { lat: 40.7580, lng: -73.9855 }, // Times Square, NYC
                radiusMeters: 1000
            },
            venueTypeQuery: "coffee shop",
            estimatedAttendees: 10
        },
        {
            title: "Dinner Meetup",
            description: "Join us for dinner at a local restaurant",
            categories: ["social", "food"],
            targetLocation: {
                center: { lat: 40.7600, lng: -73.9830 }, // Slightly different location
                radiusMeters: 800
            },
            venueTypeQuery: "restaurant",
            estimatedAttendees: 8
        },
        {
            title: "Rock Climbing Session",
            description: "Indoor rock climbing for beginners and experienced climbers",
            categories: ["fitness", "social"],
            targetLocation: {
                center: { lat: 40.7550, lng: -73.9870 }, // Another location
                radiusMeters: 1500
            },
            venueTypeQuery: "rock climbing gym",
            estimatedAttendees: 15
        }
    ];

    try {
        console.log(`🔍 Generating real events from ${samplePseudoEvents.length} pseudo-events...`);

        const events = await generateRealEvents(samplePseudoEvents, GOOGLE_PLACES_API_KEY!);

        console.log(`✅ Generated ${events.length} real events:`);

        events.forEach((event, index) => {
            console.log(`\n📅 Event ${index + 1}: ${event.title}`);
            console.log(`   📝 Description: ${event.description}`);
            console.log(`   🏷️  Categories: ${event.categories.join(', ')}`);
            console.log(`   📅 Date: ${event.date.toLocaleString()}`);
            console.log(`   📍 Location: ${event.location.lat}, ${event.location.lng}`);
            if (event.location.neighborhood) {
                console.log(`   🏘️  Neighborhood: ${event.location.neighborhood}`);
            }
            if (event.venue) {
                console.log(`   🏢 Venue: ${event.venue.name}`);
                console.log(`   🏷️  Venue Types: ${event.venue.types.slice(0, 3).join(', ')}`);
            }
            console.log(`   ⭐ Venue Rating: ${event.venueRating || 'N/A'}`);
            console.log(`   💰 Venue Price Level: ${event.venuePriceLevel ? '$'.repeat(event.venuePriceLevel) : 'N/A'}`);
            console.log(`   🔗 Google Maps: https://maps.google.com/?q=${event.location.lat},${event.location.lng}`);
        });

        console.log('\n🎉 Event generation test completed!');

    } catch (error: any) {
        console.error('❌ Event generation test failed:', error.message);
        process.exit(1);
    }
}

// Run the test
testEventGeneration(); 