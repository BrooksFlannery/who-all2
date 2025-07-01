import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { message } from "@/lib/db/schema";
import { EventMatchingService } from "@/lib/services/event-matching";
import { InterestExtractionService } from "@/lib/services/interest-extraction";
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

    // Initialize services
    const interestService = InterestExtractionService.getInstance();
    const eventService = EventMatchingService.getInstance();

    // Extract user interests from conversation
    let userInterests = null;
    let shouldUpdateInterests = false;

    try {
        const userProfile = await eventService.getUserProfile(session.user.id);
        if (userProfile) {
            userInterests = userProfile.interests;
            shouldUpdateInterests = userProfile.needsUpdate;
        } else {
            // Create default profile for existing user
            console.log("Creating default user profile for:", session.user.id);
            await eventService.createUserProfile(session.user.id, {
                name: session.user.name || "User",
                location: { lat: 0, lng: 0 }, // Default location
                interests: [],
                preferences: { distance_radius_km: 10, preferred_categories: [] }
            });

            // Initialize empty interests
            userInterests = {
                broad: [],
                specific: [],
                scores: {},
                lastUpdated: new Date()
            };
            shouldUpdateInterests = true;
        }

        // Extract interests from current message and context
        const recentMessages = messages.slice(-6); // Last 6 messages for context
        const extractionResult = await interestService.extractInterests(
            messages[messages.length - 1].content,
            recentMessages,
            userInterests || undefined
        );

        if (extractionResult.shouldUpdate && extractionResult.confidence > 0.3) {
            if (userInterests) {
                userInterests = interestService.updateUserInterests(userInterests, extractionResult);
            } else {
                userInterests = {
                    broad: extractionResult.newInterests.broad,
                    specific: extractionResult.newInterests.specific,
                    scores: {},
                    lastUpdated: new Date()
                };
                // Initialize scores
                extractionResult.newInterests.broad.forEach(interest => {
                    userInterests!.scores[interest] = extractionResult.confidence;
                });
                extractionResult.newInterests.specific.forEach(interest => {
                    userInterests!.scores[interest] = extractionResult.confidence;
                });
            }

            // Update user profile with new interests
            await eventService.updateUserProfile(session.user.id, userInterests);
            console.log("User interests updated");
        }
    } catch (error) {
        console.error("Error processing user interests:", error);
    }

    // Match events to user interests
    let matchedEvents: any[] = [];
    if (userInterests && (userInterests.broad.length > 0 || userInterests.specific.length > 0)) {
        try {
            matchedEvents = await eventService.matchEventsToInterests(session.user.id, userInterests, 3);
            console.log(`Found ${matchedEvents.length} matching events`);
        } catch (error) {
            console.error("Error matching events:", error);
        }
    }

    // Get the AI response using Vercel AI SDK
    console.log("Calling OpenAI...");
    try {
        const result = await streamText({
            model: openai("gpt-4o-mini"),
            messages: [
                ...messages,
                {
                    role: "system",
                    content: `You are a friendly event recommendation assistant. You know about all local events and want to help users find activities they'll enjoy.

When recommending events:
- Be conversational and enthusiastic
- Ask clarifying questions if too many events match (continue until you have 3 or fewer clear matches)
- Focus on category, activity level, and skill requirements
- Don't mention time/location (handled separately)
- Limit to 3 events maximum

If you have good matches, include them in your response like this:
<events>
[{"id": "event_id", "title": "Event Title", "description": "Description", "categories": ["category1"], "attendeesCount": 5, "interestedCount": 3, "location": {"neighborhood": "Area"}}]
</events>

If you don't have enough information about the user's interests, tell them you need to learn more about what they enjoy.

User Interests: ${userInterests ? JSON.stringify(userInterests) : 'none'}
Available Events: ${matchedEvents.length > 0 ? JSON.stringify(matchedEvents) : 'none'}`
                }
            ],
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

                    // Record event recommendations if any were made
                    if (matchedEvents.length > 0) {
                        for (const event of matchedEvents) {
                            await eventService.recordRecommendation(
                                session.user.id,
                                event.id,
                                messages[messages.length - 1].content
                            );
                        }
                        console.log("Event recommendations recorded");
                    }
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