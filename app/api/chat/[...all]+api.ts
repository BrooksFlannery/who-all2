import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { message } from "@/lib/db/schema";
import { UserInterestNew } from "@/lib/db/types";
import { EventMatchingService } from "@/lib/services/event-matching";
import { InterestExtractionService } from "@/lib/services/interest-extraction";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { eq } from "drizzle-orm";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    // Get the current user session
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user?.id) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (!db) {
        console.log("Database not available");
        return new Response("Database not available", { status: 500 });
    }

    const { messages } = await req.json();

    // Save the user's message to the database
    try {
        await db.insert(message).values({
            userId: session.user.id,
            content: messages[messages.length - 1].content,
            role: "user"
        });
    } catch (error) {
        console.error("Error saving user message:", error);
    }

    // Initialize services
    const interestService = InterestExtractionService.getInstance();
    const eventService = EventMatchingService.getInstance();

    // Extract user interests from conversation
    let userInterests: UserInterestNew[] = [];
    let shouldUpdateInterests = false;
    let newHighConfidenceInterests: UserInterestNew[] = [];

    try {
        const userProfile = await eventService.getUserProfile(session.user.id);
        if (userProfile) {
            userInterests = userProfile.interests;
            shouldUpdateInterests = userProfile.needsUpdate;
        } else {
            // Create default profile for existing user
            await eventService.createUserProfile(session.user.id, {
                name: session.user.name || "User",
                location: { lat: 0, lng: 0 }, // Default location
                interests: [],
                preferences: { distance_radius_km: 10, preferred_categories: [] }
            });
            userInterests = [];
            shouldUpdateInterests = true;
        }

        // Extract interests from current message and context
        const recentMessages = messages.slice(-6); // Last 6 messages for context
        const extractionResult = await interestService.extractInterests(
            messages[messages.length - 1].content,
            recentMessages,
            userInterests.length > 0 ? userInterests : undefined
        );

        // Find new high-confidence interests
        newHighConfidenceInterests = extractionResult.newInterests.filter(
            i => i.confidence >= 0.8 && i.specificity >= 0.7 && !userInterests.some(u => u.keyword === i.keyword)
        );

        if (extractionResult.shouldUpdate && extractionResult.confidence > 0.3) {
            // Merge new interests
            userInterests = interestService.mergeSimilarKeywords(extractionResult.newInterests, userInterests);
            // Update user profile with new interests
            await eventService.updateUserProfile(session.user.id, userInterests);

            // Log what we learned
            if (extractionResult.newInterests.length > 0) {
                console.log("🤖 Learning new interests:",
                    extractionResult.newInterests.map(i =>
                        `"${i.keyword}" (confidence: ${i.confidence}, specificity: ${i.specificity})`
                    ).join(", ")
                );
            }
        }
    } catch (error) {
        console.error("Error processing user interests:", error);
    }

    // Recommendation trigger logic
    const hasSufficientKeywords = userInterests.length >= 5;
    const hasHighSpecificity = userInterests.some(i => i.specificity >= 0.7);
    const isExplicitRequest = /recommend|suggest|event|activity|something to do/i.test(messages[messages.length - 1].content);

    let matchedEvents: any[] = [];
    if ((hasSufficientKeywords && hasHighSpecificity) || isExplicitRequest) {
        try {
            matchedEvents = await eventService.matchEventsToInterests(session.user.id, userInterests, 3);

            if (matchedEvents.length > 0) {
                console.log("🎯 Found matching events:",
                    matchedEvents.map(e => `"${e.title}" (score: ${e.similarityScore.toFixed(2)})`).join(", ")
                );
            }
        } catch (error) {
            console.error("Error matching events:", error);
        }
    } else {
        console.log("⏳ Not enough information for recommendations yet. Need 5+ interests with 1+ high specificity, or explicit request.");
        console.log("�� Current profile:",
            `${userInterests.length} interests, ${userInterests.filter(i => i.specificity >= 0.7).length} high specificity`
        );
        if (userInterests.length > 0) {
            console.log("🎯 User interests:",
                userInterests.map(i =>
                    `"${i.keyword}" (conf: ${i.confidence}, spec: ${i.specificity})`
                ).join(", ")
            );
        }
    }

    // Build acknowledgment message if new high-confidence interests were found
    let acknowledgment = '';
    if (newHighConfidenceInterests.length > 0) {
        const interestList = newHighConfidenceInterests.map(i => `"${i.keyword}"`).join(', ');
        acknowledgment = `I'm learning that you enjoy ${interestList}. I'll remember that!`;
        console.log("💬 Acknowledgment:", acknowledgment);
    }

    // Get the AI response using Vercel AI SDK
    try {
        const result = await streamText({
            model: openai("gpt-4o-mini"),
            messages: [
                ...messages,
                ...(acknowledgment ? [{ role: "assistant", content: acknowledgment }] : []),
                {
                    role: "system",
                    content: `You're a friendly event recommendation assistant who helps people discover fun activities in their area. You have access to a curated list of local events and want to help users find things they'll love.

Important: Only recommend events from the "Available Events" list below. Don't make up or invent events that aren't in this list. If no events are available, just let the user know and ask them to tell you more about what they enjoy.

When you have good event matches, include them in your response like this:
<events>
[{"id": "event_id", "title": "Event Title", "description": "Description", "categories": ["category1"], "attendeesCount": 5, "interestedCount": 3, "location": {"neighborhood": "Area"}}]
</events>

Be conversational and enthusiastic! Ask follow-up questions if needed to narrow down the best matches. Focus on what makes each event special and why the user might enjoy it.

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

                    // Record event recommendations if any were made
                    if (matchedEvents.length > 0) {
                        for (const event of matchedEvents) {
                            await eventService.recordRecommendation(
                                session.user.id,
                                event.id,
                                messages[messages.length - 1].content
                            );
                        }
                        console.log("✅ Event recommendations recorded");
                    }
                } catch (error) {
                    console.error("Error saving AI message:", error);
                }
            },
        });

        // Return the streaming response immediately
        const response = result.toDataStreamResponse();

        // Add headers to prevent buffering
        response.headers.set('Cache-Control', 'no-cache, no-transform');
        response.headers.set('Connection', 'keep-alive');
        response.headers.set('X-Accel-Buffering', 'no');

        return response;
    } catch (error) {
        console.error("Error calling OpenAI:", error);
        return new Response("Error calling AI service", { status: 500 });
    }
}

// GET endpoint to fetch user's message history
export async function GET(req: Request) {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user?.id) {
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