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