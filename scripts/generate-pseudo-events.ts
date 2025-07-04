import { openai } from '@ai-sdk/openai';
import { neon } from '@neondatabase/serverless';
import { generateText } from 'ai';
import 'dotenv/config';
import { inArray, isNull, not } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { HDBSCAN } from 'hdbscan-ts';

import { CLUSTERING_CONFIG, DEV_CONFIG, EVENT_CONFIG, LOCATION_CONFIG } from '../lib/constants';
import { user } from '../lib/db/schema';
import { generateEmbedding } from '../lib/embeddings';
import {
    calculateCentroid,
    calculateClusterLocation,
    extractCategories,
    findCentroidUsers,
    parseEventDescriptionsWithTitles,
    parseVenueTypes
} from '../lib/pseudo-event-utils';
import {
    EventGenerationResult,
    PseudoEvent,
    UserCluster
} from '../lib/pseudo-events';
import { validateEnv } from '../lib/validation';

// Environment variables validated in validateEnv() function

// Create database connection using the same pattern as seed-events.ts
let db: any = null;

/**
 * Initialize database connection
 */
function initializeDatabase() {
    if (!db) {
        // Validate environment variables
        const env = validateEnv();
        const databaseUrl = env.DATABASE_URL;

        if (!databaseUrl) {
            console.error('DATABASE_URL is not defined');
            process.exit(1);
        }

        const sql = neon(databaseUrl);
        db = drizzle(sql);
    }
    return db;
}

/**
 * L2 normalize a vector (divide by its magnitude)
 */
function normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) return vector;
    return vector.map(val => val / magnitude);
}

/**
 * Cluster users by interest embeddings using HDBSCAN
 */
async function clusterUsersByInterests(): Promise<UserCluster[]> {
    console.log('🔍 Starting user clustering...');

    // Step 1: Fetch all users with interest embeddings
    const db = initializeDatabase();
    const users = await db.select().from(user).where(not(isNull(user.interestEmbedding)));
    console.log(`📊 Found ${users.length} users with interest embeddings`);

    if (users.length === 0) {
        console.log('⚠️ No users with embeddings found');
        return [];
    }

    // Step 2: Extract embeddings as 2D array and L2 normalize them
    const embeddings = users.map((u: any) => normalizeVector(JSON.parse(u.interestEmbedding!)));

    // Step 3: Run HDBSCAN clustering with euclidean distance on normalized vectors
    console.log('🔄 Running HDBSCAN clustering...');
    const clusterer = new HDBSCAN({
        minClusterSize: CLUSTERING_CONFIG.MIN_CLUSTER_SIZE,
        minSamples: CLUSTERING_CONFIG.MIN_SAMPLES,
        metric: CLUSTERING_CONFIG.METRIC
    });

    const labels = clusterer.fit(embeddings);
    console.log(`🏷️ Generated ${labels.length} cluster labels`);

    // Step 4: Group users by cluster labels
    const clusters: UserCluster[] = [];
    const clusterMap = new Map<number, string[]>();

    labels.forEach((label, index) => {
        if (!clusterMap.has(label)) {
            clusterMap.set(label, []);
        }
        clusterMap.get(label)!.push(users[index].id);
    });

    // Step 5: Convert to UserCluster objects
    clusterMap.forEach((userIds, clusterId) => {
        // Handle unclustered users (label -1) based on development config
        if (clusterId === -1) {
            if (DEV_CONFIG.TREAT_UNCLUSTERED_AS_CLUSTERS) {
                console.log(`🔄 Treating ${userIds.length} unclustered users as individual clusters for development`);

                // Create individual clusters for each unclustered user
                userIds.forEach((userId, index) => {
                    const user = users.find((u: any) => u.id === userId)!;
                    const userEmbedding = normalizeVector(JSON.parse(user.interestEmbedding!));

                    clusters.push({
                        id: `unclustered_${index}`,
                        userIds: [userId],
                        centroid: userEmbedding
                    });
                });
            } else {
                console.log(`⚠️ Skipping ${userIds.length} unclustered users (noise points)`);
            }
            return;
        }

        // Get embeddings for this cluster
        const clusterEmbeddings = userIds.map(userId => {
            const user = users.find((u: any) => u.id === userId)!;
            return normalizeVector(JSON.parse(user.interestEmbedding!));
        });

        const centroid = calculateCentroid(clusterEmbeddings, userIds, users);

        clusters.push({
            id: `cluster_${clusterId}`,
            userIds,
            centroid
        });
    });

    console.log(`✅ Generated ${clusters.length} clusters`);
    return clusters;
}

/**
 * Generate event descriptions using OpenAI
 */
async function generateEventDescriptions(centroidUserIds: string[]): Promise<Array<{ title: string, description: string }>> {
    console.log(`🤖 Generating event descriptions for ${centroidUserIds.length} centroid users...`);

    // Step 1: Fetch user weighted interests
    const db = initializeDatabase();
    const users = await db.select().from(user).where(inArray(user.id, centroidUserIds));
    const weightedInterests = users.map((u: any) => u.weightedInterests || 'No weighted interests available').join('\n\n');

    // Step 2: Generate 5 diverse event descriptions
    const prompt = `
Based on these user weighted interests, generate 5 diverse event descriptions that would satisfy all these users:

${weightedInterests}

CRITICAL EVENT REQUIREMENTS:
- Events must be held in public spaces that DO NOT require booking or reservations
- Events should be meetup/club format - no classes, workshops, or events requiring a host/organizer
- Events must be self-organized by attendees showing up at the same time/place
- No private venues, event spaces, or places requiring advance booking
- All events must be suitable for urban settings - no beaches, mountains, or rural activities

ACCEPTABLE VENUE TYPES:
- Parks, hiking trails, beaches, outdoor recreation areas
- Coffee shops, cafes, restaurants, bars, breweries
- Climbing gyms, fitness centers, yoga studios (drop-in)
- Libraries, bookstores, museums (free days)
- Farmers markets, food trucks, outdoor markets
- Public squares, plazas, community centers
- Skate parks, basketball courts, tennis courts
- Public gardens, botanical gardens, nature preserves
- Board game cafes, arcades, bowling alleys
- Public art installations, street art areas

EVENT FORMAT EXAMPLES:
- "Rock Climbing Meetup at Local Gym - Drop-in climbing session for all levels"
- "Coffee & Code at Local Cafe - Bring your laptop for casual coding together"
- "Sunset Photography Walk at City Park - Capture golden hour photos"
- "Board Game Night at Game Cafe - Casual gaming, bring your favorites"
- "Yoga in the Park - Outdoor yoga session, bring your own mat"
- "Food Truck Tour - Sample different cuisines at the weekly market"
- "Skate Session at Skate Park - All skill levels welcome"
- "Sci-Fi Book Club at Cafe - Discuss this month's selection"
- "Vintage Vinyl Hunt at Record Store - Browse and share music discoveries"
- "Urban Sketching at Botanical Garden - Bring your sketchbook and pencils"
- "Craft Beer Tasting at Brewery - Sample seasonal brews and discuss flavors"
- "Chess Meetup at Library - Casual games for all skill levels"
- "Plant Swap at Community Garden - Trade cuttings and gardening tips"
- "Poetry Open Mic at Bookstore - Share original work or favorite poems"
- "Rock Climbing Bouldering Session - Indoor bouldering for all levels"
- "Street Photography Walk - Capture urban scenes and street life"
- "Meditation Circle at Zen Garden - Group meditation in peaceful setting"
- "Baked Goods Potluck at Park - Share homemade treats and recipes"
- "Art Gallery Walk - Visit public galleries and discuss the artwork"
- "Tech Discussion at Cafe - Bring your laptop for casual tech talk"
- "Fitness Meetup at Park - Group workout session, all levels welcome"
- "Creative Writing Workshop at Library - Share stories and get feedback"

Generate 5 different event concepts that are as diverse as possible while still appealing to all users. Each event should have:
- A clear, specific title with venue type
- A description of what the event involves
- Be realistic for a group of 10-20 people to self-organize
- Only require things people can easily bring (laptop, mat, sketchbook, etc.) or items that exist at the venue
- Don't assume special exhibitions, equipment, or events exist - focus on regular venue activities

Format as numbered list:
1. [Title] - [Description]
2. [Title] - [Description]
...
`;

    try {
        const response = await generateText({
            model: openai('gpt-4'),
            prompt,
            temperature: 0.8,
            maxTokens: 300
        });

        const content = response.text;
        if (!content) {
            throw new Error('No content received from OpenAI');
        }

        // Step 3: Parse response into individual descriptions with separate titles
        const events = parseEventDescriptionsWithTitles(content);
        console.log(`✅ Generated ${events.length} event descriptions`);
        return events;
    } catch (error) {
        console.error('❌ Error generating event descriptions:', error);
        throw error;
    }
}

/**
 * Select best event via embedding comparison
 */
async function selectBestEvent(events: Array<{ title: string, description: string }>, clusterUserIds: string[]): Promise<{ title: string, description: string }> {
    console.log(`🎯 Selecting best event from ${events.length} options...`);

    // Step 1: Embed all event descriptions
    const eventEmbeddings = await Promise.all(
        events.map(event => generateEmbedding(event.description))
    );

    // Step 2: Get all user embeddings in cluster
    if (!db) {
        throw new Error('Database not available');
    }
    const users = await db.select().from(user).where(inArray(user.id, clusterUserIds));
    const userEmbeddings = users.map((u: any) => JSON.parse(u.interestEmbedding!));

    // Step 3: Calculate average similarity for each event
    const eventScores = eventEmbeddings.map((eventEmbedding, index) => {
        const similarities = userEmbeddings.map((userEmbedding: number[]) => {
            // Calculate cosine similarity
            const dotProduct = eventEmbedding.reduce((sum: number, val: number, i: number) => sum + val * userEmbedding[i], 0);
            const eventMagnitude = Math.sqrt(eventEmbedding.reduce((sum: number, val: number) => sum + val * val, 0));
            const userMagnitude = Math.sqrt(userEmbedding.reduce((sum: number, val: number) => sum + val * val, 0));
            return dotProduct / (eventMagnitude * userMagnitude);
        });
        const avgSimilarity = similarities.reduce((a: number, b: number) => a + b, 0) / similarities.length;
        return { event: events[index], score: avgSimilarity };
    });

    // Step 4: Return highest scoring event
    const bestEvent = eventScores.sort((a, b) => b.score - a.score)[0];
    console.log(`✅ Selected event with score: ${bestEvent.score.toFixed(4)}`);
    return bestEvent.event;
}

/**
 * Extract venue types using OpenAI
 */
async function extractVenueTypes(eventDescriptions: string[]): Promise<string[]> {
    console.log(`🏢 Extracting venue types for ${eventDescriptions.length} events...`);

    const prompt = `
For each of these event descriptions, suggest the most appropriate Google Places venue type:

${eventDescriptions.map((desc, i) => `${i + 1}. ${desc}`).join('\n')}

Respond with just the venue types, one per line, in order:
1. [venue type]
2. [venue type]
...
`;

    try {
        const response = await generateText({
            model: openai('gpt-4'),
            prompt,
            temperature: 0.3
        });

        const content = response.text;
        if (!content) {
            throw new Error('No content received from OpenAI');
        }

        const venueTypes = parseVenueTypes(content);
        console.log(`✅ Extracted ${venueTypes.length} venue types`);
        return venueTypes;
    } catch (error) {
        console.error('❌ Error extracting venue types:', error);
        throw error;
    }
}

/**
 * Main function to generate pseudo-events
 */
async function generatePseudoEvents(): Promise<EventGenerationResult> {
    console.log('🚀 Starting pseudo-event generation...');

    const startTime = Date.now();
    const errors: string[] = [];

    try {
        // Step 1: Cluster users by interest embeddings
        const clusters = await clusterUsersByInterests();
        console.log(`📊 Generated ${clusters.length} clusters`);

        if (clusters.length === 0) {
            return {
                success: false,
                pseudoEvents: [],
                errors: ['No clusters generated'],
                stats: {
                    totalUsers: 0,
                    clusteredUsers: 0,
                    unclusteredUsers: 0,
                    clustersGenerated: 0,
                    eventsGenerated: 0
                }
            };
        }

        const pseudoEvents: PseudoEvent[] = [];

        // Step 2: Process each cluster
        for (const cluster of clusters) {
            try {
                console.log(`\n🔄 Processing cluster ${cluster.id} with ${cluster.userIds.length} users`);

                // Get all users for this cluster
                const clusterUsers = await db.select().from(user).where(inArray(user.id, cluster.userIds));

                // Step 3: Find centroid users
                const centroidUserIds = findCentroidUsers(cluster.userIds, clusterUsers, cluster.centroid);
                console.log(`👥 Selected ${centroidUserIds.length} centroid users`);

                // Step 4: Generate event descriptions
                const descriptions = await generateEventDescriptions(centroidUserIds);

                // Step 5: Select best event
                const bestDescription = await selectBestEvent(descriptions, cluster.userIds);

                // Step 6: Calculate location
                const location = calculateClusterLocation(cluster.userIds, clusterUsers);

                // Step 7: Create pseudo-event (venue type will be filled in next step)
                const pseudoEvent: PseudoEvent = {
                    title: bestDescription.title,
                    description: bestDescription.description,
                    categories: extractCategories(bestDescription.description),
                    targetLocation: {
                        center: { lat: location.latitude, lng: location.longitude }, // Convert to Google Maps format
                        radiusMeters: EVENT_CONFIG.DEFAULT_RADIUS_METERS
                    },
                    venueTypeQuery: '', // Will be filled in next step
                    clusterUserIds: cluster.userIds,
                    generatedFrom: {
                        centroidUserIds,
                        clusterId: cluster.id
                    }
                };

                pseudoEvents.push(pseudoEvent);
                console.log(`✅ Created pseudo-event: ${pseudoEvent.title}`);

            } catch (error) {
                const errorMsg = `Error processing cluster ${cluster.id}: ${error}`;
                console.error(`❌ ${errorMsg}`);
                errors.push(errorMsg);
            }
        }

        // Step 8: Extract venue types for all events
        if (pseudoEvents.length > 0) {
            try {
                const descriptions = pseudoEvents.map(pe => pe.description);
                const venueTypes = await extractVenueTypes(descriptions);

                // Step 9: Update pseudo-events with venue types
                pseudoEvents.forEach((pe, index) => {
                    pe.venueTypeQuery = venueTypes[index] || LOCATION_CONFIG.DEFAULT_VENUE_TYPE; // Default fallback
                });
            } catch (error) {
                const errorMsg = `Error extracting venue types: ${error}`;
                console.error(`❌ ${errorMsg}`);
                errors.push(errorMsg);
            }
        }

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        console.log(`\n🎉 Pseudo-event generation completed in ${duration.toFixed(2)}s`);
        console.log(`📊 Generated ${pseudoEvents.length} pseudo-events`);

        // Calculate stats
        if (!db) {
            throw new Error('Database not available');
        }
        const totalUsers = await db.select().from(user).where(not(isNull(user.interestEmbedding)));
        const clusteredUsers = clusters.reduce((sum, cluster) => sum + cluster.userIds.length, 0);

        return {
            success: errors.length === 0,
            pseudoEvents,
            errors: errors.length > 0 ? errors : undefined,
            stats: {
                totalUsers: totalUsers.length,
                clusteredUsers,
                unclusteredUsers: totalUsers.length - clusteredUsers,
                clustersGenerated: clusters.length,
                eventsGenerated: pseudoEvents.length
            }
        };

    } catch (error) {
        const errorMsg = `Fatal error in pseudo-event generation: ${error}`;
        console.error(`❌ ${errorMsg}`);
        return {
            success: false,
            pseudoEvents: [],
            errors: [errorMsg],
            stats: {
                totalUsers: 0,
                clusteredUsers: 0,
                unclusteredUsers: 0,
                clustersGenerated: 0,
                eventsGenerated: 0
            }
        };
    }
}

/**
 * Main execution
 */
async function main() {
    console.log('🎯 Pseudo-Event Generation Script');
    console.log('================================');

    const result = await generatePseudoEvents();

    console.log('\n📋 Results:');
    console.log(`✅ Success: ${result.success}`);
    console.log(`📊 Stats:`, result.stats);

    if (result.errors && result.errors.length > 0) {
        console.log('\n❌ Errors:');
        result.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (result.pseudoEvents.length > 0) {
        console.log('\n🎉 Generated Pseudo-Events:');
        result.pseudoEvents.forEach((event, index) => {
            console.log(`\n${index + 1}. Complete Event Data:`);
            console.log(JSON.stringify(event, null, 2));
        });
    }

    console.log('\n✨ Script completed!');
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

export { generatePseudoEvents };
