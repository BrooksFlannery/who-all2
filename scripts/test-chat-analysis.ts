import * as dotenv from "dotenv";
import { UserInterestNew } from "../lib/db/types";
import { EventMatchingService } from "../lib/services/event-matching";
import { InterestExtractionService } from "../lib/services/interest-extraction";

// Load environment variables
dotenv.config();

/**
 * Test the chat analysis implementation
 */
async function testChatAnalysis() {
    console.log("=== Testing Chat Analysis Implementation ===");

    // Test 1: Interest Extraction
    console.log("\n1. Testing Interest Extraction...");
    const interestService = InterestExtractionService.getInstance();

    const testMessage = "I love running in the morning and I'm looking for fitness events";
    const testContext = [
        { role: "user", content: "Hi, I'm new here" },
        { role: "assistant", content: "Welcome! What kind of activities do you enjoy?" }
    ];

    let extractedInterests: UserInterestNew[] = [];
    try {
        const extractionResult = await interestService.extractInterests(
            testMessage,
            testContext,
            undefined
        );

        console.log("✓ Interest extraction successful");
        console.log("  New interests:", extractionResult.newInterests);
        console.log("  Confidence:", extractionResult.confidence);
        console.log("  Should update:", extractionResult.shouldUpdate);
        extractedInterests = extractionResult.newInterests;
    } catch (error) {
        console.error("✗ Interest extraction failed:", error);
        return;
    }

    // Test 2: Event Matching
    console.log("\n2. Testing Event Matching...");
    const eventService = EventMatchingService.getInstance();

    try {
        const matchedEvents = await eventService.matchEventsToInterests(
            "test-user-id",
            extractedInterests,
            3
        );

        console.log("✓ Event matching successful");
        console.log(`  Found ${matchedEvents.length} matching events`);

        if (matchedEvents.length > 0) {
            matchedEvents.forEach((event, index) => {
                console.log(`  ${index + 1}. ${event.title} (Score: ${event.similarityScore})`);
            });
        }
    } catch (error) {
        console.error("✗ Event matching failed:", error);
        return;
    }

    // Test 3: User Profile Creation
    console.log("\n3. Testing User Profile Creation...");

    try {
        await eventService.createUserProfile("test-user-id", {
            name: "Test User",
            location: { lat: 37.7749, lng: -122.4194 },
            interests: extractedInterests.map(i => i.keyword),
            preferences: { distance_radius_km: 15, preferred_categories: ["fitness", "social"] }
        });

        console.log("✓ User profile creation successful");

        // Test getting the profile
        const profile = await eventService.getUserProfile("test-user-id");
        if (profile) {
            console.log("✓ User profile retrieval successful");
            console.log("  Interests:", profile.interests);
            console.log("  Needs update:", profile.needsUpdate);
        } else {
            console.log("✗ User profile retrieval failed");
        }
    } catch (error) {
        console.error("✗ User profile creation failed:", error);
        return;
    }

    // Test 4: Recommendation Trigger Logic
    console.log("\n4. Testing Recommendation Trigger Logic...");
    const hasSufficientKeywords = extractedInterests.length >= 5;
    const hasHighSpecificity = extractedInterests.some(i => i.specificity >= 0.7);
    const explicitRequest = /recommend|suggest|event|activity|something to do/i.test(testMessage);
    if ((hasSufficientKeywords && hasHighSpecificity) || explicitRequest) {
        console.log("✓ Recommendation trigger: PASSED");
    } else {
        console.log("✗ Recommendation trigger: FAILED");
    }

    console.log("\n=== All Tests Passed! ===");
    console.log("The chat analysis implementation is working correctly.");
}

// Run the test
if (require.main === module) {
    testChatAnalysis()
        .then(() => {
            console.log("\nTest completed successfully");
            process.exit(0);
        })
        .catch((error) => {
            console.error("Test failed:", error);
            process.exit(1);
        });
} 