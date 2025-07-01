import { getAuthHeaders } from "@/lib/auth-client";
import { useChat as useVercelChat } from "ai/react";
import { useEffect, useState } from "react";

export function useChat() {
    const [initialMessages, setInitialMessages] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    // Load message history from database
    useEffect(() => {
        const loadMessageHistory = async () => {
            console.log("=== Loading message history ===");
            console.log("Making GET request to /api/chat");
            try {
                // Get auth headers for the request
                const authHeaders = await getAuthHeaders();
                console.log("Auth headers for GET request:", authHeaders);

                const response = await fetch('/api/chat', {
                    headers: authHeaders
                });
                console.log("GET response status:", response.status);
                console.log("GET response headers:", Object.fromEntries(response.headers.entries()));

                if (response.ok) {
                    const data = await response.json();
                    console.log("GET response data:", data);
                    if (data.messages && data.messages.length > 0) {
                        // Convert database messages to Vercel AI SDK format
                        const formattedMessages = data.messages.map((msg: any) => ({
                            id: msg.id,
                            role: msg.role,
                            content: msg.content,
                            createdAt: new Date(msg.createdAt)
                        }));
                        setInitialMessages(formattedMessages);
                        console.log('Loaded', formattedMessages.length, 'messages from database');
                    } else {
                        console.log('No messages found in database');
                    }
                } else {
                    console.log("GET request failed with status:", response.status);
                    const errorText = await response.text();
                    console.log("GET error response:", errorText);
                }
            } catch (error) {
                console.error('Error loading message history:', error);
            } finally {
                setIsLoadingHistory(false);
            }
        };

        loadMessageHistory();
    }, []);

    return useVercelChat({
        api: "/api/chat",
        initialMessages,
        // Custom fetch function to include auth headers
        fetch: async (url, options) => {
            console.log("=== Custom fetch for Vercel AI SDK ===");
            console.log("URL:", url);
            console.log("Options:", options);

            // Get auth headers
            const authHeaders = await getAuthHeaders();
            console.log("Auth headers for custom fetch:", authHeaders);

            // Merge auth headers with existing options
            const finalOptions = {
                ...options,
                headers: {
                    ...authHeaders,
                    ...options?.headers,
                }
            };

            console.log("Final fetch options:", finalOptions);
            return fetch(url, finalOptions);
        }
    });
} 