import { auth } from "@/lib/auth";
import { initializeDatabase } from "@/lib/db";
import { message, user } from "@/lib/db/schema";
import { updateUserInterestEmbedding } from "@/lib/embeddings";
import { and, eq } from "drizzle-orm";

/**
 * POST endpoint for manually triggering chat summarization and interest embedding generation
 * 
 * This endpoint processes unsummarized messages for the current user and generates
 * updated interest embeddings. It's useful for debugging and manual triggering.
 * 
 * @param req - HTTP request (no body needed)
 * @returns JSON response with summarization status
 */
export async function POST(req: Request) {
    // Step 1: Authenticate the user
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
        return new Response("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;

    // Step 2: Initialize and verify database availability
    const db = initializeDatabase();
    if (!db) {
        return new Response("Database not available", { status: 500 });
    }

    try {
        console.log('🔄 Manual summarization triggered for user:', userId);

        // Step 3: Get unsummarized messages for the user
        const unsummarizedMessages = await db
            .select()
            .from(message)
            .where(
                and(
                    eq(message.userId, userId),
                    eq(message.isSummarized, false)
                )
            )
            .orderBy(message.createdAt);

        console.log(`📊 Found ${unsummarizedMessages.length} unsummarized messages`);

        if (unsummarizedMessages.length === 0) {
            return Response.json({
                success: true,
                message: "No unsummarized messages to process",
                messageCount: 0,
                summaryLength: 0
            });
        }

        // Step 4: Get existing weighted interests for context
        const currentUser = await db
            .select({ weightedInterests: user.weightedInterests })
            .from(user)
            .where(eq(user.id, userId))
            .limit(1);

        const existingWeightedInterests = currentUser[0]?.weightedInterests || "";

        // Step 5: Prepare conversation context for weighted interest generation
        const conversationContext = unsummarizedMessages
            .map((msg: any) => `${msg.role}: ${msg.content}`)
            .join('\n');

        console.log(`💬 Conversation context prepared (${conversationContext.length} characters)`);

        // Step 6: Generate and store user interest embedding using weighted interests
        console.log('🧠 Generating user interest embedding...');
        await updateUserInterestEmbedding(userId, conversationContext, existingWeightedInterests);
        console.log('✅ User interest embedding generated and stored successfully');

        // Step 7: Mark all processed messages as summarized
        console.log(`📝 Marking ${unsummarizedMessages.length} messages as summarized...`);
        await db
            .update(message)
            .set({ isSummarized: true })
            .where(eq(message.userId, userId));

        console.log('✅ Database updates completed successfully');
        console.log('🎉 Manual summarization completed successfully');

        // Step 8: Return success response
        return Response.json({
            success: true,
            message: "Interest summary updated successfully",
            messageCount: unsummarizedMessages.length,
            summaryLength: conversationContext.length
        });

    } catch (error) {
        console.error('❌ Manual summarization failed:', error);
        return new Response(
            JSON.stringify({
                success: false,
                message: "Failed to process chat summarization",
                error: error instanceof Error ? error.message : "Unknown error"
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
} 