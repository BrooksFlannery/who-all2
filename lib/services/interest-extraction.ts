import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { CHAT_ANALYSIS_CONFIG } from "../../constants/chat-analysis";
import { InterestExtractionResultNew, UserInterestNew } from "../db/types";

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
        existingInterests?: UserInterestNew[]
    ): Promise<InterestExtractionResultNew> {
        try {
            const context = recentMessages
                .slice(-5) // Last 5 messages for context
                .map(msg => `${msg.role}: ${msg.content}`)
                .join('\n');

            const prompt = `
You are a helpful assistant analyzing user conversations to understand their interests and preferences for events.

Extract interests from this message and conversation context. For each interest, provide:
1. A keyword (single word or short phrase)
2. Confidence score (0-1, how sure you are about this interest)
3. Specificity score (0-1, how specific this interest is)

Specificity scoring examples:
- "fitness" = 0.1 (very broad)
- "running" = 0.4 (moderate)
- "morning running" = 0.7 (specific)
- "Central Park" = 0.8 (location-specific)
- "morning running in Central Park" = 0.9 (highly specific)

IMPORTANT: Return ONLY valid JSON without any markdown formatting, code blocks, or extra text.

Expected format:
{
  "newInterests": [
    {"keyword": "running", "confidence": 0.8, "specificity": 0.4},
    {"keyword": "morning exercise", "confidence": 0.7, "specificity": 0.7}
  ],
  "confidence": 0.8,
  "shouldUpdate": true
}

Consider:
- Categories: fitness, social, creative, technology, education, food, music, outdoors, business
- Activity levels: beginner, intermediate, advanced
- Skill requirements: none, some experience, expert level
- Social preferences: group activities, solo activities, networking

Existing interests: ${existingInterests ? JSON.stringify(existingInterests) : 'none'}

Message: ${userMessage}
Recent Context: ${context}

Return only the JSON object:`;

            const result = await generateText({
                model: openai("gpt-4o-mini"),
                prompt,
                maxTokens: 500,
            });

            // Try to parse JSON, with fallback for markdown formatting
            let parsed: InterestExtractionResultNew;
            try {
                parsed = JSON.parse(result.text) as InterestExtractionResultNew;
            } catch (parseError) {
                console.log("Initial JSON parse failed, attempting markdown extraction");

                // Try to extract JSON from markdown code blocks
                const jsonMatch = result.text.match(/```(?:json)?\s*(\{.*?\})\s*```/s);
                if (jsonMatch) {
                    try {
                        parsed = JSON.parse(jsonMatch[1]) as InterestExtractionResultNew;
                    } catch (secondError) {
                        console.error("Failed to parse JSON from markdown:", secondError);
                        throw new Error("Invalid interest extraction response format");
                    }
                } else {
                    // Try to find JSON object in the text
                    const jsonObjectMatch = result.text.match(/\{.*\}/s);
                    if (jsonObjectMatch) {
                        try {
                            parsed = JSON.parse(jsonObjectMatch[0]) as InterestExtractionResultNew;
                        } catch (thirdError) {
                            console.error("Failed to parse JSON object from text:", thirdError);
                            throw new Error("Invalid interest extraction response format");
                        }
                    } else {
                        throw new Error("No valid JSON found in response");
                    }
                }
            }

            // Validate the response
            if (!parsed.newInterests || !Array.isArray(parsed.newInterests)) {
                throw new Error("Invalid interest extraction response");
            }

            // Filter interests that meet minimum confidence threshold
            const filteredInterests = parsed.newInterests.filter(
                interest => interest.confidence >= CHAT_ANALYSIS_CONFIG.MIN_CONFIDENCE_THRESHOLD
            );

            return {
                newInterests: filteredInterests,
                confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
                shouldUpdate: parsed.shouldUpdate || false
            };
        } catch (error) {
            console.error("Error extracting interests:", error);
            return {
                newInterests: [],
                confidence: 0,
                shouldUpdate: false
            };
        }
    }

    /**
     * Decompose compound interests into individual keywords
     */
    decomposeKeywords(compoundInterest: string): string[] {
        const keywords: string[] = [];

        // Add the compound interest itself
        keywords.push(compoundInterest);

        // Split by common prepositions and conjunctions
        const parts = compoundInterest.split(/\s+(?:in|at|on|with|and|or|for|to|of|the)\s+/i);

        // Add individual parts if they're meaningful
        parts.forEach(part => {
            const trimmed = part.trim();
            if (trimmed.length > 2 && trimmed !== compoundInterest) {
                keywords.push(trimmed);
            }
        });

        return [...new Set(keywords)]; // Remove duplicates
    }

    /**
     * Merge similar keywords with confidence boost
     */
    mergeSimilarKeywords(newInterests: UserInterestNew[], existingInterests: UserInterestNew[]): UserInterestNew[] {
        // Start with all existing interests
        const result: UserInterestNew[] = [...existingInterests];

        for (const newInterest of newInterests) {
            let wasMerged = false;

            // Check for similar existing interests
            for (let i = 0; i < result.length; i++) {
                const existingInterest = result[i];
                if (this.isSimilarKeyword(newInterest.keyword, existingInterest.keyword)) {
                    // Merge and boost confidence
                    const boostedConfidence = Math.min(1,
                        existingInterest.confidence + (newInterest.confidence * CHAT_ANALYSIS_CONFIG.MERGE_CONFIDENCE_BOOST)
                    );

                    result[i] = {
                        keyword: existingInterest.keyword,
                        confidence: boostedConfidence,
                        specificity: Math.max(existingInterest.specificity, newInterest.specificity),
                        lastUpdated: new Date()
                    };
                    wasMerged = true;
                    break;
                }
            }

            if (!wasMerged) {
                result.push(newInterest);
            }
        }

        return result;
    }

    /**
     * Check if two keywords are similar
     */
    private isSimilarKeyword(keyword1: string, keyword2: string): boolean {
        const k1 = keyword1.toLowerCase();
        const k2 = keyword2.toLowerCase();

        // Exact match
        if (k1 === k2) return true;

        // One contains the other
        if (k1.includes(k2) || k2.includes(k1)) return true;

        // Check for common synonyms (basic implementation)
        const synonyms: Record<string, string[]> = {
            'fitness': ['exercise', 'workout', 'gym'],
            'running': ['jogging', 'cardio'],
            'music': ['concerts', 'live music'],
            'food': ['dining', 'restaurants', 'cuisine']
        };

        for (const [word, syns] of Object.entries(synonyms)) {
            if ((k1 === word && syns.includes(k2)) || (k2 === word && syns.includes(k1))) {
                return true;
            }
        }

        return false;
    }
} 