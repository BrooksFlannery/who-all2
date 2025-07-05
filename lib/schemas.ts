import { z } from 'zod';

// Environment variable validation
export const envSchema = z.object({
    DATABASE_URL: z.string().url(),
    OPENAI_API_KEY: z.string().min(1),
    GOOGLE_PLACES_API_KEY: z.string().min(1),
});

// Chat message validation
export const chatMessageSchema = z.object({
    id: z.string().optional(),
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().min(1).max(4000),
});

export const chatRequestSchema = z.object({
    messages: z.array(chatMessageSchema).min(1),
});

// Chat response validation
export const chatResponseSchema = z.object({
    messages: z.array(z.object({
        id: z.string(),
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
        createdAt: z.string().datetime(),
        isSummarized: z.boolean(),
    })),
});

// Event validation
export const eventCategorySchema = z.enum([
    'fitness',
    'social',
    'creative',
    'technology',
    'education',
    'food',
    'music',
    'outdoors',
    'business',
    'sports',
    'other'
]);

export const locationSchema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    neighborhood: z.string().optional(),
    placeId: z.string().optional(),
    venueName: z.string().optional(),
    photoReference: z.string().optional(),
});

export const eventSchema = z.object({
    id: z.string().uuid(),
    title: z.string().min(1).max(200),
    date: z.string().datetime(),
    location: locationSchema,
    description: z.string().min(1).max(1000),
    categories: z.array(eventCategorySchema).min(1),
    hostId: z.string().nullable().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    attendeesCount: z.number().int().min(0),
    interestedCount: z.number().int().min(0),
});

export const eventsResponseSchema = z.object({
    events: z.array(eventSchema),
});

// User validation
export const userSchema = z.object({
    id: z.string(),
    name: z.string().min(1).max(100),
    email: z.string().email(),
    emailVerified: z.boolean(),
    image: z.string().url().nullable().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

// API error response
export const errorResponseSchema = z.object({
    error: z.string(),
    message: z.string(),
    statusCode: z.number().int().min(400).max(599),
});

// Summarization response validation
export const summarizationResponseSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    messageCount: z.number().int().min(0),
    summaryLength: z.number().int().min(0).optional(),
});

// Event participation validation
export const eventParticipationStatusSchema = z.enum(['attending', 'interested']);

export const eventParticipationSchema = z.object({
    id: z.string().uuid(),
    eventId: z.string().uuid(),
    userId: z.string(),
    status: eventParticipationStatusSchema,
    joinedAt: z.string().datetime(),
});

export const eventParticipationRequestSchema = z.object({
    status: eventParticipationStatusSchema.nullable(), // null means leave event
});

// Event message validation
export const eventMessageSchema = z.object({
    id: z.string().uuid(),
    eventId: z.string().uuid(),
    userId: z.string(),
    content: z.string().min(1).max(1000), // Limit message length
    userName: z.string().min(1).max(100),
    userImage: z.string().url().nullable().optional(),
    createdAt: z.string().datetime(),
});

export const eventMessageRequestSchema = z.object({
    content: z.string().min(1).max(1000),
});

export const eventMessagesResponseSchema = z.object({
    messages: z.array(eventMessageSchema),
    hasMore: z.boolean(),
});

// Type exports for TypeScript
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type Event = z.infer<typeof eventSchema>;
export type EventsResponse = z.infer<typeof eventsResponseSchema>;
export type User = z.infer<typeof userSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type EventCategory = z.infer<typeof eventCategorySchema>;
export type Location = z.infer<typeof locationSchema>;
export type EventParticipation = z.infer<typeof eventParticipationSchema>;
export type EventParticipationRequest = z.infer<typeof eventParticipationRequestSchema>;
export type EventMessage = z.infer<typeof eventMessageSchema>;
export type EventMessageRequest = z.infer<typeof eventMessageRequestSchema>;
export type EventMessagesResponse = z.infer<typeof eventMessagesResponseSchema>;
export type EventParticipationStatus = z.infer<typeof eventParticipationStatusSchema>; 