import { auth } from "@/lib/auth";
import { getEventWithParticipation } from "@/lib/db/events";

/**
 * GET endpoint for retrieving a specific event with participation information
 * 
 * This endpoint provides detailed information about a specific event, including
 * the current user's participation status and lists of attendees and interested users.
 * 
 * @param req - HTTP request
 * @param params - Route parameters containing the event ID
 * @returns JSON response containing event details and participation information
 */
export async function GET(req: Request) {
    console.log("=== Event Detail API Debug ===");

    // Extract event ID from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const eventId = pathParts[pathParts.length - 1];

    console.log("Event ID:", eventId);

    // Step 1: Authenticate the user
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session || !session.user?.id) {
        console.log("No valid session found, returning 401");
        return new Response("Unauthorized", { status: 401 });
    }

    console.log("User authenticated:", session.user.id);

    // Step 2: Get event with participation information
    try {
        const eventData = await getEventWithParticipation(eventId, session.user.id);

        if (!eventData) {
            return new Response("Event not found", { status: 404 });
        }

        // Step 3: Transform the response to match the expected format
        const responseData = {
            event: {
                id: eventId,
                title: eventData.event.title,
                date: eventData.event.date.toISOString(),
                location: eventData.event.location,
                description: eventData.event.description,
                categories: eventData.event.categories,
                venue: eventData.event.venue,
                venueType: eventData.event.venueType,
                venueRating: eventData.event.venueRating,
                venuePriceLevel: eventData.event.venuePriceLevel,
                secondaryPhotoUrl: eventData.event.secondaryPhotoUrl,
                hostId: eventData.event.hostId,
                createdAt: eventData.event.date.toISOString(), // Using date as createdAt for now
                updatedAt: eventData.event.date.toISOString(), // Using date as updatedAt for now
                attendeesCount: eventData.event.attendeesCount,
                interestedCount: eventData.event.interestedCount,
            },
            userParticipation: eventData.userParticipation,
            attendees: eventData.attendees,
            interested: eventData.interested
        };

        // Step 4: Return the event data as JSON
        return Response.json(responseData);
    } catch (error) {
        console.error('Error fetching event details:', error);
        return new Response("Error fetching event details", { status: 500 });
    }
} 