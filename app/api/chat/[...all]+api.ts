import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { message } from "@/lib/db/schema";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { eq } from "drizzle-orm";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    console.log("=== POST /api/chat - Request received ===");
    console.log("Request URL:", req.url);
    console.log("Request method:", req.method);
    console.log("Request origin:", req.headers.get('origin'));
    console.log("Request user-agent:", req.headers.get('user-agent'));
    console.log("All request headers:", Object.fromEntries(req.headers.entries()));

    // Get the current user session
    console.log("Attempting to get session...");
    const session = await auth.api.getSession({ headers: req.headers });
    console.log("Session result:", session);
    console.log("Session user ID:", session?.user?.id);
    console.log("Session authenticated:", session?.user?.id ? "YES" : "NO");

    if (!session?.user?.id) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (!db) {
        console.log("Database not available");
        return new Response("Database not available", { status: 500 });
    }

    const { messages } = await req.json();
    console.log("Messages received:", messages.length);

    // Save the user's message to the database
    try {
        await db.insert(message).values({
            userId: session.user.id,
            content: messages[messages.length - 1].content,
            role: "user"
        });
        console.log("User message saved to database");
    } catch (error) {
        console.error("Error saving user message:", error);
    }

    // Get the AI response using Vercel AI SDK
    console.log("Calling OpenAI...");
    try {
        const result = await streamText({
            model: openai("gpt-4o-mini"),
            messages,
            onFinish: async (completion) => {
                // Save the AI's response to the database
                if (!db) {
                    console.error("Database not available for AI message save");
                    return;
                }
                try {
                    await db.insert(message).values({
                        userId: session.user.id,
                        content: completion.text,
                        role: "assistant"
                    });
                    console.log("AI message saved to database");
                } catch (error) {
                    console.error("Error saving AI message:", error);
                }
            },
        });
        console.log("OpenAI response received, returning stream");

        // Return the streaming response immediately
        const response = result.toDataStreamResponse();

        // Add headers to prevent buffering
        response.headers.set('Cache-Control', 'no-cache, no-transform');
        response.headers.set('Connection', 'keep-alive');
        response.headers.set('X-Accel-Buffering', 'no');

        console.log("Response headers:", Object.fromEntries(response.headers.entries()));
        return response;
    } catch (error) {
        console.error("Error calling OpenAI:", error);
        return new Response("Error calling AI service", { status: 500 });
    }
}

// GET endpoint to fetch user's message history
export async function GET(req: Request) {
    console.log("=== GET /api/chat - Request received ===");
    console.log("Request URL:", req.url);
    console.log("Request method:", req.method);
    console.log("Request origin:", req.headers.get('origin'));
    console.log("Request user-agent:", req.headers.get('user-agent'));
    console.log("All request headers:", Object.fromEntries(req.headers.entries()));

    console.log("Attempting to get session for GET request...");
    const session = await auth.api.getSession({ headers: req.headers });
    console.log("GET Session result:", session);
    console.log("GET Session user ID:", session?.user?.id);
    console.log("GET Session authenticated:", session?.user?.id ? "YES" : "NO");

    if (!session?.user?.id) {
        console.log("GET request unauthorized - no session");
        return new Response("Unauthorized", { status: 401 });
    }

    if (!db) {
        return new Response("Database not available", { status: 500 });
    }

    // Fetch all messages for this user, ordered by creation time (oldest first)
    const messages = await db
        .select()
        .from(message)
        .where(eq(message.userId, session.user.id))
        .orderBy(message.createdAt);

    return Response.json({ messages });
} 