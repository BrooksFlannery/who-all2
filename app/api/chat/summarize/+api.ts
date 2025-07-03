import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { message, user } from "@/lib/db/schema";
import { updateUserInterestEmbedding } from "@/lib/embeddings";
import { summarizationResponseSchema } from "@/lib/schemas";
import { validateData } from "@/lib/validation";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { and, eq } from "drizzle-orm";

// Allow processing up to 30 seconds
export const maxDuration = 30;

/**
 * POST endpoint for triggering chat summarization
 * 
 * This endpoint processes unsummarized messages for a user and generates
 * a comprehensive interest summary. It can be triggered manually (debug)
 * or automatically after 10 new messages.
 * 
 * @param req - HTTP request (no body needed)
 * @returns JSON response with success/failure status
 */
export async function POST(req: Request) {
    console.log('🔍 Summarization endpoint called');

    // Step 1: Authenticate the user
    console.log('🔐 Step 1: Authenticating user...');
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
        console.log('❌ Authentication failed - no session or user ID');
        return new Response("Unauthorized", { status: 401 });
    }
    console.log('✅ Authentication successful for user:', session.user.id);

    // Step 2: Verify database availability
    console.log('🗄️ Step 2: Checking database availability...');
    if (!db) {
        console.log('❌ Database not available');
        return new Response("Database not available", { status: 500 });
    }
    console.log('✅ Database connection verified');

    try {
        // Step 3: Get unsummarized messages for the user
        console.log('📝 Step 3: Fetching unsummarized messages...');
        const unsummarizedMessages = await db
            .select()
            .from(message)
            .where(
                and(
                    eq(message.userId, session.user.id),
                    eq(message.isSummarized, false)
                )
            )
            .orderBy(message.createdAt); // Oldest first for context

        console.log(`📊 Found ${unsummarizedMessages.length} unsummarized messages`);

        // Step 4: Check if there are messages to summarize
        if (unsummarizedMessages.length === 0) {
            console.log('ℹ️ No messages to summarize, returning early');
            const responseData = {
                success: true,
                message: "No new messages to summarize",
                messageCount: 0
            };

            const validation = validateData(summarizationResponseSchema, responseData);
            if (!validation.success) {
                console.error('❌ Response validation failed:', validation.errors);
                return new Response("Internal server error", { status: 500 });
            }

            return Response.json(validation.data);
        }

        // Step 5: Get existing user interest summary for context
        console.log('👤 Step 5: Fetching existing user interest summary...');
        const currentUser = await db
            .select({ userInterestSummary: user.userInterestSummary })
            .from(user)
            .where(eq(user.id, session.user.id))
            .limit(1);

        const existingSummary = currentUser[0]?.userInterestSummary || "";
        console.log(`📋 Existing summary length: ${existingSummary.length} characters`);

        // Step 6: Prepare conversation context for AI
        console.log('🔄 Step 6: Preparing conversation context...');
        const conversationContext = unsummarizedMessages
            .map(msg => `${msg.role}: ${msg.content}`)
            .join('\n');

        console.log(`💬 Conversation context prepared (${conversationContext.length} characters)`);
        console.log('📄 First 200 chars of context:', conversationContext.substring(0, 200) + '...');

        // Step 7: Generate new interest summary using AI
        console.log('🤖 Step 7: Calling OpenAI for summarization...');

        // Use generateText instead of streamText for more reliability
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

        console.log('⏳ Waiting for AI response...');
        // Step 8: Get the final summary text
        console.log(`✅ AI summarization completed. Summary length: ${summaryText.length} characters`);
        console.log('📄 First 200 chars of new summary:', summaryText.substring(0, 200) + '...');

        // Step 9: Update database with new summary
        console.log('💾 Step 9: Updating database with new summary...');

        // Update user's interest summary
        console.log('👤 Updating user interest summary...');
        await db
            .update(user)
            .set({ userInterestSummary: summaryText })
            .where(eq(user.id, session.user.id));

        // Step 9.5: Generate and store user interest embedding
        console.log('🧠 Step 9.5: Generating user interest embedding...');
        await updateUserInterestEmbedding(session.user.id, summaryText);
        console.log('✅ User interest embedding generated and stored successfully');

        // Mark all processed messages as summarized
        console.log(`📝 Marking ${unsummarizedMessages.length} messages as summarized...`);
        await db
            .update(message)
            .set({ isSummarized: true })
            .where(eq(message.userId, session.user.id));

        console.log('✅ Database updates completed successfully');

        // Step 10: Return success response with validation
        console.log('📤 Step 10: Preparing response...');
        const responseData = {
            success: true,
            message: "Interest summary updated successfully",
            messageCount: unsummarizedMessages.length,
            summaryLength: summaryText.length
        };

        const validation = validateData(summarizationResponseSchema, responseData);
        if (!validation.success) {
            console.error('❌ Response validation failed:', validation.errors);
            return new Response("Internal server error", { status: 500 });
        }

        console.log('🎉 Summarization process completed successfully!');
        return Response.json(validation.data);

    } catch (error) {
        console.error("❌ Summarization error:", error);
        console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
        return new Response("Error during summarization", { status: 500 });
    }
} 