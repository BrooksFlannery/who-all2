// TypeScript types for our database schema
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { event, eventInteraction, eventKeyword, user, userEventRecommendation, userInterest, userProfile } from './schema';

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

// Chat Analysis Types
export type UserInterest = InferSelectModel<typeof userInterest>;
export type UserInterestInsert = InferInsertModel<typeof userInterest>;
export type EventKeyword = InferSelectModel<typeof eventKeyword>;
export type EventKeywordInsert = InferInsertModel<typeof eventKeyword>;
export type UserEventRecommendation = InferSelectModel<typeof userEventRecommendation>;
export type UserEventRecommendationInsert = InferInsertModel<typeof userEventRecommendation>;

// Interest extraction result type
export interface InterestExtractionResult {
    interests: Array<{
        keyword: string;
        confidence_score: number; // 0-1
        specificity_score: number; // 0-1
    }>;
    has_interests: boolean;
}

// Recommendation request and result types
export interface RecommendationRequest {
    userId: string;
    limit?: number; // default 3
    exclude_shown?: boolean; // default true
}

export interface RecommendationResult {
    events: Array<{
        event_id: string;
        title: string;
        description: string;
        score: number;
        match_reasons: string[];
    }>;
    total_available: number;
    message: string;
} 