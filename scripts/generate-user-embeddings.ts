#!/usr/bin/env tsx

/**
 * Generate User Interest Embeddings Script
 * 
 * This script processes seeded users and generates interest summaries and embeddings
 * by analyzing their messages, reusing the same logic as the chat summarization endpoint.
 * 
 * Usage: npm run generate:embeddings
 */

import 'dotenv/config';
import { eq, isNull } from 'drizzle-orm';

import { initializeDatabase } from '../lib/db/index';
import { message, user } from '../lib/db/schema';
import { updateUserInterestEmbedding } from '../lib/embeddings';

/**
 * Process a single user: generate weighted interests and embedding
 */
async function processUser(userId: string): Promise<boolean> {
    try {
        console.log(`\n👤 Processing user: ${userId}`);

        // Get all messages for this user to create conversation context
        const database = initializeDatabase();
        if (!database) {
            throw new Error('Database not available');
        }

        const userMessages = await database
            .select()
            .from(message)
            .where(eq(message.userId, userId))
            .orderBy(message.createdAt);

        console.log(`📝 Found ${userMessages.length} messages for user ${userId}`);

        if (userMessages.length === 0) {
            console.log(`⚠️ No messages found for user ${userId}, skipping`);
            return false;
        }

        // Prepare conversation context for embedding generation
        const conversationContext = userMessages
            .map(msg => `${msg.role}: ${msg.content}`)
            .join('\n');

        console.log(`💬 Conversation context prepared (${conversationContext.length} characters)`);

        // Generate and store user interest embedding using conversation context
        console.log('🧠 Generating user interest embedding...');
        await updateUserInterestEmbedding(userId, conversationContext);
        console.log(`✅ Successfully processed user ${userId}`);

        return true;
    } catch (error) {
        console.error(`❌ Error processing user ${userId}:`, error);
        return false;
    }
}

/**
 * Main function to generate embeddings for all seeded users
 */
async function generateUserEmbeddings(): Promise<void> {
    console.log('🚀 GENERATE USER EMBEDDINGS SCRIPT');
    console.log('==================================================');
    console.log('🎯 Processing seeded users to generate weighted interests and embeddings...\n');

    const startTime = Date.now();
    let successCount = 0;
    let errorCount = 0;

    try {
        const database = initializeDatabase();
        if (!database) {
            throw new Error('Database not available');
        }

        // Get all users that don't have interest embeddings yet
        const usersWithoutEmbeddings = await database
            .select()
            .from(user)
            .where(isNull(user.interestEmbedding));

        console.log(`📊 Found ${usersWithoutEmbeddings.length} users without embeddings`);

        if (usersWithoutEmbeddings.length === 0) {
            console.log('✅ All users already have embeddings!');
            return;
        }

        // Process each user
        for (const userData of usersWithoutEmbeddings) {
            const success = await processUser(userData.id);
            if (success) {
                successCount++;
            } else {
                errorCount++;
            }
        }

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        console.log('\n📊 PROCESSING SUMMARY:');
        console.log('==================================================');
        console.log(`✅ Successfully processed: ${successCount} users`);
        console.log(`❌ Failed to process: ${errorCount} users`);
        console.log(`⏱️ Total time: ${duration.toFixed(2)}s`);
        console.log(`📈 Average time per user: ${(duration / usersWithoutEmbeddings.length).toFixed(2)}s`);

        // Final validation
        const usersWithEmbeddings = await database
            .select()
            .from(user)
            .where(isNull(user.interestEmbedding));

        console.log(`\n🔍 VALIDATION:`);
        console.log(`📊 Users with embeddings: ${usersWithoutEmbeddings.length - usersWithEmbeddings.length}`);
        console.log(`📊 Users without embeddings: ${usersWithEmbeddings.length}`);

        if (usersWithEmbeddings.length === 0) {
            console.log('🎉 All users now have embeddings! Ready for clustering.');
        } else {
            console.log('⚠️ Some users still lack embeddings. Check logs for errors.');
        }

    } catch (error) {
        console.error('❌ Script failed:', error);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    generateUserEmbeddings()
        .then(() => {
            console.log('\n🎉 Script completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Script failed:', error);
            process.exit(1);
        });
} 