import { boolean, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').$defaultFn(() => false).notNull(),
    image: text('image'),
    createdAt: timestamp('created_at').$defaultFn(() => /* @__PURE__ */ new Date()).notNull(),
    updatedAt: timestamp('updated_at').$defaultFn(() => /* @__PURE__ */ new Date()).notNull()
});

export const session = pgTable("session", {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' })
});

export const account = pgTable("account", {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull()
});

export const verification = pgTable("verification", {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').$defaultFn(() => /* @__PURE__ */ new Date()),
    updatedAt: timestamp('updated_at').$defaultFn(() => /* @__PURE__ */ new Date())
});

export const roleEnum = pgEnum("role", ["user", "assistant", "tool", "system"]);

export const message = pgTable("message", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("userId").notNull().references(() => user.id),
    content: text("content").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    role: roleEnum("role").notNull(),
});

// New tables for events and social features

// Event categories enum
export const eventCategoryEnum = pgEnum("event_category", [
    "fitness",
    "social",
    "creative",
    "technology",
    "education",
    "food",
    "music",
    "outdoors",
    "business",
    "other"
]);

// Events table
export const event = pgTable("event", {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    date: timestamp("date", { withTimezone: true }).notNull(),
    location: jsonb("location").notNull(), // { lat: number, lng: number, neighborhood?: string }
    description: text("description").notNull(),
    categories: text("categories").array().notNull(), // Array of categories instead of single category
    hostId: text("host_id").references(() => user.id), // Optional - for user-hosted events
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    // Derived/cached fields
    attendeesCount: integer("attendees_count").default(0).notNull(),
    interestedCount: integer("interested_count").default(0).notNull(),
    // Chat analysis fields
    keywords: text("keywords").array().default([]),
    keywordScores: jsonb("keyword_scores").default({}),
});

// User profiles table for preferences and interests
export const userProfile = pgTable("user_profile", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }).unique(),
    name: text("name").notNull(),
    location: jsonb("location").notNull(), // { lat: number, lng: number }
    interests: text("interests").array(), // Array of interest tags
    preferences: jsonb("preferences").notNull(), // { distance_radius_km: number, preferred_categories: string[] }
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// User interests table for chat analysis
export const userInterest = pgTable("user_interests", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
    keyword: text("keyword").notNull(),
    confidence: text("confidence").notNull(), // decimal(3,2) in DB, stored as text in Drizzle
    specificity: text("specificity").notNull(), // decimal(3,2) in DB, stored as text in Drizzle
    lastUpdated: timestamp("last_updated", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Event interaction status enum
export const interactionStatusEnum = pgEnum("interaction_status", [
    "interested",
    "going",
    "not_interested"
]);

// Event interaction source enum
export const interactionSourceEnum = pgEnum("interaction_source", [
    "chat",
    "browse",
    "external"
]);

// Event interactions table
export const eventInteraction = pgTable("event_interaction", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
    eventId: uuid("event_id").notNull().references(() => event.id, { onDelete: 'cascade' }),
    status: interactionStatusEnum("status").notNull(),
    source: interactionSourceEnum("source").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    // Composite unique constraint to prevent duplicate interactions
    // This will be handled in the application layer or with a unique index
});

// Event recommendations table
export const eventRecommendation = pgTable("event_recommendation", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
    eventId: uuid("event_id").notNull().references(() => event.id, { onDelete: 'cascade' }),
    recommendedAt: timestamp("recommended_at", { withTimezone: true }).defaultNow().notNull(),
    context: text("context"),
});

export const schema = {
    user,
    session,
    account,
    verification,
    message,
    event,
    userProfile,
    userInterest,
    eventInteraction,
    eventRecommendation
}