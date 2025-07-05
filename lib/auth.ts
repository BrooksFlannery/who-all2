import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { initializeDatabase } from "./db";
import { schema } from "./db/schema";

// Initialize the database before creating the auth configuration
const db = initializeDatabase();

if (!db) {
    throw new Error("Failed to initialize database for authentication");
}

// Add debug logging for environment variables
console.log("=== Better Auth Server Configuration ===");
console.log("BETTER_AUTH_SECRET exists:", !!process.env.BETTER_AUTH_SECRET);
console.log("BETTER_AUTH_SECRET length:", process.env.BETTER_AUTH_SECRET?.length || 0);
console.log("Database initialized:", !!db);

export const auth = betterAuth({
    secret: process.env.BETTER_AUTH_SECRET, // Add the secret
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false, // Set to true in production
    },
    database: drizzleAdapter(db, {
        provider: "pg",
        schema
    }),
    plugins: [
        expo({
            overrideOrigin: true // Add this line to fix CORS issues
        })
    ],
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day
    },
    trustedOrigins: [
        "whoall2://",
        "whoall2://*",
        "exp://localhost:8081/*",
        "exp://192.168.1.*:8081/*", // For local network testing
        "exp://*.exp.direct/*",
        "https://*.exp.direct/*", // For tunnel URLs
        "http://*.exp.direct/*", // For tunnel URLs (http)
        "https://idlbcxe-anonymous-8081.exp.direct", // Specific tunnel URL
        "http://idlbcxe-anonymous-8081.exp.direct", // Specific tunnel URL (http)
    ],
    callbacks: {
        session: ({ session, user }: { session: any; user: any }) => {
            console.log("=== Better Auth Session Callback ===");
            console.log("User ID:", user?.id);
            console.log("Session user ID:", session?.user?.id);
            if (session.user) {
                session.user.id = user.id;
            }
            return session;
        },
    },
});