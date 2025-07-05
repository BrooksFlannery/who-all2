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
                headers['Authorization'] = `Bearer ${session.data.session.token}`;
                // Prefer full signed cookie from auth client if available
                if (typeof authClient.getCookie === 'function') {
                    try {
                        const fullCookie = await (authClient as any).getCookie();
                        if (fullCookie) {
                            headers['Cookie'] = fullCookie;
                            console.log('Added Authorization header and FULL Better Auth cookie from getCookie()');
                        } else {
                            headers['Cookie'] = `better-auth.session_token=${session.data.session.token}`;
                            console.log('getCookie() returned empty, using unsigned token as fallback');
                        }
                    } catch (cookieErr) {
                        console.warn('getCookie() failed:', cookieErr);
                        headers['Cookie'] = `better-auth.session_token=${session.data.session.token}`;
                    }
                } else {
                    headers['Cookie'] = `better-auth.session_token=${session.data.session.token}`;
                    console.log('Added Authorization header and Better Auth cookie with token from session (no getCookie())');
                }
                console.log("Token:", session.data.session.token);
                console.log("Cookie header:", headers['Cookie']);
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