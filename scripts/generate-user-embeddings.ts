#!/usr/bin/env tsx

/**
 * Generate User Interest Embeddings Script
 * 
 * This script processes seeded users and generates interest summaries and embeddings
 * by analyzing their messages, reusing the same logic as the chat summarization endpoint.
 * 
 * Usage: npm run generate:embeddings
 */

import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import 'dotenv/config';
import { eq, isNull } from 'drizzle-orm';

import { initializeDatabase } from '../lib/db/index';
import { message, user } from '../lib/db/schema';
import { updateUserInterestEmbedding } from '../lib/embeddings';

/**
 * Generate interest summary for a user based on their messages
 */
async function generateUserInterestSummary(userId: string): Promise<string> {
    console.log(`🔍 Generating interest summary for user ${userId}...`);

    const database = initializeDatabase();
    if (!database) {
        throw new Error('Database not available');
    }

    // Get all messages for this user
    const userMessages = await database
        .select()
        .from(message)
        .where(eq(message.userId, userId))
        .orderBy(message.createdAt);

    console.log(`📝 Found ${userMessages.length} messages for user ${userId}`);

    if (userMessages.length === 0) {
        console.log(`⚠️ No messages found for user ${userId}, skipping`);
        return '';
    }

    // Get existing user interest summary for context
    const currentUser = await database
        .select({ userInterestSummary: user.userInterestSummary })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

    const existingSummary = currentUser[0]?.userInterestSummary || "";
    console.log(`📋 Existing summary length: ${existingSummary.length} characters`);

    // Prepare conversation context for AI
    const conversationContext = userMessages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

    console.log(`💬 Conversation context prepared (${conversationContext.length} characters)`);

    // Generate new interest summary using AI
    console.log('🤖 Calling OpenAI for summarization...');
    const { text: summaryText } = await generateText({
        model: openai("gpt-4o-mini"),
        messages: [
            {
                role: "system",
                content: `You are an expert at analyzing conversations and extracting user interests. Generate a dense, factual summary of user interests from the conversation context.

IMPORTANT: Your output should be a single paragraph optimized for AI embedding generation, not human readability. Include:
- Interests: Hobbies, activities, topics they enjoy
- Skill levels: Beginner, intermediate, expert in their interests  
- Dislikes/aversions: Things they avoid or don't enjoy
- Location preferences: Geographic areas they prefer
- Availability patterns: When they're typically free
- Demographic information: Age group, lifestyle factors

If there's an existing summary, update it rather than replacing it. Make the summary comprehensive and factual.`
            },
            {
                role: "user",
                content: `Existing interest summary: "${existingSummary}"

New conversation context:
${conversationContext}

Generate an updated interest summary that incorporates the new information.`
            }
        ],
        maxTokens: 500,
        temperature: 0.3,
    });

    console.log(`✅ AI summarization completed. Summary length: ${summaryText.length} characters`);
    return summaryText;
}

/**
 * Process a single user: generate summary and embedding
 */
async function processUser(userId: string): Promise<boolean> {
    try {
        console.log(`\n👤 Processing user: ${userId}`);

        // Step 1: Generate interest summary
        const summary = await generateUserInterestSummary(userId);

        if (!summary) {
            console.log(`⚠️ No summary generated for user ${userId}, skipping`);
            return false;
        }

        // Step 2: Update user's interest summary in database
        console.log('💾 Updating user interest summary...');
        const database = initializeDatabase();
        if (!database) {
            throw new Error('Database not available');
        }
        await database
            .update(user)
            .set({ userInterestSummary: summary })
            .where(eq(user.id, userId));

        // Step 3: Generate and store user interest embedding
        console.log('🧠 Generating user interest embedding...');
        await updateUserInterestEmbedding(userId, summary);
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
    console.log('🎯 Processing seeded users to generate interest summaries and embeddings...\n');

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