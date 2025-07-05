import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Get the correct base URL for the current environment
const getBaseURL = () => {
    if (Platform.OS === "web") {
        // Use relative path; same origin
        return "";
    }
    // On native, use environment variable or fallback to tunnel URL
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    if (envUrl) {
        console.log("Using EXPO_PUBLIC_API_URL from env:", envUrl);
        return envUrl;
    }
    // Fallback to tunnel URL since we're running with --tunnel
    // Use http:// for tunnel URLs to match server protocol
    const tunnelUrl = "http://idlbcxe-anonymous-8081.exp.direct";
    console.log("No EXPO_PUBLIC_API_URL found, using fallback:", tunnelUrl);
    return tunnelUrl;
};

// Get socket URL for cross-platform compatibility
const getSocketURL = () => {
    const envSocketUrl = process.env.EXPO_PUBLIC_SOCKET_URL;
    if (envSocketUrl) {
        console.log("Using EXPO_PUBLIC_SOCKET_URL from env:", envSocketUrl);
        return envSocketUrl;
    }
    // Fallback to localhost for development
    const fallbackUrl = "http://localhost:3001";
    console.log("No EXPO_PUBLIC_SOCKET_URL found, using fallback:", fallbackUrl);
    return fallbackUrl;
};


console.log("=== Auth Client Configuration ===");
console.log("Platform:", Platform.OS);
console.log("Base URL:", getBaseURL());

export const authClient = createAuthClient({
    baseURL: getBaseURL(),
    plugins: [
        expoClient({
            scheme: "whoall2", // Match your app.json scheme
            storagePrefix: "whoall2",
            storage: SecureStore,
        })
    ]
});

// Add logging to check session
export const debugSession = async () => {
    try {
        console.log("=== Debugging Session ===");
        const session = await authClient.getSession();
        console.log("Current session:", session);
        return session;
    } catch (error) {
        console.error("Error getting session:", error);
        return null;
    }
};

// Helper function to get socket authentication headers
export const getSocketAuthHeaders = async () => {
    try {
        console.log("=== Getting Socket Auth Headers ===");
        const session = await authClient.getSession();

        if (!session?.data?.session?.token) {
            console.log("No session token available for socket authentication");
            return null;
        }

        const token = session.data.session.token;
        const headers: Record<string, string> = {};

        // Try to get signed cookie first
        if (typeof authClient.getCookie === 'function') {
            try {
                const fullCookie = await (authClient as any).getCookie();
                if (fullCookie) {
                    headers['Cookie'] = fullCookie;
                    console.log('Socket auth: Using signed cookie from getCookie()');
                } else {
                    headers['Authorization'] = `Bearer ${token}`;
                    console.log('Socket auth: Using Bearer token (getCookie() returned empty)');
                }
            } catch (cookieErr) {
                console.warn('Socket auth: getCookie() failed, using Bearer token:', cookieErr);
                headers['Authorization'] = `Bearer ${token}`;
            }
        } else {
            headers['Authorization'] = `Bearer ${token}`;
            console.log('Socket auth: Using Bearer token (no getCookie() available)');
        }

        console.log("Socket auth headers:", Object.keys(headers));
        return headers;
    } catch (error) {
        console.error("Error getting socket auth headers:", error);
        return null;
    }
};

// Helper function to get auth headers for fetch requests
export const getAuthHeaders = async () => {
    try {
        console.log("=== Getting Auth Headers ===");
        const session = await authClient.getSession();
        console.log("Session for headers:", session);

        // Simple check if session exists
        if (session) {
            console.log("Session found, user authenticated");

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            // The session object already contains the token!
            // From the logs, we can see: session.data.session.token
            if (session.data?.session?.token) {
                const token = session.data.session.token;

                // Always provide Bearer token for API calls
                headers['Authorization'] = `Bearer ${token}`;

                // Generate signed cookie for socket authentication
                let signedCookie = '';
                if (typeof authClient.getCookie === 'function') {
                    try {
                        const fullCookie = await (authClient as any).getCookie();
                        if (fullCookie) {
                            signedCookie = fullCookie;
                            console.log('Using FULL Better Auth cookie from getCookie()');
                        } else {
                            signedCookie = `better-auth.session_token=${token}`;
                            console.log('getCookie() returned empty, using unsigned token as fallback');
                        }
                    } catch (cookieErr) {
                        console.warn('getCookie() failed:', cookieErr);
                        signedCookie = `better-auth.session_token=${token}`;
                    }
                } else {
                    signedCookie = `better-auth.session_token=${token}`;
                    console.log('Using Better Auth cookie with token from session (no getCookie())');
                }

                // Add both token formats for maximum compatibility
                headers['Cookie'] = signedCookie;

                // Log token format validation
                console.log("=== Token Format Validation ===");
                console.log("Bearer token format:", `Bearer ${token.substring(0, 10)}...`);
                console.log("Cookie format:", signedCookie.substring(0, 50) + "...");
                console.log("Token length:", token.length);
                console.log("Cookie length:", signedCookie.length);

            } else {
                console.log("No token found in session data");
                console.log("Session structure:", JSON.stringify(session, null, 2));
            }

            return headers;
        } else {
            console.log("No session found, returning empty headers");
            return {};
        }
    } catch (error) {
        console.error("Error getting auth headers:", error);
        return {};
    }
};