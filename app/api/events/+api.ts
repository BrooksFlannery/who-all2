import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { event } from "@/lib/db/schema";
import { eventsResponseSchema } from "@/lib/schemas";
import { validateData } from "@/lib/validation";

/**
 * GET endpoint for retrieving all available events
 * 
 * This endpoint provides a list of all events in the system, ordered by creation date.
 * It's used by the frontend to display events in browse mode or for general event discovery.
 * 
 * The endpoint requires authentication to ensure only logged-in users can access events.
 * Events are returned in chronological order (newest first) to show the most recent additions.
 * 
 * @param req - HTTP request (no body needed)
 * @returns JSON response containing array of event objects, or error response
 */
export async function GET(req: Request) {
    // Step 1: Authenticate the user
    // This ensures only logged-in users can access event data
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user?.id) {
        return new Response("Unauthorized", { status: 401 });
    }

    // Step 2: Verify database availability
    // Early exit if database connection is not available
    if (!db) {
        return new Response("Database not available", { status: 500 });
    }

    try {
        // Step 3: Fetch all events from the database
        // Events are ordered by creation date (newest first) for better user experience
        const events = await db
            .select()
            .from(event)
            .orderBy(event.createdAt);

        // Step 4: Transform and validate the response
        const transformedEvents = events.map(evt => ({
            id: evt.id,
            title: evt.title,
            date: evt.date.toISOString(),
            location: evt.location,
            description: evt.description,
            categories: evt.categories,
            hostId: evt.hostId,
            createdAt: evt.createdAt.toISOString(),
            updatedAt: evt.updatedAt.toISOString(),
            attendeesCount: evt.attendeesCount,
            interestedCount: evt.interestedCount,
        }));

        const responseData = { events: transformedEvents };
        const validation = validateData(eventsResponseSchema, responseData);

        if (!validation.success) {
            console.error('Response validation failed:', validation.errors);
            return new Response("Internal server error", { status: 500 });
        }

        // Step 5: Return the events as JSON
        // The frontend can use this data to display event listings
        return Response.json(validation.data);
    } catch (error) {
        // Step 6: Handle database errors gracefully
        // Return a generic error message rather than exposing internal details
        console.error('Error fetching events:', error);
        return new Response("Error fetching events", { status: 500 });
    }
} 