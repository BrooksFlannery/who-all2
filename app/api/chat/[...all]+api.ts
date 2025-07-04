import { auth } from "@/lib/auth";
import { initializeDatabase } from "@/lib/db";
import { message, user } from "@/lib/db/schema";
import { updateUserInterestEmbedding } from "@/lib/embeddings";
import { chatRequestSchema, chatResponseSchema } from "@/lib/schemas";
import { createValidationErrorResponse, validateData } from "@/lib/validation";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { and, count, eq } from "drizzle-orm";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

/**
 * Helper function to update user interest embedding in the background
 * This processes unsummarized messages and existing weighted interests to generate updated interests
 */
async function triggerInterestUpdate(userId: string) {
    try {
        console.log('🔄 Background interest update triggered for user:', userId);

        // Initialize and check if database is available
        const db = initializeDatabase();
        if (!db) {
            console.warn('❌ Database not available for background interest update');
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

        console.log('👤 Fetching existing weighted interests...');
        // Get existing weighted interests for context
        const currentUser = await db
            .select({ weightedInterests: user.weightedInterests })
            .from(user)
            .where(eq(user.id, userId))
            .limit(1);

        const existingWeightedInterests = currentUser[0]?.weightedInterests || "";
        console.log(`📋 Existing weighted interests: ${existingWeightedInterests ? existingWeightedInterests.substring(0, 100) + '...' : 'None'}`);

        console.log('🔄 Preparing conversation context...');
        // Prepare conversation context for weighted interest generation
        const conversationContext = unsummarizedMessages
            .map((msg: any) => `${msg.role}: ${msg.content}`)
            .join('\n');

        console.log(`💬 Conversation context prepared (${conversationContext.length} characters)`);

        // Generate and store user interest embedding using weighted interests
        console.log('🧠 Generating user interest embedding...');
        await updateUserInterestEmbedding(userId, conversationContext, existingWeightedInterests);
        console.log('✅ User interest embedding generated and stored successfully');

        // Mark all processed messages as summarized
        console.log(`📝 Marking ${unsummarizedMessages.length} messages as summarized...`);
        await db
            .update(message)
            .set({ isSummarized: true })
            .where(eq(message.userId, userId));

        console.log('✅ Database updates completed successfully');
        console.log('🎉 Background interest update completed successfully');
    } catch (error) {
        console.warn('Background interest update error:', error);
    }
}

/**
 * POST endpoint for handling chat conversations with AI
 * 
 * This endpoint processes user messages and provides AI responses in a simple
 * conversational format. It also triggers interest updates after 10 messages.
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

        // Step 4.5: Check if we should trigger interest update
        const unsummarizedCount = await db
            .select({ count: count() })
            .from(message)
            .where(
                and(
                    eq(message.userId, session.user.id),
                    eq(message.isSummarized, false)
                )
            );

        // Trigger interest update if there are 10 or more unsummarized messages
        if (unsummarizedCount[0]?.count >= 10) {
            // Trigger in background - don't wait for it to complete
            triggerInterestUpdate(session.user.id);
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