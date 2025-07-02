import { auth } from "@/lib/auth";
import { getEventRecommendations } from "@/lib/chat-analysis/recommendation-engine";
import { db } from "@/lib/db";
import { message, userInterest } from "@/lib/db/schema";
import { openai } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    console.log("=== Chat API Request ===");

    // Get the current user session
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
        console.log("❌ Unauthorized request");
        return new Response("Unauthorized", { status: 401 });
    }

    console.log(`👤 User: ${session.user.name} (${session.user.id})`);

    if (!db) {
        console.log("❌ Database not available");
        return new Response("Database not available", { status: 500 });
    }

    const { messages } = await req.json();
    console.log(`📨 Messages in conversation: ${messages.length}`);

    // Save the user's message to the database
    let savedMessageId: string | undefined;
    try {
        const [savedMessage] = await db.insert(message).values({
            userId: session.user.id,
            content: messages[messages.length - 1].content,
            role: "user"
        }).returning({ id: message.id });
        savedMessageId = savedMessage.id;
        console.log(`💾 User message saved: ${savedMessageId}`);
    } catch (error) {
        console.error("❌ Error saving user message:", error);
    }

    const result = streamText({
        model: openai("gpt-4o-mini"),
        maxSteps: 3,
        messages: [
            {
                role: "system",
                content: `You are a friendly and helpful assistant that helps users discover events and activities. 

IMPORTANT GUIDELINES:
- Be conversational, warm, and engaging in your responses
- When users share their interests, hobbies, or activities, use the extractInterests tool to learn about them
- When users ask for recommendations, suggestions, or events, use the getRecommendations tool
- Ask follow-up questions to understand their preferences better
- Keep responses natural and conversational - don't sound like a robot
- Always acknowledge when you learn new interests about them
- Dont offer specific information outside of tool calls

Your goal is to help users discover events that match their interests by having natural conversations and understanding what they enjoy.`
            },
            ...messages,
        ],
        tools: {
            extractInterests: tool({
                description: `Extract as many relevant user interests from messages when users share hobbies, activities, or preferences(max 3 interests that weren't explicitly mentioned i.e. if the say "I love Alex Honnold" do extract "climbing", "free soloing", " sports documentaries" as an interest, but not more than 3 unmentioned things, also only include unmentioned items when the mentioned item is highly specific(>=0.75)). 

EXAMPLES:
"I love rock climbing and hiking" → [{"keyword": "rock climbing", "confidence": 0.8, "specificity": 0.6}, {"keyword": "hiking", "confidence": 0.8, "specificity": 0.6}]
"I sometimes go to concerts" → [{"keyword": "concerts", "confidence": 0.5, "specificity": 0.4}]
"I'm learning to play guitar" → [{"keyword": "guitar", "confidence": 0.7, "specificity": 0.5}]
"My friend is a photographer" → [{"keyword": "photography", "confidence": 0.2, "specificity": 0.5}]
"I enjoy cooking Italian food" → [{"keyword": "cooking", "confidence": 0.7, "specificity": 0.5}, {"keyword": "Italian food", "confidence": 0.6, "specificity": 0.7}]
"I used to play basketball in college" → [{"keyword": "basketball", "confidence": 0.4, "specificity": 0.6}]
"I'm really into indie music" → [{"keyword": "indie music", "confidence": 0.8, "specificity": 0.6}]
"I've been thinking about trying yoga" → [{"keyword": "yoga", "confidence": 0.3, "specificity": 0.5}]
"I want to go clubbing" → [{"keyword": "clubbing", "confidence": 0.9, "specificity": 0.6}]
"I can't live without coffee" → [{"keyword": "coffee", "confidence": 0.8, "specificity": 0.4}]
"I hate running" → []
"I went to a Arvo Pärt concert last week" → [{"keyword": "Arvo Pärt", "confidence": 0.6, "specificity": 0.9}, {"keyword": "classical music", "confidence": 0.6, "specificity": 0.6}, {"keyword": "minimalist music", "confidence": 0.5, "specificity": 0.8}, {"keyword": "concerts", "confidence": 0.5, "specificity": 0.4}]
"I'm not really into sports" → []
"I love Guillermo del Toro movies" → [{"keyword": "Guillermo del Toro", "confidence": 0.8, "specificity": 0.9}, {"keyword": "fantasy films", "confidence": 0.5, "specificity": 0.6}, {"keyword": "foreign films", "confidence": 0.4, "specificity": 0.6}, {"keyword": "movies", "confidence": 0.8, "specificity": 0.4}]
"I'm a huge fan of David Bowie" → [{"keyword": "David Bowie", "confidence": 0.8, "specificity": 0.9}, {"keyword": "rock music", "confidence": 0.7, "specificity": 0.5}, {"keyword": "glam rock", "confidence": 0.6, "specificity": 0.8}, {"keyword": "experimental music", "confidence": 0.5, "specificity": 0.7}]
"I am reading a Murakami novel" → [{"keyword": "Murakami", "confidence": 0.6, "specificity": 0.9}, {"keyword": "Japanese literature", "confidence": 0.4, "specificity": 0.7}, {"keyword": "magical realism", "confidence": 0.3, "specificity": 0.8}, {"keyword": "reading", "confidence": 0.8, "specificity": 0.4}]
"I'm into craft beer and IPAs" → [{"keyword": "craft beer", "confidence": 0.6, "specificity": 0.7}, {"keyword": "beer tasting", "confidence": 0.5, "specificity": 0.6}, {"keyword": "brewing", "confidence": 0.4, "specificity": 0.7}]

Focus on activities, hobbies, skills, and preferences that could relate to events. Extract semantic interests that could match events, not just literal keywords.`,
                parameters: z.object({
                    interests: z.array(z.object({
                        keyword: z.string().describe('The interest keyword'),
                        confidence: z.number().min(0).max(1).describe('Confidence score 0-1'),
                        specificity: z.number().min(0).max(1).describe('Specificity score 0-1')
                    })).describe('Array of detected interests'),
                }),
                execute: async ({ interests }) => {
                    console.log("🔍 Storing interests directly...");
                    if (!savedMessageId || !db) {
                        return "I couldn't process that message properly. Could you try again?";
                    }

                    try {
                        // Store interests directly in database
                        for (const interest of interests) {
                            await db.insert(userInterest).values({
                                userId: session.user.id,
                                keyword: interest.keyword,
                                confidenceScore: interest.confidence.toString(),
                                specificityScore: interest.specificity.toString(),
                                sourceMessageId: savedMessageId
                            });
                        }

                        console.log(`💾 Stored ${interests.length} interests directly`);

                        // Log detailed interest information
                        console.log("📊 Interest Details:");
                        interests.forEach((interest, index) => {
                            console.log(`  ${index + 1}. "${interest.keyword}" - Confidence: ${(interest.confidence * 100).toFixed(1)}%, Specificity: ${(interest.specificity * 100).toFixed(1)}%`);
                        });

                        // Return conversational summary
                        const interestList = interests.map(i => i.keyword).join(', ');
                        return `I learned that you're interested in: ${interestList}. I'll keep this in mind for future recommendations!`;
                    } catch (error) {
                        console.error("❌ Error storing interests:", error);
                        return "I detected some interests but had trouble saving them. I'll still try to help you find great events!";
                    }
                }
            }),
            getRecommendations: tool({
                description: "Get personalized event recommendations when users EXPLICITLY ask for suggestions, events, or activities. Call this to provide relevant event suggestions.",
                parameters: z.object({
                    userMessage: z.string().describe('The user message requesting recommendations'),
                }),
                execute: async ({ userMessage }) => {
                    console.log("🎪 AI calling getRecommendations tool...");
                    try {
                        const result = await getEventRecommendations(session.user.id, 3);
                        console.log("✅ Recommendations retrieved via tool");
                        return result;
                    } catch (error) {
                        console.error("❌ Recommendation tool failed:", error);
                        return "I'm having trouble finding events right now, but I'm working on it!";
                    }
                }
            })
        },
        onFinish: async (completion) => {
            // Save the AI's response to the database
            if (!db) {
                console.error("❌ Database not available for AI message save");
                return;
            }
            try {
                await db.insert(message).values({
                    userId: session.user.id,
                    content: completion.text,
                    role: "assistant"
                });
                console.log("💾 AI response saved");
            } catch (error) {
                console.error("❌ Error saving AI message:", error);
            }
        },
    });

    console.log("📡 Returning streaming response");
    return result.toDataStreamResponse();
}

// GET endpoint to fetch user's message history
export async function GET(req: Request) {
    console.log("=== Chat History Request ===");

    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
        console.log("❌ Unauthorized history request");
        return new Response("Unauthorized", { status: 401 });
    }

    console.log(`👤 Fetching history for: ${session.user.name}`);

    if (!db) {
        return new Response("Database not available", { status: 500 });
    }

    // Fetch all messages for this user, ordered by creation time (oldest first)
    const messages = await db
        .select()
        .from(message)
        .where(eq(message.userId, session.user.id))
        .orderBy(message.createdAt);

    console.log(`📚 Retrieved ${messages.length} messages from history`);
    return Response.json({ messages });
} 