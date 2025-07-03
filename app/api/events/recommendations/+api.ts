import { auth } from "@/lib/auth";
import { getEventRecommendations } from "@/lib/embeddings";

/**
 * POST endpoint for getting event recommendations based on user interests
 * 
 * This endpoint uses Vercel AI SDK embeddings and cosine similarity to find
 * events that match the user's interest summary. It returns a sorted list
 * of events with similarity scores.
 * 
 * The endpoint requires authentication to ensure only logged-in users can
 * access personalized recommendations.
 * 
 * @param req - HTTP request (no body needed)
 * @returns JSON response containing array of recommended events with similarity scores
 */
export async function POST(req: Request) {
    // Step 1: Authenticate the user
    // This ensures only logged-in users can access personalized recommendations
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user?.id) {
        return new Response("Unauthorized", { status: 401 });
    }

    try {
        // Step 2: Get event recommendations for the user
        // This uses the existing getEventRecommendations function from embeddings.ts
        const recommendations = await getEventRecommendations(session.user.id);

        // Step 3: Return the recommendations as JSON
        // The frontend can use this data to display personalized event suggestions
        return Response.json({ recommendations });
    } catch (error) {
        // Step 4: Handle errors gracefully
        // Return a generic error message rather than exposing internal details
        console.error('Error getting event recommendations:', error);
        return new Response("Error getting recommendations", { status: 500 });
    }
} 