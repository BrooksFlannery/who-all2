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
                        const formattedMessages = data.messages.map((msg: any) => {
                            // Parse message content to extract events data
                            let content = msg.content;
                            let events: any[] | undefined;
                            let type: string | undefined;

                            console.log('=== MESSAGE PARSING START ===');
                            console.log('Message ID:', msg.id);
                            console.log('Message role:', msg.role);
                            console.log('Raw content:', msg.content);
                            console.log('Content length:', msg.content?.length);

                            try {
                                const parsed = JSON.parse(msg.content);
                                console.log('JSON parse successful');
                                console.log('Parsed object:', JSON.stringify(parsed, null, 2));
                                console.log('parsed.type:', parsed.type);
                                console.log('parsed.events:', parsed.events);
                                console.log('parsed.message:', parsed.message);
                                console.log('parsed.text:', parsed.text);
                                console.log('Array.isArray(parsed.events):', Array.isArray(parsed.events));

                                if (parsed.type === 'event_cards' && Array.isArray(parsed.events)) {
                                    console.log('MATCH: event_cards type with events array');
                                    content = parsed.message || '';
                                    events = parsed.events;
                                    type = parsed.type;
                                    console.log('Set content to:', content);
                                    console.log('Set events to:', events?.length || 0, 'events');
                                    console.log('Set type to:', type);
                                } else if (parsed.text && parsed.events && Array.isArray(parsed.events)) {
                                    console.log('MATCH: legacy format with text and events');
                                    content = parsed.text;
                                    events = parsed.events;
                                    console.log('Set content to:', content);
                                    console.log('Set events to:', events?.length || 0, 'events');
                                } else {
                                    console.log('NO MATCH: Not event_cards format');
                                }
                            } catch (e) {
                                console.log('JSON parse failed:', e);
                                console.log('Using content as-is');
                            }

                            const result = {
                                id: msg.id,
                                role: msg.role,
                                content: content,
                                events: events,
                                type: type,
                                createdAt: new Date(msg.createdAt)
                            };

                            console.log('📤 Final message object:', {
                                id: result.id,
                                role: result.role,
                                type: result.type,
                                hasEvents: !!result.events,
                                eventsLength: result.events?.length || 0
                            });

                            return result;
                        });
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