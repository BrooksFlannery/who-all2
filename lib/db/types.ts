// TypeScript types for our database schema
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { event, eventMessage, eventParticipation, message, user } from './schema';

// Import Zod types for runtime validation
import type {
    Event as ZodEvent,
    EventCategory as ZodEventCategory,
    Location as ZodLocation
} from '../schemas';

// Base types from our schema
export type Event = {
    id: string;
    title: string;
    date: Date;
    location: Location;
    description: string;
    embeddingDescription?: string;
    categories: EventCategory[];
    venue?: any;
    venueType?: string;
    venueRating?: number;
    venuePriceLevel?: number;
    secondaryPhotoUrl?: string; // Secondary photo from Google Places
    hostId?: string;
    embedding?: string;
    createdAt: Date;
    updatedAt: Date;
    attendeesCount: number;
    interestedCount: number;
};

export type EventInsert = InferInsertModel<typeof event>;

export type User = InferSelectModel<typeof user>;
export type Message = InferSelectModel<typeof message>;
export type MessageInsert = InferInsertModel<typeof message>;

// New types for event participation and messages
export type EventParticipation = InferSelectModel<typeof eventParticipation>;
export type EventParticipationInsert = InferInsertModel<typeof eventParticipation>;
export type EventMessage = InferSelectModel<typeof eventMessage>;
export type EventMessageInsert = InferInsertModel<typeof eventMessage>;

// Custom types for better type safety
export type Location = {
    lat: number;
    lng: number;
    neighborhood?: string;
    placeId?: string;        // Google Places ID
    venueName?: string;      // Venue name for display
    photoReference?: string; // Google Places photo reference
};

export type UserPreferences = {
    distance_radius_km: number;
    preferred_categories: string[];
};

export type EventCategory =
    | "fitness"
    | "social"
    | "creative"
    | "technology"
    | "education"
    | "food"
    | "music"
    | "outdoors"
    | "business"
    | "other";



// Helper types for API responses
export type EventWithInteractions = Event & {
    host?: User;
};

// Zod-compatible types for runtime validation
export type ZodValidatedEvent = ZodEvent;
export type ZodValidatedEventCategory = ZodEventCategory;
export type ZodValidatedLocation = ZodLocation;