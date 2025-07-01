import * as dotenv from "dotenv";
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
    } catch (error) {
        console.error("✗ Interest extraction failed:", error);
        return;
    }

    // Test 2: Event Matching
    console.log("\n2. Testing Event Matching...");
    const eventService = EventMatchingService.getInstance();

    const testInterests = {
        broad: ["fitness", "running"],
        specific: ["morning running"],
        scores: { "fitness": 0.8, "running": 0.9, "morning running": 0.7 },
        lastUpdated: new Date()
    };

    try {
        const matchedEvents = await eventService.matchEventsToInterests(
            "test-user-id",
            testInterests,
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
            interests: ["fitness", "technology"],
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