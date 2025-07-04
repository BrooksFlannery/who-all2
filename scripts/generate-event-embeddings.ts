#!/usr/bin/env tsx

/**
 * Generate Event Embeddings Script
 * 
 * This script generates embeddings for all events that don't have them yet.
 * 
 * Usage: npm run generate:event-embeddings
 */

import 'dotenv/config';
import { isNull } from 'drizzle-orm';

import { initializeDatabase } from '../lib/db/index';
import { event } from '../lib/db/schema';
import { updateEventEmbedding } from '../lib/embeddings';

/**
 * Generate embeddings for all events that don't have them yet
 */
async function generateEventEmbeddings(): Promise<void> {
    console.log('🚀 GENERATE EVENT EMBEDDINGS SCRIPT');
    console.log('==================================================');
    console.log('🎯 Processing events to generate embeddings...\n');

    const startTime = Date.now();
    let successCount = 0;
    let errorCount = 0;

    try {
        const database = initializeDatabase();
        if (!database) {
            throw new Error('Database not available');
        }

        // Get all events without embeddings
        const eventsWithoutEmbeddings = await database
            .select()
            .from(event)
            .where(isNull(event.embedding));

        console.log(`📊 Found ${eventsWithoutEmbeddings.length} events without embeddings`);

        if (eventsWithoutEmbeddings.length === 0) {
            console.log('✅ All events already have embeddings!');
            return;
        }

        // Generate embeddings for each event
        for (const evt of eventsWithoutEmbeddings) {
            try {
                console.log(`🔄 Generating embedding for event: ${evt.title}`);

                await updateEventEmbedding(
                    evt.id,
                    evt.title,
                    evt.description,
                    evt.categories
                );

                console.log(`✅ Generated embedding for: ${evt.title}`);
                successCount++;
            } catch (error) {
                console.error(`❌ Failed to generate embedding for ${evt.title}:`, error);
                errorCount++;
            }
        }

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        console.log('\n📊 PROCESSING SUMMARY:');
        console.log('==================================================');
        console.log(`✅ Successfully generated: ${successCount} embeddings`);
        console.log(`❌ Failed: ${errorCount} events`);
        console.log(`⏱️ Total time: ${duration.toFixed(2)}s`);
        console.log(`📈 Average time per event: ${(duration / eventsWithoutEmbeddings.length).toFixed(2)}s`);

        // Final validation
        const eventsStillWithoutEmbeddings = await database
            .select()
            .from(event)
            .where(isNull(event.embedding));

        console.log(`\n🔍 VALIDATION:`);
        console.log(`📊 Events with embeddings: ${eventsWithoutEmbeddings.length - eventsStillWithoutEmbeddings.length}`);
        console.log(`📊 Events without embeddings: ${eventsStillWithoutEmbeddings.length}`);

        if (eventsStillWithoutEmbeddings.length === 0) {
            console.log('🎉 All events now have embeddings! Ready for recommendations.');
        } else {
            console.log('⚠️ Some events still missing embeddings. Check logs above for errors.');
        }

    } catch (error) {
        console.error('❌ Error during embedding generation:', error);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    generateEventEmbeddings()
        .then(() => {
            console.log('✅ Script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Script failed:', error);
            process.exit(1);
        });
} 