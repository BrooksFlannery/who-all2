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

        return envUrl;
    }
    // Fallback to tunnel URL since we're running with --tunnel
    // Use http:// for tunnel URLs to match server protocol
    const tunnelUrl = "http://idlbcxe-anonymous-8081.exp.direct";

    return tunnelUrl;
};

// Get socket URL for cross-platform compatibility
const getSocketURL = () => {
    const envSocketUrl = process.env.EXPO_PUBLIC_SOCKET_URL;
    if (envSocketUrl) {

        return envSocketUrl;
    }
    // Fallback to localhost for development
    const fallbackUrl = "http://localhost:3001";

    return fallbackUrl;
};




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
        const session = await authClient.getSession();
        return session;
    } catch (error) {
        console.error("Error getting session:", error);
        return null;
    }
};

// Helper function to get socket authentication headers
export const getSocketAuthHeaders = async () => {
    try {
        const session = await authClient.getSession();

        if (!session?.data?.session?.token) {
            // No session token available for socket authentication
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

                } else {
                    headers['Authorization'] = `Bearer ${token}`;

                }
            } catch (cookieErr) {
                console.warn('Socket auth: getCookie() failed, using Bearer token:', cookieErr);
                headers['Authorization'] = `Bearer ${token}`;
            }
        } else {
            headers['Authorization'] = `Bearer ${token}`;

        }


        return headers;
    } catch (error) {
        console.error("Error getting socket auth headers:", error);
        return null;
    }
};

// Helper function to get auth headers for fetch requests
export const getAuthHeaders = async () => {
    try {
        const session = await authClient.getSession();

        // Simple check if session exists
        if (session) {


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

                        } else {
                            signedCookie = `better-auth.session_token=${token}`;

                        }
                    } catch (cookieErr) {
                        console.warn('getCookie() failed:', cookieErr);
                        signedCookie = `better-auth.session_token=${token}`;
                    }
                } else {
                    signedCookie = `better-auth.session_token=${token}`;

                }

                // Add both token formats for maximum compatibility
                headers['Cookie'] = signedCookie;

                // Log token format validation


            } else {

            }

            return headers;
        } else {

            return {};
        }
    } catch (error) {
        console.error("Error getting auth headers:", error);
        return {};
    }
};