import { getAuthHeaders } from "@/lib/auth-client";
import { useChat as useVercelChat } from "ai/react";
import { useEffect, useState } from "react";

export function useChat() {
    const [initialMessages, setInitialMessages] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    // Add a helper to parse raw DB messages into chat-format objects
    const parseDbMessages = (rawMessages: any[]) => {
        return rawMessages.map((msg: any) => {
            let content = msg.content as string;
            let events: any[] | undefined;
            let type: string | undefined;

            try {
                const parsed = JSON.parse(msg.content);
                if (parsed.type === 'event_cards' && Array.isArray(parsed.events)) {
                    content = parsed.message || '';
                    events = parsed.events;
                    type = parsed.type;
                } else if (parsed.text && Array.isArray(parsed.events)) {
                    // legacy shape
                    content = parsed.text;
                    events = parsed.events;
                }
            } catch {
                // not JSON, keep as-is
            }

            return {
                id: msg.id,
                role: msg.role,
                content,
                events,
                type,
                createdAt: new Date(msg.createdAt)
            } as any;
        });
    };

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
                        const formattedMessages = parseDbMessages(data.messages);
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

    // Declare a variable so it can be accessed inside onFinish
    let chatApi: any;

    chatApi = useVercelChat({
        api: "/api/chat",
        initialMessages,
        // When the assistant finishes streaming a response, fetch the updated copy
        onFinish: async () => {
            try {
                const authHeaders = await getAuthHeaders();
                const res = await fetch('/api/chat', { headers: authHeaders });
                if (!res.ok) return;
                const data = await res.json();
                if (!data.messages) return;
                const parsed = parseDbMessages(data.messages);
                if (chatApi?.setMessages) {
                    chatApi.setMessages(parsed);
                }
            } catch (err) {
                console.error('Failed to refresh messages after finish', err);
            }
        },
        // Custom fetch with auth headers (unchanged)
        fetch: async (url, options) => {
            const authHeaders = await getAuthHeaders();
            return fetch(url, {
                ...options,
                headers: {
                    ...authHeaders,
                    ...(options?.headers || {}),
                },
            });
        },
    });

    // Return the chat API (which now includes messages, input, etc.)
    return chatApi;
} 