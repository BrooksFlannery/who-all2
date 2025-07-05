import { auth } from "@/lib/auth";
import { updateEventParticipation } from "@/lib/db/event-participation";
import { eventParticipationRequestSchema } from "@/lib/schemas";
import { broadcastParticipationUpdate } from "@/lib/socket-broadcast";
import { validateData } from "@/lib/validation";

/**
 * POST endpoint for joining or leaving an event
 * 
 * This endpoint allows users to join an event as "attending" or "interested",
 * or to leave an event by setting status to null.
 * 
 * @param req - HTTP request with body containing participation status
 * @returns JSON response with success status and updated counts
 */
export async function POST(req: Request) {
    console.log("=== Event Participation API Debug ===");

    // Extract event ID from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const eventId = pathParts[pathParts.length - 2]; // -2 because the last part is "participate"

    console.log("Event ID:", eventId);

    // Step 1: Authenticate the user
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session || !session.user?.id) {
        console.log("No valid session found, returning 401");
        return new Response("Unauthorized", { status: 401 });
    }

    console.log("User authenticated:", session.user.id);

    // Step 2: Parse and validate the request body
    let body;
    try {
        body = await req.json();
    } catch (error) {
        console.error('Error parsing request body:', error);
        return new Response("Invalid request body", { status: 400 });
    }

    const validation = validateData(eventParticipationRequestSchema, body);
    if (!validation.success) {
        console.error('Request validation failed:', validation.errors);
        return new Response("Invalid request data", { status: 400 });
    }

    const { status } = validation.data;
    console.log("Participation status:", status);

    // Step 3: Update event participation
    try {
        const result = await updateEventParticipation(
            eventId,
            session.user.id,
            status
        );

        // Step 4: Broadcast participation update via Socket.IO
        if (result.success) {
            await broadcastParticipationUpdate(
                eventId,
                session.user.id,
                status,
                {
                    id: session.user.id,
                    name: session.user.name || 'Anonymous',
                    image: session.user.image ?? undefined
                }
            );
        }

        // Step 5: Return success response with updated counts
        return Response.json({
            success: result.success,
            newCounts: result.newCounts
        });
    } catch (error) {
        console.error('Error updating event participation:', error);
        return new Response("Error updating participation", { status: 500 });
    }
} 