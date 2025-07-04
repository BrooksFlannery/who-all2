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

export const auth = betterAuth({
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
    ],
    callbacks: {
        session: ({ session, user }: { session: any; user: any }) => {
            if (session.user) {
                session.user.id = user.id;
            }
            return session;
        },
    },
});