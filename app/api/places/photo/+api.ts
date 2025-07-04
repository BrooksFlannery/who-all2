import { auth } from "@/lib/auth";
import { getPhotoUrl } from "@/lib/google-places";

/**
 * GET endpoint for fetching Google Places photos
 * 
 * This endpoint safely fetches photos from Google Places Photo API using
 * the server-side API key, avoiding exposure of the key in the frontend.
 * 
 * @param req - HTTP request with photoReference as query parameter
 * @returns Photo URL or error response
 */
export async function GET(req: Request) {
    // Step 1: Authenticate the user
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user?.id) {
        return new Response("Unauthorized", { status: 401 });
    }

    // Step 2: Extract photo reference from query parameters
    const url = new URL(req.url);
    const photoReference = url.searchParams.get('photoReference');
    const maxWidth = url.searchParams.get('maxWidth') || '800';

    if (!photoReference) {
        return new Response("Missing photoReference parameter", { status: 400 });
    }

    try {
        // Step 3: Get API key from environment
        const apiKey = process.env.GOOGLE_PLACES_API_KEY;
        if (!apiKey) {
            console.error('Google Places API key not configured');
            return new Response("Photo service not available", { status: 503 });
        }

        // Step 4: Fetch the photo URL from Google Places API
        const photoUrl = await getPhotoUrl(photoReference, apiKey, parseInt(maxWidth));

        // Step 5: Return the photo URL
        return Response.json({ photoUrl });
    } catch (error) {
        console.error('Error fetching photo URL:', error);
        return new Response("Failed to fetch photo", { status: 500 });
    }
} 