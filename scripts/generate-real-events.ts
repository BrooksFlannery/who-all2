import 'dotenv/config';
import { generateRealEvent } from '../lib/event-generation';
import { generatePseudoEvents } from './generate-pseudo-events';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!GOOGLE_PLACES_API_KEY) {
    console.error('❌ GOOGLE_PLACES_API_KEY not found in environment variables');
    process.exit(1);
}

async function main() {
    console.log('🚀 Running full pipeline: user interests → pseudo-events → real events');

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

    // Step 3: Print all real event objects
    console.log('\n🎉 Full Real Events Generated:');
    realEvents.forEach((event, idx) => {
        console.log(`\n${idx + 1}. Complete Real Event Data:`);
        console.log(JSON.stringify(event, null, 2));
    });

    console.log('\n✨ Pipeline completed!');
}

if (require.main === module) {
    main().catch(console.error);
} 