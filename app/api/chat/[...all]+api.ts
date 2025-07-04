import { auth } from "@/lib/auth";
import { initializeDatabase } from "@/lib/db";
import { message, user } from "@/lib/db/schema";
import { updateUserInterestEmbedding } from "@/lib/embeddings";
import { chatRequestSchema, chatResponseSchema } from "@/lib/schemas";
import { createValidationErrorResponse, validateData } from "@/lib/validation";
import { openai } from "@ai-sdk/openai";
import { generateText, streamText } from "ai";
import { and, count, eq } from "drizzle-orm";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

/**
 * Helper function to trigger summarization in the background
 * This calls the summarization logic directly instead of making an HTTP request
 */
async function triggerSummarization(userId: string) {
    try {
        console.log('🔄 Background summarization triggered for user:', userId);

        // Initialize and check if database is available
        const db = initializeDatabase();
        if (!db) {
            console.warn('❌ Database not available for background summarization');
            return;
        }

        console.log('📝 Fetching unsummarized messages...');
        // Get unsummarized messages for the user
        const unsummarizedMessages = await db
            .select()
            .from(message)
            .where(
                and(
                    eq(message.userId, userId),
                    eq(message.isSummarized, false)
                )
            )
            .orderBy(message.createdAt);

        console.log(`📊 Found ${unsummarizedMessages.length} unsummarized messages`);

        if (unsummarizedMessages.length === 0) {
            console.log('ℹ️ No unsummarized messages to process');
            return;
        }

        console.log('👤 Fetching existing user interest summary...');
        // Get existing user interest summary for context
        const currentUser = await db
            .select({ userInterestSummary: user.userInterestSummary })
            .from(user)
            .where(eq(user.id, userId))
            .limit(1);

        const existingSummary = currentUser[0]?.userInterestSummary || "";
        console.log(`📋 Existing summary length: ${existingSummary.length} characters`);

        console.log('🔄 Preparing conversation context...');
        // Prepare conversation context for AI
        const conversationContext = unsummarizedMessages
            .map((msg: any) => `${msg.role}: ${msg.content}`)
            .join('\n');

        console.log(`💬 Conversation context prepared (${conversationContext.length} characters)`);

        console.log('🤖 Calling OpenAI for summarization...');
        // Generate new interest summary using AI
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
        // Get the final summary text
        console.log(`✅ AI summarization completed. Summary length: ${summaryText.length} characters`);

        console.log('💾 Updating database with new summary...');
        // Update database operations
        console.log('🔄 Starting database updates...');

        // Update user's interest summary
        console.log('👤 Updating user interest summary...');
        await db
            .update(user)
            .set({ userInterestSummary: summaryText })
            .where(eq(user.id, userId));

        // Generate and store user interest embedding
        console.log('🧠 Generating user interest embedding...');
        await updateUserInterestEmbedding(userId, summaryText);
        console.log('✅ User interest embedding generated and stored successfully');

        // Mark all processed messages as summarized
        console.log(`📝 Marking ${unsummarizedMessages.length} messages as summarized...`);
        await db
            .update(message)
            .set({ isSummarized: true })
            .where(eq(message.userId, userId));

        console.log('✅ Database updates completed successfully');
        console.log('🎉 Background summarization completed successfully');
    } catch (error) {
        console.warn('Background summarization error:', error);
    }
}

/**
 * POST endpoint for handling chat conversations with AI
 * 
 * This endpoint processes user messages and provides AI responses in a simple
 * conversational format without any evaluation or tool calls.
 * 
 * @param req - HTTP request containing the conversation messages
 * @returns Streaming response with AI-generated text
 */
export async function POST(req: Request) {
    // Step 1: Authenticate the user
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
        return new Response("Unauthorized", { status: 401 });
    }

    // Step 2: Initialize and verify database availability
    const db = initializeDatabase();
    if (!db) {
        return new Response("Database not available", { status: 500 });
    }

    // Step 3: Extract and validate messages from request body
    let requestBody: unknown;
    try {
        requestBody = await req.json();
    } catch (error) {
        return new Response("Invalid JSON in request body", { status: 400 });
    }

    const validation = validateData(chatRequestSchema, requestBody);
    if (!validation.success) {
        return createValidationErrorResponse(validation.errors);
    }

    const { messages } = validation.data;

    // Step 4: Save the user's latest message to the database
    try {
        await db.insert(message).values({
            userId: session.user.id,
            content: messages[messages.length - 1].content, // Save the most recent message
            role: "user"
        });

        // Step 4.5: Check if we should trigger automatic summarization
        const unsummarizedCount = await db
            .select({ count: count() })
            .from(message)
            .where(
                and(
                    eq(message.userId, session.user.id),
                    eq(message.isSummarized, false)
                )
            );

        // Trigger summarization if there are 10 or more unsummarized messages
        if (unsummarizedCount[0]?.count >= 10) {
            // Trigger in background - don't wait for it to complete
            triggerSummarization(session.user.id);
        }
    } catch (error) {
        // Continue processing even if message save fails
    }

    // Step 5: Create the AI conversation stream
    const result = streamText({
        model: openai("gpt-4o-mini"),
        messages: [
            {
                role: "system",
                content: `You are a friendly, helpful AI assistant. You engage in natural conversation with users and provide helpful responses. Keep your replies warm, conversational, and concise.`
            },
            ...messages, // Include the conversation history
        ],
        onFinish: async (completion) => {
            const db = initializeDatabase();
            if (!db) {
                return;
            }

            try {
                // Save the AI's response to the database
                await db.insert(message).values({
                    userId: session.user.id,
                    content: completion.text,
                    role: "assistant"
                });
            } catch (error) {
                // Continue even if message save fails
            }
        },
    });

    // Step 6: Return the streaming response
    return result.toDataStreamResponse();
}

/**
 * GET endpoint for retrieving user's chat history
 * 
 * This endpoint fetches all previous messages for a user, ordered chronologically.
 * It's used to restore conversation context when the user returns to the chat.
 * 
 * @param req - HTTP request (no body needed)
 * @returns JSON response containing array of message objects
 */
export async function GET(req: Request) {
    // Step 1: Authenticate the user
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
        return new Response("Unauthorized", { status: 401 });
    }

    // Step 2: Initialize and verify database availability
    const db = initializeDatabase();
    if (!db) {
        return new Response("Database not available", { status: 500 });
    }

    try {
        // Step 3: Fetch all messages for this user, ordered by creation time
        // This provides the complete conversation history
        const messages = await db
            .select()
            .from(message)
            .where(eq(message.userId, session.user.id))
            .orderBy(message.createdAt); // Oldest messages first

        // Step 4: Transform and validate the response
        const transformedMessages = messages.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            createdAt: msg.createdAt.toISOString(),
            isSummarized: msg.isSummarized,
        }));

        const responseData = { messages: transformedMessages };
        const validation = validateData(chatResponseSchema, responseData);

        if (!validation.success) {
            console.error('Response validation failed:', validation.errors);
            return new Response("Internal server error", { status: 500 });
        }

        return Response.json(validation.data);
    } catch (error) {
        console.error('Error fetching messages:', error);
        return new Response("Error fetching messages", { status: 500 });
    }
} 