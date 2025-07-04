import 'dotenv/config';
import { generateEmbeddingDescription, generateWeightedInterests } from '../lib/embeddings';

async function testEmbeddingPrompts() {
    console.log('🧪 Testing embedding prompt functions...');

    // Sample event description
    const sampleEventDescription = `This is a casual, regular meetup for individuals interested in textile and fiber arts. Each week, members bring in their current projects and share ideas, techniques, and inspiration. This event would be perfect for Isabella as it combines her interest in craft communities and textile techniques in a low-pressure environment. It also offers the potential for long-term engagements with like-minded peers.`;

    // Sample user conversation context
    const sampleUserContext = `Interests: Brazilian Jiu-Jitsu (BJJ), filmmaking, coding, developing chatbots for user interest gathering and event creation, hosting training camps, workshops, competitions, and exercise events; Skill levels: Intermediate in BJJ, intermediate in filmmaking, intermediate in coding, professional athlete; Dislikes/aversions: Not explicitly stated; Location preferences: Not specified; Availability patterns: Not specified; Demographic information: Likely a young adult or adult, engaged in tech and community-oriented projects, with a lifestyle that includes physical activity (BJJ and professional athletics), creative pursuits (filmmaking), and a focus on promoting health and fitness through exercise events.`;

    try {
        // Test event embedding description generation
        console.log('\n--- Event Embedding Description ---');
        const embeddingDesc = await generateEmbeddingDescription(sampleEventDescription);
        console.log(embeddingDesc);

        // Test user weighted interests generation
        console.log('\n--- User Weighted Interests ---');
        const weightedInterests = await generateWeightedInterests(sampleUserContext);
        console.log(weightedInterests);

        console.log('\n🎉 Embedding prompt tests completed!');
    } catch (error) {
        console.error('❌ Embedding prompt test failed:', error);
    }
}

testEmbeddingPrompts().catch(console.error); 