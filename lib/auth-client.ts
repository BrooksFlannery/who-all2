import { createAuth } from '@auth/core';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { Platform } from 'react-native';
import { db } from './db';
import { account, session, user, verification } from './db/schema';

/**
 * Determines the base URL for API requests based on the current platform
 * 
 * This function handles the different environments where the app might run:
 * - Web: Uses the current origin (e.g., https://myapp.com)
 * - Mobile: Uses localhost for development (assumes API runs locally)
 * 
 * The base URL is used for authentication API calls and session management.
 * 
 * @returns Base URL string for the current platform
 */
function getBaseURL(): string {
    if (Platform.OS === 'web') {
        // For web, use the current origin to ensure same-origin requests
        return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    } else {
        // For mobile, use localhost (assuming you're running the API locally)
        // In production, this would point to your deployed API
        return 'http://localhost:3000';
    }
}

/**
 * Main authentication instance for the application
 * 
 * This creates a centralized auth system using @auth/core with:
 * - Drizzle ORM adapter for database operations
 * - JWT session strategy for stateless authentication
 * - Custom session callback to include user ID
 * 
 * The auth instance handles:
 * - User registration and login
 * - Session management
 * - Token generation and validation
 * - Database integration for user data
 */
export const auth = createAuth({
    adapter: DrizzleAdapter(db, {
        usersTable: user,
        sessionsTable: session,
        accountsTable: account,
        verificationTokensTable: verification,
    }),
    session: {
        strategy: 'jwt', // Use JWT tokens instead of database sessions for better performance
    },
    callbacks: {
        session: ({ session, token }) => {
            // Ensure the user ID is always available in the session
            if (token) {
                session.user.id = token.sub!;
            }
            return session;
        },
    },
});

/**
 * Generates authentication headers for API requests
 * 
 * This function creates the necessary headers to authenticate API calls:
 * - Content-Type: application/json for JSON requests
 * - Cookie: Session cookie if user is authenticated
 * 
 * The headers are used by the chat API and other authenticated endpoints
 * to verify the user's identity and maintain session state.
 * 
 * @returns Promise resolving to headers object for fetch requests
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
    // Get the current session to check if user is authenticated
    const session = await auth.api.getSession();

    // Start with basic headers
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    // Add authentication cookie if user has an active session
    if (session) {
        const cookies = await auth.api.getSessionCookie();
        if (cookies) {
            headers['Cookie'] = cookies;
        }
    }

    return headers;
}