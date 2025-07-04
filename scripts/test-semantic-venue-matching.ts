import { cosineSimilarity } from 'ai';
import 'dotenv/config';
import { generateEmbedding } from '../lib/embeddings';

async function testSemanticVenueMatching() {
    console.log('🧪 Testing Semantic Venue Matching with Embeddings');
    console.log('================================================\n');

    const testCases = [
        {
            query: "rock climbing gym",
            venues: [
                { name: "Brooklyn Boulders", types: ["gym", "fitness_center"] },
                { name: "IM=X Pilates NYC", types: ["gym", "pilates_studio"] },
                { name: "Planet Fitness", types: ["gym", "fitness_center"] },
                { name: "Climb NYC", types: ["gym", "sports_complex"] }
            ]
        },
        {
            query: "coffee shop",
            venues: [
                { name: "Starbucks", types: ["coffee_shop", "cafe"] },
                { name: "McDonald's", types: ["fast_food_restaurant", "coffee_shop"] },
                { name: "Dunkin' Donuts", types: ["coffee_shop", "donut_shop"] },
                { name: "Local Library", types: ["library"] }
            ]
        }
    ];

    for (const testCase of testCases) {
        console.log(`🔍 Testing Query: "${testCase.query}"`);
        console.log('─'.repeat(50));

        try {
            // Generate embedding for the query
            const queryEmbedding = await generateEmbedding(testCase.query);
            console.log(`✅ Generated query embedding (${queryEmbedding.length} dimensions)`);

            const results = [];

            // Test each venue
            for (const venue of testCase.venues) {
                const venueText = `${venue.name} ${venue.types.join(' ')}`;
                const venueEmbedding = await generateEmbedding(venueText);
                const similarity = cosineSimilarity(queryEmbedding, venueEmbedding);

                results.push({
                    venue: venue.name,
                    venueText,
                    similarity
                });

                console.log(`   📍 ${venue.name}: ${(similarity * 100).toFixed(1)}%`);
            }

            // Sort by similarity
            results.sort((a, b) => b.similarity - a.similarity);

            console.log(`\n🏆 Top Match: "${results[0].venue}" (${(results[0].similarity * 100).toFixed(1)}%)`);
            console.log(`📊 All results:`);
            results.forEach((result, index) => {
                console.log(`   ${index + 1}. ${result.venue}: ${(result.similarity * 100).toFixed(1)}%`);
            });

        } catch (error) {
            console.error(`❌ Error testing "${testCase.query}":`, error);
        }

        console.log('\n');
    }

    console.log('✨ Semantic venue matching test completed!');
}

// Run the test
testSemanticVenueMatching(); 