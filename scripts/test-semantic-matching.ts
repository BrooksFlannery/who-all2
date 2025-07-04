import 'dotenv/config';
import { findBestVenueTypes, performSemanticVenueTypeMatching } from '../lib/semantic-venue-matching';

async function testSemanticMatching() {
    console.log('🧪 Testing Semantic Venue Type Matching');
    console.log('=====================================\n');

    // Test individual venue type queries
    const testQueries = [
        'rock climbing gym',
        'coffee shop',
        'art gallery',
        'bowling alley',
        'movie theater',
        'park',
        'restaurant',
        'bar',
        'library',
        'museum'
    ];

    console.log('🔍 Testing individual venue type queries:');
    for (const query of testQueries) {
        try {
            const result = await findBestVenueTypes(query);
            console.log(`\n📝 Query: "${query}"`);
            console.log(`   🎯 Matched Types: ${result.types.join(', ')}`);
            console.log(`   📊 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
        } catch (error) {
            console.error(`❌ Error testing "${query}":`, error);
        }
    }

    // Test batch processing
    console.log('\n\n🔍 Testing batch processing:');
    try {
        const batchResults = await performSemanticVenueTypeMatching(testQueries);

        console.log('\n📊 Batch Results:');
        testQueries.forEach((query, index) => {
            console.log(`\n${index + 1}. "${query}"`);
            console.log(`   🎯 Types: ${batchResults.googleVenueTypes[index].join(', ')}`);
            console.log(`   📊 Confidence: ${(batchResults.venueTypeConfidences[index] * 100).toFixed(1)}%`);
        });
    } catch (error) {
        console.error('❌ Error in batch processing:', error);
    }

    console.log('\n✨ Semantic matching test completed!');
}

// Run the test
if (require.main === module) {
    testSemanticMatching().catch(console.error);
}

export { testSemanticMatching };
