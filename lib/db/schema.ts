import { boolean, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').$defaultFn(() => false).notNull(),
    image: text('image'),
    userInterestSummary: text('user_interest_summary').default('').notNull(),
    interestEmbedding: text('interest_embedding'), // VECTOR(1536) - will be cast in SQL
    recommendedEventIds: text('recommended_event_ids').array().default([]).notNull(),
    location: jsonb("location"), // { latitude: number, longitude: number } - nullable
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
    isSummarized: boolean('is_summarized').default(false).notNull(),
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

    // New Google Places fields
    venue: jsonb("venue"),                    // Google Places venue data
    venueType: text("venue_type"),            // Google type (gym, restaurant, park)
    venueRating: integer("venue_rating"),     // Google rating (1-50, stored as integer * 10)
    venuePriceLevel: integer("venue_price_level"), // Google price level (1-4)

    hostId: text("host_id").references(() => user.id), // Optional - for user-hosted events
    embedding: text("embedding"), // VECTOR(1536) - will be cast in SQL
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    // Derived/cached fields
    attendeesCount: integer("attendees_count").default(0).notNull(),
    interestedCount: integer("interested_count").default(0).notNull(),
});

export const schema = {
    user,
    session,
    account,
    verification,
    message,
    event
}