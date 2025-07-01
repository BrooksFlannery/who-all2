import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { event } from "@/lib/db/schema";

// GET endpoint to fetch events
export async function GET(req: Request) {
    console.log("=== GET /api/events - Request received ===");

    // Get the current user session
    const session = await auth.api.getSession({ headers: req.headers });
    console.log("Session result:", session);

    if (!session?.user?.id) {
        console.log("Request unauthorized - no session");
        return new Response("Unauthorized", { status: 401 });
    }

    if (!db) {
        return new Response("Database not available", { status: 500 });
    }

    try {
        // Fetch all events, ordered by date (upcoming first)
        const events = await db
            .select()
            .from(event)
            .orderBy(event.date);

        console.log(`Fetched ${events.length} events from database`);

        return Response.json({ events });
    } catch (error) {
        console.error("Error fetching events:", error);
        return new Response("Error fetching events", { status: 500 });
    }
} 