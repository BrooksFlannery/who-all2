import { useChat as useVercelChat } from "ai/react";

export function useChat() {
    return useVercelChat({
        api: "/api/chat",
    });
} 