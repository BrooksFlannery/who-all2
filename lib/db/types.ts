// TypeScript types for our database schema
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { event, eventInteraction, user, userInterest, userProfile } from './schema';

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
export type UserInterest = InferSelectModel<typeof userInterest>;
export type UserInterestInsert = InferInsertModel<typeof userInterest>;
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

// User Interests Format
export interface UserInterests {
    broad: string[];        // e.g., ["fitness", "social", "technology"]
    specific: string[];     // e.g., ["morning running", "coffee networking", "coding workshops"]
    scores: Record<string, number>; // Confidence scores 0-1
    lastUpdated: Date;
}

// Event Keywords Format
export interface EventKeywords {
    keywords: string[];     // e.g., ["running", "fitness", "morning", "cardio", "outdoor"]
    scores: Record<string, number>; // Relevance scores 0-1
}

// Interest Extraction Result
export interface InterestExtractionResult {
    newInterests: {
        broad: string[];
        specific: string[];
    };
    confidence: number;
    shouldUpdate: boolean;
}

// Event Recommendation Result
export interface EventRecommendationResult {
    id: string;
    title: string;
    description: string;
    categories: string[];
    attendeesCount: number;
    interestedCount: number;
    location: {
        neighborhood?: string;
    };
    similarityScore: number;
}

// Chat Response with Events
export interface ChatResponseWithEvents {
    text: string;
    events?: EventRecommendationResult[];
    needsClarification?: boolean;
}

// New UserInterest interface for the desired system
export interface UserInterestNew {
    keyword: string;
    confidence: number;        // 0-1, how sure we are about this interest
    specificity: number;       // 0-1, how specific this interest is
    lastUpdated: Date;
}

// Interest Extraction Result for new system
export interface InterestExtractionResultNew {
    newInterests: UserInterestNew[];
    confidence: number;
    shouldUpdate: boolean;
} 