import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { InterestExtractionResult, UserInterests } from "../db/types";

export class InterestExtractionService {
    private static instance: InterestExtractionService;

    private constructor() { }

    public static getInstance(): InterestExtractionService {
        if (!InterestExtractionService.instance) {
            InterestExtractionService.instance = new InterestExtractionService();
        }
        return InterestExtractionService.instance;
    }

    /**
     * Extract interests from user message and conversation context
     */
    async extractInterests(
        userMessage: string,
        recentMessages: Array<{ role: string; content: string }>,
        existingInterests?: UserInterests
    ): Promise<InterestExtractionResult> {
        try {
            const context = recentMessages
                .slice(-5) // Last 5 messages for context
                .map(msg => `${msg.role}: ${msg.content}`)
                .join('\n');

            const prompt = `
You are a helpful assistant analyzing user conversations to understand their interests and preferences for events.

Extract interests from this message and conversation context. Return as JSON:
{
  "newInterests": {
    "broad": ["category1", "category2"],
    "specific": ["specific_interest1", "specific_interest2"]
  },
  "confidence": 0.8,
  "shouldUpdate": true/false
}

Consider:
- Categories: fitness, social, creative, technology, education, food, music, outdoors, business
- Activity levels: beginner, intermediate, advanced
- Skill requirements: none, some experience, expert level
- Social preferences: group activities, solo activities, networking

Existing interests: ${existingInterests ? JSON.stringify(existingInterests) : 'none'}

Message: ${userMessage}
Recent Context: ${context}

Return only valid JSON.`;

            const result = await generateText({
                model: openai("gpt-4o-mini"),
                prompt,
                maxTokens: 500,
            });

            const parsed = JSON.parse(result.text) as InterestExtractionResult;

            // Validate the response
            if (!parsed.newInterests || !parsed.newInterests.broad || !parsed.newInterests.specific) {
                throw new Error("Invalid interest extraction response");
            }

            return {
                newInterests: {
                    broad: parsed.newInterests.broad || [],
                    specific: parsed.newInterests.specific || []
                },
                confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
                shouldUpdate: parsed.shouldUpdate || false
            };
        } catch (error) {
            console.error("Error extracting interests:", error);
            return {
                newInterests: { broad: [], specific: [] },
                confidence: 0,
                shouldUpdate: false
            };
        }
    }

    /**
     * Update existing user interests with new information
     */
    updateUserInterests(
        existing: UserInterests,
        newInterests: InterestExtractionResult
    ): UserInterests {
        if (!newInterests.shouldUpdate || newInterests.confidence < 0.3) {
            return existing;
        }

        const updated: UserInterests = {
            broad: [...new Set([...existing.broad, ...newInterests.newInterests.broad])],
            specific: [...new Set([...existing.specific, ...newInterests.newInterests.specific])],
            scores: { ...existing.scores },
            lastUpdated: new Date()
        };

        // Update confidence scores
        newInterests.newInterests.broad.forEach(interest => {
            const currentScore = existing.scores[interest] || 0;
            updated.scores[interest] = Math.max(currentScore, newInterests.confidence);
        });

        newInterests.newInterests.specific.forEach(interest => {
            const currentScore = existing.scores[interest] || 0;
            updated.scores[interest] = Math.max(currentScore, newInterests.confidence);
        });

        return updated;
    }

    /**
     * Check if interests need updating (older than 24 hours)
     */
    shouldUpdateInterests(interests: UserInterests): boolean {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return interests.lastUpdated < twentyFourHoursAgo;
    }
} 