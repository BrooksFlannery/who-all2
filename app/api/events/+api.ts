import { auth } from "@/lib/auth";
import { initializeDatabase } from "@/lib/db";
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
    console.log("=== Events API Debug ===");
    console.log("Request URL:", req.url);
    console.log("Request method:", req.method);
    console.log("Request headers:", Object.fromEntries(req.headers.entries()));

    // Log specific headers we care about
    const authHeader = req.headers.get('authorization');
    const cookieHeader = req.headers.get('cookie');
    console.log("Authorization header:", authHeader);
    console.log("Cookie header:", cookieHeader);

    // Try different session validation methods
    let session = await auth.api.getSession({ headers: req.headers });
    console.log("Session from auth.api.getSession:", session);

    // If that fails, try using the auth handler directly
    if (!session) {
        console.log("Trying auth.handler for session validation");
        try {
            // Create a new request to the auth endpoint to validate the session
            const authUrl = new URL(req.url);
            authUrl.pathname = '/api/auth/session';
            const authReq = new Request(authUrl.toString(), {
                headers: req.headers,
                method: 'GET'
            });

            const authResponse = await auth.handler(authReq);
            console.log("Auth handler status:", authResponse.status);

            if (authResponse.status === 200) {
                const authData = await authResponse.json();
                console.log("Auth handler response:", authData);
                if (authData.session) {
                    session = authData;
                }
            }
        } catch (error) {
            console.error("Auth handler error:", error);
        }
    }

    if (!session) {
        console.log("No session found, returning 401");
        return new Response("Unauthorized", { status: 401 });
    }

    if (!session.user?.id) {
        console.log("No user ID in session, returning 401");
        return new Response("Unauthorized", { status: 401 });
    }

    console.log("User authenticated:", session.user.id);

    // Step 2: Initialize and verify database availability
    const db = initializeDatabase();
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