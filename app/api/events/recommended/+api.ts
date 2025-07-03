import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { event, user } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function GET(req: Request) {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user?.id) {
        return new Response("Unauthorized", { status: 401 });
    }

    // Verify database availability
    if (!db) {
        return new Response("Database not available", { status: 500 });
    }

    try {
        // Get user's cached recommended event IDs
        const userResult = await db.select({ recommendedEventIds: user.recommendedEventIds })
            .from(user)
            .where(eq(user.id, session.user.id))
            .limit(1);

        const eventIds = userResult[0]?.recommendedEventIds || [];

        if (eventIds.length === 0) {
            return Response.json({ events: [] });
        }

        // Get full event objects for the cached IDs
        const events = await db.select()
            .from(event)
            .where(inArray(event.id, eventIds));

        // Transform events to match the expected format
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

        // Sort events to match the original order in eventIds
        const sortedEvents = transformedEvents.sort((a, b) => {
            const aIndex = eventIds.indexOf(a.id);
            const bIndex = eventIds.indexOf(b.id);
            return aIndex - bIndex;
        });

        return Response.json({ events: sortedEvents });
    } catch (error) {
        console.error('Error getting cached recommendations:', error);
        return new Response("Error getting recommendations", { status: 500 });
    }
} 