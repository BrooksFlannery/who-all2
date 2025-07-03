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

/**
 * POST endpoint for handling chat conversations with AI
 * 
 * This endpoint processes user messages and provides AI responses with two main capabilities:
 * 1. Interest Extraction: Automatically detects and stores user interests from conversations
 * 2. Event Recommendations: Provides personalized event suggestions when requested
 * 
 * The AI uses a sophisticated system prompt that enforces specific rules for when to use tools,
 * ensuring consistent and appropriate behavior.
 * 
 * @param req - HTTP request containing the conversation messages
 * @returns Streaming response with AI-generated text and optional structured event data
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
    // This creates a conversation history and provides context for interest extraction
    let savedMessageId: string | undefined;
    try {
        const [savedMessage] = await db.insert(message).values({
            userId: session.user.id,
            content: messages[messages.length - 1].content, // Save the most recent message
            role: "user"
        }).returning({ id: message.id });
        savedMessageId = savedMessage.id;
    } catch (error) {
        // Continue processing even if message save fails
    }

    // Step 5: Initialize tracking for events returned by tools
    // This allows us to include structured event data in the response
    let eventsFromTools: any[] = [];

    // Step 6: Create the AI conversation stream with tools
    const result = streamText({
        model: openai("gpt-4o-mini"),
        maxSteps: 3, // Limit tool usage to prevent infinite loops
        messages: [
            {
                role: "system",
                content: `You are a friendly, concise assistant that helps users discover local events.

TOOL-USAGE RULES
1. extractInterests
    • Call this ANY time the user states new hobbies, activities, likes, or preferences – even if they do **not** ask for events.
    • After calling, respond briefly (one short sentence) acknowledging you learned their interests. Do **not** offer events.

2. getRecommendations
    • Call this ONLY when the user **explicitly** asks for events or recommendations – e.g. they use verbs like "recommend", "suggest", "find events", "what can I do", etc. Merely listing interests does **not** count.
    • When you do call it and events are returned, reply with ONE short lead-in sentence such as "Here are some events you might like:" and DO NOT list or describe the events – the UI will show them.

GENERAL RULES
• Never invent events. Only reference events provided by getRecommendations.
• Keep your replies warm and natural but concise (1-2 sentences max).
• Do not ask follow-up questions about whether they want recommendations – only act when they ask.
• If no events are found, say so honestly in one sentence.
• Always obey these rules before anything else.`
            },
            ...messages, // Include the conversation history
        ],
        tools: {
            /**
             * Tool for extracting user interests from natural language
             * 
             * This tool uses AI to identify hobbies, activities, and preferences mentioned
             * by users in their messages. It's called automatically whenever the user
             * shares information about their likes and interests.
             * 
             * The tool includes extensive examples to ensure accurate extraction and
             * provides confidence and specificity scores for each detected interest.
             */
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
                    // Step 6a: Validate that we have the necessary context
                    if (!savedMessageId || !db) {
                        return "I couldn't process that message properly. Could you try again?";
                    }

                    try {
                        // Step 6b: Store each detected interest in the database
                        // This builds the user's interest profile for future recommendations
                        for (const interest of interests) {
                            await db.insert(userInterest).values({
                                userId: session.user.id,
                                keyword: interest.keyword,
                                confidenceScore: interest.confidence.toString(),
                                specificityScore: interest.specificity.toString(),
                                sourceMessageId: savedMessageId // Link to the message that generated this interest
                            });
                        }

                        // Step 6c: Return a conversational acknowledgment
                        // This lets the user know their interests were understood
                        const interestList = interests.map(i => i.keyword).join(', ');
                        return `I learned that you're interested in: ${interestList}. I'll keep this in mind for future recommendations!`;
                    } catch (error) {
                        // Graceful error handling - continue even if interest storage fails
                        return "I detected some interests but had trouble saving them. I'll still try to help you find great events!";
                    }
                }
            }),
            /**
             * Tool for providing personalized event recommendations
             * 
             * This tool is called only when users explicitly request events or recommendations.
             * It uses the user's stored interests to find the most relevant events using
             * semantic similarity and sophisticated scoring algorithms.
             */
            getRecommendations: tool({
                description: "Get personalized event recommendations when users EXPLICITLY ask for suggestions, events, or activities. Call this to provide relevant event suggestions.",
                parameters: z.object({
                    userMessage: z.string().describe('The user message requesting recommendations'),
                }),
                execute: async ({ userMessage }) => {
                    try {
                        // Step 6d: Get personalized recommendations using the recommendation engine
                        const result = await getEventRecommendations(session.user.id, 3);

                        // Step 6e: Store events for inclusion in the response
                        // This allows the frontend to display event cards
                        if (result.success && result.events.length > 0) {
                            eventsFromTools = result.events;
                        }

                        return result.message;
                    } catch (error) {
                        return "I'm having trouble finding events right now, but I'm working on it!";
                    }
                }
            })
        },
        /**
         * Callback executed when the AI finishes generating its response
         * 
         * This function handles saving the AI's response to the database and
         * structuring the response to include event data when available.
         */
        onFinish: async (completion) => {
            if (!db) {
                return;
            }

            try {
                let messageContent: string;

                // Step 7: Structure the response based on whether events were found
                if (eventsFromTools.length > 0) {
                    // Include structured event data for the frontend to display
                    const structuredResponse = {
                        type: "event_cards",
                        events: eventsFromTools,
                        message: completion.text
                    };
                    messageContent = JSON.stringify(structuredResponse);
                } else {
                    // Regular text response when no events are available
                    messageContent = completion.text;
                }

                // Step 8: Save the AI's response to the database
                await db.insert(message).values({
                    userId: session.user.id,
                    content: messageContent,
                    role: "assistant"
                });
            } catch (error) {
                // Continue even if message save fails
            }
        },
    });

    // Step 9: Return the streaming response
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