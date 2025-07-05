import 'dotenv/config';
import { insertEvents } from '../lib/db/events';
import { generateRealEvent } from '../lib/event-generation';
import { assignSeedUsersToEvents } from './assign-seed-users-to-events';
import { generatePseudoEvents } from './generate-pseudo-events';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!GOOGLE_PLACES_API_KEY) {
    console.error('❌ GOOGLE_PLACES_API_KEY not found in environment variables');
    process.exit(1);
}

async function main() {
    console.log('🚀 Running full pipeline: user interests → pseudo-events → real events → seed user assignment');

    // Step 1: Generate pseudo-events
    const pseudoResult = await generatePseudoEvents();
    if (!pseudoResult.success || pseudoResult.pseudoEvents.length === 0) {
        console.error('❌ No pseudo-events generated. Exiting.');
        process.exit(1);
    }

    // Step 2: Generate real events from pseudo-events
    const realEvents = [];
    for (const pseudoEvent of pseudoResult.pseudoEvents) {
        const realEvent = await generateRealEvent(pseudoEvent, GOOGLE_PLACES_API_KEY!);
        if (realEvent) {
            realEvents.push(realEvent);
        } else {
            console.warn('⚠️ No real event generated for:', pseudoEvent.title);
        }
    }

    // Step 3: Save events to database
    console.log(`\n💾 Step 3: Saving ${realEvents.length} events to database...`);
    let savedEventIds: string[] = [];
    try {
        savedEventIds = await insertEvents(realEvents);
        console.log(`✅ Successfully saved ${savedEventIds.length} events to database`);
    } catch (error) {
        console.error('❌ Failed to save events to database:', error);
        process.exit(1);
    }

    // Step 4: Print summary of saved events
    console.log('\n🎉 Events saved to database:');
    realEvents.forEach((event, idx) => {
        console.log(`\n${idx + 1}. ${event.title}`);
        console.log(`   📍 ${event.venue?.name || 'No venue'}`);
        console.log(`   📅 ${event.date.toLocaleDateString()}`);
        console.log(`   🏷️  ${event.categories.join(', ')}`);
        console.log(`   🆔 ${savedEventIds[idx]}`);
    });

    // Step 5: Automatically assign seed users to events
    console.log('\n👥 Step 4: Automatically assigning seed users to events...');
    const assignmentResult = await assignSeedUsersToEvents();

    if (assignmentResult.success) {
        console.log(`✅ Successfully assigned ${assignmentResult.usersAssigned} seed users to events`);
        console.log(`   - ${assignmentResult.interestedAssignments} interested assignments`);
        console.log(`   - ${assignmentResult.attendingAssignments} attending assignments`);
    } else {
        console.warn('⚠️ Seed user assignment failed or no seed users found');
    }

    console.log('\n✨ Pipeline completed!');
}

if (require.main === module) {
    main().catch(console.error);
} 