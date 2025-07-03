// TypeScript types for our database schema
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { event, eventInteraction, user, userProfile } from './schema';

// Base types from our schema
export type Event = {
    id: string;
    title: string;
    date: Date;
    location: Location;
    description: string;
    categories: EventCategory[];
    hostId?: string;
    createdAt: Date;
    updatedAt: Date;
    attendeesCount: number;
    interestedCount: number;
};

export type EventInsert = InferInsertModel<typeof event>;
export type UserProfile = InferSelectModel<typeof userProfile>;
export type UserProfileInsert = InferInsertModel<typeof userProfile>;
export type EventInteraction = InferSelectModel<typeof eventInteraction>;
export type EventInteractionInsert = InferInsertModel<typeof eventInteraction>;
export type User = InferSelectModel<typeof user>;

// Custom types for better type safety
export type Location = {
    lat: number;
    lng: number;
    neighborhood?: string;
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

export type InteractionStatus = "interested" | "going" | "not_interested";
export type InteractionSource = "chat" | "browse" | "external";

// Helper types for API responses
export type EventWithInteractions = Event & {
    userInteraction?: EventInteraction;
    host?: User;
};

export type UserProfileWithUser = UserProfile & {
    user: User;
};