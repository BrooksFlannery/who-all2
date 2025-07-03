import { getAuthHeaders } from '@/lib/auth-client';
import { useChat as useVercelChat } from 'ai/react';

/**
 * Custom hook for managing chat functionality with authentication
 * 
 * This hook extends the Vercel AI SDK's useChat with additional features:
 * - Authentication headers for API requests
 * - Message history loading from database
 * - Error handling for failed requests
 * 
 * The hook provides a complete chat interface that integrates with our
 * custom chat API and maintains conversation state across sessions.
 * 
 * @returns Object containing chat state and methods for interaction
 */
export function useChat() {
    // Use Vercel AI SDK's useChat as the base implementation
    // This provides streaming, message management, and UI state
    const {
        messages,
        input,
        handleInputChange,
        handleSubmit,
        isLoading,
        error,
        append,
        reload,
        stop,
        setMessages,
    } = useVercelChat({
        api: '/api/chat', // Point to our custom chat API endpoint
        onError: (error) => {
            // Handle errors silently or with user-friendly messages
            // In a production app, you might want to show toast notifications here
        },
    });

    /**
     * Loads the user's message history from the database
     * 
     * This function fetches all previous messages for the current user
     * and populates the chat interface with the conversation history.
     * It's typically called when the component mounts or when the user
     * returns to the chat after being away.
     * 
     * The function handles authentication and gracefully handles errors
     * without crashing the application.
     */
    const loadMessageHistory = async () => {
        try {
            // Get authentication headers for the API request
            const authHeaders = await getAuthHeaders();

            // Fetch message history from our chat API
            const response = await fetch('/api/chat', {
                method: 'GET',
                headers: authHeaders,
            });

            // Process the response if successful
            if (response.ok) {
                const data = await response.json();

                // Transform database messages into the format expected by the chat interface
                const formattedMessages = data.messages?.map((msg: any) => ({
                    id: msg.id,
                    role: msg.role,
                    content: msg.content,
                })) || [];

                // Update the chat state with the loaded messages
                if (formattedMessages.length > 0) {
                    setMessages(formattedMessages);
                }
            }
        } catch (error) {
            // Handle errors gracefully - don't crash the app if history loading fails
            // In a production app, you might want to log this error for debugging
        }
    };

    // Return all the chat functionality along with our custom loadMessageHistory method
    return {
        messages,
        input,
        handleInputChange,
        handleSubmit,
        isLoading,
        error,
        append,
        reload,
        stop,
        setMessages,
        loadMessageHistory,
    };
} 