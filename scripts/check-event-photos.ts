#!/usr/bin/env tsx

/**
 * Check Event Photos Script
 * 
 * This script checks what events exist in the database and whether they have secondary photos.
 * 
 * Usage: npm run check:event-photos
 */

import 'dotenv/config';
import { initializeDatabase } from '../lib/db/index';
import { event } from '../lib/db/schema';

/**
 * Check events and their photo status
 */
async function checkEventPhotos(): Promise<void> {
    console.log('🔍 CHECKING EVENT PHOTOS');
    console.log('========================');

    try {
        const database = initializeDatabase();
        if (!database) {
            throw new Error('Database not available');
        }

        // Get all events
        const events = await database.select().from(event);

        console.log(`📊 Found ${events.length} events in database`);

        if (events.length === 0) {
            console.log('❌ No events found in database');
            return;
        }

        // Analyze photo status
        const eventsWithPhotos = events.filter(e => e.secondaryPhotoUrl);
        const eventsWithoutPhotos = events.filter(e => !e.secondaryPhotoUrl);

        console.log('\n📸 PHOTO ANALYSIS:');
        console.log(`✅ Events with secondary photos: ${eventsWithPhotos.length}`);
        console.log(`❌ Events without secondary photos: ${eventsWithoutPhotos.length}`);

        if (eventsWithPhotos.length > 0) {
            console.log('\n📋 EVENTS WITH PHOTOS:');
            eventsWithPhotos.forEach((e, index) => {
                console.log(`${index + 1}. ${e.title}`);
                console.log(`   📸 Photo URL: ${e.secondaryPhotoUrl}`);
            });
        }

        if (eventsWithoutPhotos.length > 0) {
            console.log('\n📋 EVENTS WITHOUT PHOTOS:');
            eventsWithoutPhotos.forEach((e, index) => {
                console.log(`${index + 1}. ${e.title}`);
                const venue = e.venue as any;
                const location = e.location as any;
                console.log(`   🏢 Venue: ${venue?.name || 'No venue data'}`);
                console.log(`   📍 Location: ${location?.lat}, ${location?.lng}`);
            });
        }

        console.log('\n💡 RECOMMENDATIONS:');
        if (eventsWithoutPhotos.length > 0) {
            console.log(`• ${eventsWithoutPhotos.length} events need secondary photos`);
            console.log('• Run the full pipeline again to generate events with photos');
            console.log('• Or create a script to update existing events with photos');
        } else {
            console.log('• All events have secondary photos! 🎉');
        }

    } catch (error) {
        console.error('❌ Error checking event photos:', error);
        process.exit(1);
    }
}

/**
 * Main execution
 */
async function main() {
    console.log('🎯 Event Photo Check Script');
    console.log('==========================');

    await checkEventPhotos();

    console.log('\n✨ Script completed!');
}

// Run the script
main().catch(console.error); 