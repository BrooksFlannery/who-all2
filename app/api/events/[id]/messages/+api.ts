import { auth } from "@/lib/auth";
import { getEventMessages, saveEventMessage } from "@/lib/db/event-messages";
import { getUserParticipationStatus } from "@/lib/db/event-participation";
import { eventMessageRequestSchema, eventMessagesResponseSchema } from "@/lib/schemas";
import { broadcastNewMessage } from "@/lib/socket-broadcast";
import { validateData } from "@/lib/validation";

/**
 * GET endpoint for retrieving event messages with pagination
 * 
 * This endpoint provides paginated access to event messages, allowing the frontend
 * to load messages in chunks for better performance.
 * 
 * @param req - HTTP request with query parameters for pagination
 * @returns JSON response containing messages and pagination info
 */
export async function GET(req: Request) {
    console.log("=== Event Messages GET API Debug ===");

    // Extract event ID from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const eventId = pathParts[pathParts.length - 2]; // -2 because the last part is "messages"

    console.log("Event ID:", eventId);

    // Step 1: Authenticate the user
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session || !session.user?.id) {
        console.log("No valid session found, returning 401");
        return new Response("Unauthorized", { status: 401 });
    }

    console.log("User authenticated:", session.user.id);

    // Step 2: Parse query parameters
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const beforeParam = url.searchParams.get('before');
    const before = beforeParam ? new Date(beforeParam) : undefined;

    console.log("Query params - limit:", limit, "before:", before);

    // Step 3: Get messages with pagination
    try {
        const result = await getEventMessages(eventId, limit, before);

        // Step 4: Transform messages for response
        const transformedMessages = result.messages.map(msg => ({
            id: msg.id,
            eventId: msg.eventId,
            userId: msg.userId,
            content: msg.content,
            userName: msg.userName,
            userImage: msg.userImage,
            createdAt: msg.createdAt.toISOString()
        }));

        const responseData = {
            messages: transformedMessages,
            hasMore: result.hasMore
        };

        // Step 5: Validate and return response
        const validation = validateData(eventMessagesResponseSchema, responseData);
        if (!validation.success) {
            console.error('Response validation failed:', validation.errors);
            return new Response("Internal server error", { status: 500 });
        }

        return Response.json(validation.data);
    } catch (error) {
        console.error('Error fetching event messages:', error);
        return new Response("Error fetching messages", { status: 500 });
    }
}

/**
 * POST endpoint for sending a new message to an event
 * 
 * This endpoint allows users to send messages to events they are participating in.
 * Only users who are attending or interested in the event can send messages.
 * 
 * @param req - HTTP request with body containing message content
 * @returns JSON response containing the saved message
 */
export async function POST(req: Request) {
    console.log("=== Event Messages POST API Debug ===");

    // Extract event ID from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const eventId = pathParts[pathParts.length - 2]; // -2 because the last part is "messages"

    console.log("Event ID:", eventId);

    // Step 1: Authenticate the user
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session || !session.user?.id) {
        console.log("No valid session found, returning 401");
        return new Response("Unauthorized", { status: 401 });
    }

    console.log("User authenticated:", session.user.id);

    // Step 2: Check if user is participating in the event
    const userParticipation = await getUserParticipationStatus(eventId, session.user.id);
    if (!userParticipation) {
        console.log("User not participating in event, returning 403");
        return new Response("Must join event to send messages", { status: 403 });
    }

    // Step 3: Parse and validate the request body
    let body;
    try {
        body = await req.json();
    } catch (error) {
        console.error('Error parsing request body:', error);
        return new Response("Invalid request body", { status: 400 });
    }

    const validation = validateData(eventMessageRequestSchema, body);
    if (!validation.success) {
        console.error('Request validation failed:', validation.errors);
        return new Response("Invalid request data", { status: 400 });
    }

    const { content } = validation.data;
    console.log("Message content length:", content.length);

    // Step 4: Save the message
    try {
        const message = await saveEventMessage(
            eventId,
            session.user.id,
            content,
            session.user.name || 'Anonymous',
            session.user.image ?? undefined
        );

        // Step 5: Transform the saved message for response
        const responseData = {
            id: message.id,
            eventId: message.eventId,
            userId: message.userId,
            content: message.content,
            userName: message.userName,
            userImage: message.userImage || undefined,
            createdAt: message.createdAt.toISOString()
        };

        // Step 6: Broadcast message via Socket.IO
        await broadcastNewMessage(responseData);

        // Step 7: Return the saved message
        return Response.json(responseData);
    } catch (error) {
        console.error('Error saving event message:', error);
        return new Response("Error saving message", { status: 500 });
    }
} 