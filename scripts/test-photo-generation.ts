#!/usr/bin/env tsx

/**
 * Test Photo Generation Script
 * 
 * This script tests if event generation with secondary photos works correctly.
 * 
 * Usage: npm run test:photo-generation
 */

import 'dotenv/config';
import { generateRealEvent } from '../lib/event-generation';
import { PseudoEvent } from '../lib/pseudo-events';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!GOOGLE_PLACES_API_KEY) {
    console.error('❌ GOOGLE_PLACES_API_KEY not found in environment variables');
    process.exit(1);
}

async function testPhotoGeneration() {
    console.log('🧪 TESTING PHOTO GENERATION');
    console.log('============================');

    // Create a single sample pseudo-event for testing
    const samplePseudoEvent: PseudoEvent = {
        title: "Coffee Shop Meetup",
        description: "A casual meetup at a local coffee shop for networking and conversation",
        categories: ["social", "food"],
        targetLocation: {
            center: { lat: 40.7580, lng: -73.9855 }, // Times Square, NYC
            radiusMeters: 1000
        },
        venueTypeQuery: "coffee shop",
        clusterUserIds: ["user1", "user2", "user3"],
        generatedFrom: {
            centroidUserIds: ["user1", "user2"],
            clusterId: "cluster1"
        }
    };

    try {
        console.log('🔍 Generating event with venue and photos...');

        const event = await generateRealEvent(samplePseudoEvent, GOOGLE_PLACES_API_KEY!);

        if (!event) {
            console.error('❌ Failed to generate event');
            return;
        }

        console.log('\n✅ EVENT GENERATED SUCCESSFULLY:');
        console.log(`📝 Title: ${event.title}`);
        console.log(`🏢 Venue: ${event.venue?.name || 'No venue'}`);
        console.log(`📍 Location: ${event.location.lat}, ${event.location.lng}`);
        console.log(`⭐ Rating: ${event.venueRating || 'N/A'}`);
        console.log(`💰 Price Level: ${event.venuePriceLevel ? '$'.repeat(event.venuePriceLevel) : 'N/A'}`);

        if (event.secondaryPhotoUrl) {
            console.log(`📸 Secondary Photo: ✅ FOUND`);
            console.log(`   URL: ${event.secondaryPhotoUrl}`);
        } else {
            console.log(`📸 Secondary Photo: ❌ NOT FOUND`);
            console.log(`   This could be because:`);
            console.log(`   - The venue doesn't have secondary photos`);
            console.log(`   - Photo fetching failed due to API issues`);
            console.log(`   - Authentication issues on web platform`);
        }

        console.log('\n💡 RECOMMENDATIONS:');
        if (event.secondaryPhotoUrl) {
            console.log('✅ Photo generation is working! You can run the full pipeline.');
        } else {
            console.log('⚠️ Photo generation failed. Check the logs above for issues.');
            console.log('   The full pipeline might still work but without secondary photos.');
        }

    } catch (error: any) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

/**
 * Main execution
 */
async function main() {
    console.log('🎯 Photo Generation Test Script');
    console.log('===============================');

    await testPhotoGeneration();

    console.log('\n✨ Test completed!');
}

// Run the script
main().catch(console.error); 