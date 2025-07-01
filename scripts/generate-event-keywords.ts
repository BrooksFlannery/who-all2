import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import * as dotenv from "dotenv";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { event } from "../lib/db/schema";
import { EventKeywords } from "../lib/db/types";

// Load environment variables
dotenv.config();

/**
 * Extract keywords from event title and description using AI
 */
async function extractKeywords(title: string, description: string): Promise<EventKeywords> {
    try {
        const prompt = `
Extract relevant keywords from this event that would help match it to user interests.
Return as JSON: {
  "keywords": ["keyword1", "keyword2", ...],
  "scores": {"keyword1": 0.9, "keyword2": 0.7, ...}
}

Event: ${title} - ${description}

Focus on:
- Activity types (running, yoga, networking, etc.)
- Skill levels (beginner, intermediate, advanced)
- Social aspects (group, solo, team)
- Categories (fitness, social, creative, technology, etc.)
- Time of day (morning, evening, weekend)
- Location types (indoor, outdoor, virtual)

Return only valid JSON.`;

        const result = await generateText({
            model: openai("gpt-4o-mini"),
            prompt,
            maxTokens: 300,
        });

        const parsed = JSON.parse(result.text) as EventKeywords;

        // Validate the response
        if (!parsed.keywords || !Array.isArray(parsed.keywords)) {
            throw new Error("Invalid keywords response");
        }

        return {
            keywords: parsed.keywords || [],
            scores: parsed.scores || {}
        };
    } catch (error) {
        console.error("Error extracting keywords:", error);
        return {
            keywords: [],
            scores: {}
        };
    }
}

/**
 * Generate keywords for all events in the database
 */
async function generateEventKeywords() {
    console.log("Database URL:", process.env.EXPO_PUBLIC_DATABASE_URL || process.env.DATABASE_URL ? "Configured" : "Not configured");

    if (!db) {
        console.error("Database not available");
        return;
    }

    try {
        console.log("Fetching all events...");
        const events = await db.select().from(event);
        console.log(`Found ${events.length} events to process`);

        let processed = 0;
        let errors = 0;

        for (const eventItem of events) {
            try {
                console.log(`Processing event: ${eventItem.title}`);

                const keywords = await extractKeywords(eventItem.title, eventItem.description);

                if (keywords.keywords.length > 0) {
                    await db
                        .update(event)
                        .set({
                            keywords: keywords.keywords,
                            keywordScores: keywords.scores,
                            updatedAt: new Date()
                        })
                        .where(eq(event.id, eventItem.id));

                    console.log(`✓ Added ${keywords.keywords.length} keywords to "${eventItem.title}"`);
                    processed++;
                } else {
                    console.log(`⚠ No keywords extracted for "${eventItem.title}"`);
                    errors++;
                }

                // Add a small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`✗ Error processing event "${eventItem.title}":`, error);
                errors++;
            }
        }

        console.log(`\nKeyword generation complete!`);
        console.log(`Processed: ${processed} events`);
        console.log(`Errors: ${errors} events`);
    } catch (error) {
        console.error("Error generating event keywords:", error);
    }
}

// Run the script
if (require.main === module) {
    generateEventKeywords()
        .then(() => {
            console.log("Script completed successfully");
            process.exit(0);
        })
        .catch((error) => {
            console.error("Script failed:", error);
            process.exit(1);
        });
} 