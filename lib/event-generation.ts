import { generateEmbeddingDescription } from './embeddings';
import { findBestVenue, VenueCandidate } from './google-places';
import { PseudoEvent } from './pseudo-events';

// Types for event generation
export interface Event {
    title: string;
    description: string;
    embeddingDescription?: string; // Add embedding description field
    categories: string[];
    date: Date;
    location: {
        lat: number;
        lng: number;
        neighborhood?: string;
    };
    venue?: {
        placeId: string;
        name: string;
        types: string[];
        formattedAddress?: string;    // ✅ ADD - Critical for directions
        googleMapsUri?: string;       // ✅ ADD - Easy navigation
        primaryType?: string;         // ✅ ADD - Better categorization
        primaryTypeDisplayName?: string; // ✅ ADD - Human-readable type
    };
    venueType?: string;
    venueRating?: number;
    venuePriceLevel?: number;
    hostId?: string | null;
    embedding?: string | null;
    attendeesCount: number;
    interestedCount: number;
}

/**
 * Generate a random time for an event (MVP implementation)
 * In the future, this should consider venue availability
 */
function generateRandomTime(): Date {
    const now = new Date();
    const futureDate = new Date(now.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000); // Random time within next 7 days

    // Set to a reasonable hour (between 10 AM and 8 PM)
    const hour = 10 + Math.floor(Math.random() * 10);
    futureDate.setHours(hour, 0, 0, 0);

    return futureDate;
}

/**
 * Extract neighborhood from venue display name
 * This is a simple implementation - could be enhanced with geocoding
 */
function extractNeighborhood(displayName: string): string | undefined {
    // Simple extraction - look for common neighborhood patterns
    const name = displayName.toLowerCase();

    if (name.includes('times square') || name.includes('midtown')) return 'Midtown';
    if (name.includes('chelsea')) return 'Chelsea';
    if (name.includes('west village')) return 'West Village';
    if (name.includes('east village')) return 'East Village';
    if (name.includes('soho')) return 'SoHo';
    if (name.includes('lower east side')) return 'Lower East Side';
    if (name.includes('upper west side')) return 'Upper West Side';
    if (name.includes('upper east side')) return 'Upper East Side';
    if (name.includes('brooklyn')) return 'Brooklyn';
    if (name.includes('queens')) return 'Queens';

    return undefined;
}

/**
 * Convert a venue candidate to venue data for the event
 */
function venueToEventVenue(venue: VenueCandidate) {
    return {
        placeId: venue.id,
        name: venue.displayName.text,
        types: venue.types,
        formattedAddress: venue.formattedAddress,
        googleMapsUri: venue.googleMapsUri,
        primaryType: venue.primaryType,
        primaryTypeDisplayName: venue.primaryTypeDisplayName
    };
}

/**
 * Generate a real event from a pseudo-event with venue data
 */
export async function generateRealEvent(pseudoEvent: PseudoEvent, apiKey: string): Promise<Event | null> {
    // Step 1: Find best venue
    const venue = await findBestVenue({
        pseudoEvent,
        apiKey,
        maxResults: 20,
        maxDetailFetches: 10,
        scoreThreshold: 0.5
    });

    if (!venue) {
        console.warn(`No suitable venue found for pseudo-event: ${pseudoEvent.title}`);
        return null;
    }

    // Step 2: Generate random time (MVP - timing logic to be refined later)
    const eventTime = generateRandomTime();

    // Step 3: Generate embedding description
    const embeddingDescription = await generateEmbeddingDescription(pseudoEvent.description);

    // Step 4: Create real event
    return {
        title: pseudoEvent.title,
        description: pseudoEvent.description,
        embeddingDescription: embeddingDescription,
        categories: pseudoEvent.categories,
        date: eventTime,
        location: {
            lat: venue.location.latitude,
            lng: venue.location.longitude,
            neighborhood: extractNeighborhood(venue.displayName.text)
        },
        venue: venueToEventVenue(venue),
        venueType: venue.types[0],
        venueRating: venue.rating,
        venuePriceLevel: venue.priceLevel ? parseInt(venue.priceLevel.toString().replace('PRICE_LEVEL_', '')) : undefined,
        hostId: null, // System-generated
        embedding: null, // Generated after creation
        attendeesCount: 0,
        interestedCount: 0
    };
}

/**
 * Generate multiple real events from pseudo-events
 */
export async function generateRealEvents(pseudoEvents: PseudoEvent[], apiKey: string): Promise<Event[]> {
    const events: Event[] = [];
    const errors: string[] = [];

    for (const pseudoEvent of pseudoEvents) {
        try {
            const event = await generateRealEvent(pseudoEvent, apiKey);
            if (event) {
                events.push(event);
            }
        } catch (error: any) {
            const errorMsg = `Failed to generate event for "${pseudoEvent.title}": ${error.message}`;
            console.error(errorMsg);
            errors.push(errorMsg);
        }
    }

    console.log(`Generated ${events.length} events from ${pseudoEvents.length} pseudo-events`);
    if (errors.length > 0) {
        console.warn(`Encountered ${errors.length} errors during event generation`);
    }

    return events;
} 