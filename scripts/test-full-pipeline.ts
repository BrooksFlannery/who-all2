import dotenv from 'dotenv';
import { generateRealEvents } from '../lib/event-generation';
import { PseudoEvent } from '../lib/pseudo-events';

// Load environment variables
dotenv.config();

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!GOOGLE_PLACES_API_KEY) {
    console.error('❌ GOOGLE_PLACES_API_KEY not found in environment variables');
    process.exit(1);
}

async function testFullPipeline() {
    console.log('🚀 TESTING FULL PIPELINE: User Clustering → Pseudo-Events → Real Events');
    console.log('='.repeat(80));

    try {
        // Step 1: Generate pseudo-events from user clusters
        console.log('\n📊 STEP 1: GENERATING PSEUDO-EVENTS FROM USER CLUSTERS');
        console.log('-'.repeat(60));

        // Import and run the pseudo-event generation script
        const { generatePseudoEvents } = await import('../scripts/generate-pseudo-events');
        const result = await generatePseudoEvents();

        if (!result.success) {
            throw new Error(`Pseudo-event generation failed: ${result.errors?.join(', ')}`);
        }

        const pseudoEvents = result.pseudoEvents;
        console.log(`✅ Generated ${pseudoEvents.length} pseudo-events from user clusters`);

        // Display pseudo-events
        pseudoEvents.forEach((event: PseudoEvent, index: number) => {
            console.log(`\n📋 Pseudo-Event ${index + 1}:`);
            console.log(`   🏷️  Title: ${event.title}`);
            console.log(`   📝 Description: ${event.description}`);
            console.log(`   🏷️  Categories: [${event.categories.join(', ')}]`);
            console.log(`   📍 Location: ${event.targetLocation.center.lat}, ${event.targetLocation.center.lng}`);
            console.log(`   🏢 Venue Query: "${event.venueTypeQuery}"`);
            console.log(`   👥 Users: ${event.clusterUserIds.length} users`);
            console.log(`   🎯 Generated from cluster: ${event.generatedFrom.clusterId}`);
        });

        // Step 2: Convert pseudo-events to real events with venues
        console.log('\n\n🏢 STEP 2: CONVERTING TO REAL EVENTS WITH VENUES');
        console.log('-'.repeat(60));

        const realEvents = await generateRealEvents(pseudoEvents, GOOGLE_PLACES_API_KEY!);

        console.log(`✅ Generated ${realEvents.length} real events with venues`);

        // Display final results
        console.log('\n\n🎉 FINAL RESULTS: COMPLETE PIPELINE OUTPUT');
        console.log('='.repeat(80));

        realEvents.forEach((event, index) => {
            console.log(`\n📅 Event ${index + 1}: ${event.title}`);
            console.log(`   📝 Description: ${event.description}`);
            console.log(`   🏷️  Categories: [${event.categories.join(', ')}]`);
            console.log(`   📅 Date: ${event.date.toLocaleString()}`);
            console.log(`   📍 Location: ${event.location.lat}, ${event.location.lng}`);
            if (event.venue) {
                console.log(`   🏢 Venue: ${event.venue.name}`);
                console.log(`   🏷️  Venue Types: ${event.venue.types.slice(0, 3).join(', ')}`);
                console.log(`   ⭐ Venue Rating: ${event.venueRating || 'N/A'}`);
                console.log(`   💰 Venue Price Level: ${event.venuePriceLevel || 'N/A'}`);
            }
            console.log(`   🔗 Google Maps: https://maps.google.com/?q=${event.location.lat},${event.location.lng}`);
        });

        console.log('\n\n📊 PIPELINE SUMMARY:');
        console.log(`   • Pseudo-events generated: ${pseudoEvents.length}`);
        console.log(`   • Real events created: ${realEvents.length}`);
        console.log(`   • Success rate: ${((realEvents.length / pseudoEvents.length) * 100).toFixed(1)}%`);
        console.log(`   • Clustering stats: ${result.stats.clusteredUsers} users clustered into ${result.stats.clustersGenerated} clusters`);

        console.log('\n🎉 Full pipeline test completed successfully!');

    } catch (error: any) {
        console.error('❌ Full pipeline test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run the full pipeline test
testFullPipeline(); 