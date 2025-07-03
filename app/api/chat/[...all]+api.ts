import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { message } from "@/lib/db/schema";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { eq } from "drizzle-orm";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

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

    // Step 2: Verify database availability
    if (!db) {
        return new Response("Database not available", { status: 500 });
    }

    // Step 3: Extract messages from request body
    const { messages } = await req.json();

    // Step 4: Save the user's latest message to the database
    try {
        await db.insert(message).values({
            userId: session.user.id,
            content: messages[messages.length - 1].content, // Save the most recent message
            role: "user"
        });
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

    // Step 2: Verify database availability
    if (!db) {
        return new Response("Database not available", { status: 500 });
    }

    // Step 3: Fetch all messages for this user, ordered by creation time
    // This provides the complete conversation history
    const messages = await db
        .select()
        .from(message)
        .where(eq(message.userId, session.user.id))
        .orderBy(message.createdAt); // Oldest messages first

    return Response.json({ messages });
} 