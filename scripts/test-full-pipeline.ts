// Load environment variables FIRST, before any imports
import dotenv from 'dotenv';
dotenv.config();

// DEBUG: Print environment variables before any imports
console.log('DEBUG (test-full-pipeline.ts) ENVIRONMENT VARIABLES - BEFORE IMPORTS:');
console.log('  DATABASE_URL:', process.env.DATABASE_URL);
console.log('  OPENAI_API_KEY:', process.env.OPENAI_API_KEY);
console.log('  GOOGLE_PLACES_API_KEY:', process.env.GOOGLE_PLACES_API_KEY);
console.log('  All env keys:', Object.keys(process.env).filter(key => key.includes('DATABASE') || key.includes('OPENAI') || key.includes('GOOGLE') || key.includes('API')));

import { deleteEventById, getAllEvents, insertEvents } from '../lib/db/events';
import { generateRealEvents } from '../lib/event-generation';
import { PseudoEvent } from '../lib/pseudo-events';

// DEBUG: Print environment variables after dotenv.config()
console.log('DEBUG (test-full-pipeline.ts) ENVIRONMENT VARIABLES - AFTER DOTENV:');
console.log('  DATABASE_URL:', process.env.DATABASE_URL);
console.log('  OPENAI_API_KEY:', process.env.OPENAI_API_KEY);
console.log('  GOOGLE_PLACES_API_KEY:', process.env.GOOGLE_PLACES_API_KEY);

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

        // DEBUG: Before importing generate-pseudo-events
        console.log('DEBUG: About to import generate-pseudo-events...');

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

        // Step 3: Save events to database
        console.log('\n\n💾 STEP 3: SAVING EVENTS TO DATABASE');
        console.log('-'.repeat(60));

        const savedEventIds = await insertEvents(realEvents);
        console.log(`✅ Saved ${savedEventIds.length} events to database`);

        // Step 4: Verify events were saved
        console.log('\n\n🔍 STEP 4: VERIFYING DATABASE SAVE');
        console.log('-'.repeat(60));

        const savedEvents = await getAllEvents();
        console.log(`📊 Total events in database: ${savedEvents.length}`);

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
            console.log(`   🆔 Database ID: ${savedEventIds[index] || 'Not saved'}`);
        });

        console.log('\n\n📊 PIPELINE SUMMARY:');
        console.log(`   • Pseudo-events generated: ${pseudoEvents.length}`);
        console.log(`   • Real events created: ${realEvents.length}`);
        console.log(`   • Events saved to database: ${savedEventIds.length}`);
        console.log(`   • Success rate: ${((realEvents.length / pseudoEvents.length) * 100).toFixed(1)}%`);
        console.log(`   • Database save rate: ${((savedEventIds.length / realEvents.length) * 100).toFixed(1)}%`);
        console.log(`   • Clustering stats: ${result.stats.clusteredUsers} users clustered into ${result.stats.clustersGenerated} clusters`);

        // Step 5: Cleanup test events (optional - comment out to keep events)
        console.log('\n\n🧹 STEP 5: CLEANUP (Optional)');
        console.log('-'.repeat(60));

        const cleanup = process.env.CLEANUP_TEST_EVENTS !== 'false'; // Default to true
        if (cleanup) {
            console.log('🗑️ Cleaning up test events...');
            for (const eventId of savedEventIds) {
                await deleteEventById(eventId);
            }
            console.log('✅ Test events cleaned up');
        } else {
            console.log('💾 Keeping test events in database (CLEANUP_TEST_EVENTS=false)');
        }

        console.log('\n🎉 Full pipeline test completed successfully!');

    } catch (error: any) {
        console.error('❌ Full pipeline test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run the full pipeline test
testFullPipeline(); 