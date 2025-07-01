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
    // On native, use the tunnel URL since we're running with --tunnel
    return "https://idlbcxe-anonymous-8081.exp.direct";
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

        // Use Better Auth's built-in getCookie method
        const cookies = authClient.getCookie();
        console.log("Cookies from Better Auth:", cookies ? "Found" : "Not found");

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // Add cookies if they exist
        if (cookies) {
            headers['Cookie'] = cookies;
            console.log("Added Cookie header");
        }

        return headers;
    } catch (error) {
        console.error("Error getting auth headers:", error);
        return {};
    }
};