import dotenv from 'dotenv';
import { findBestVenue } from '../lib/google-places';
import { PseudoEvent } from '../lib/pseudo-events';

// Load environment variables
dotenv.config();

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!GOOGLE_PLACES_API_KEY) {
    console.error('❌ GOOGLE_PLACES_API_KEY not found in environment variables');
    process.exit(1);
}

async function testVenueSearch() {
    console.log('🧪 Testing venue search functions...');

    // Test 1: Coffee shop (original test)
    console.log('\n🔍 Test 1: Coffee Shop Search');
    const coffeePseudoEvent: PseudoEvent = {
        title: "Coffee Shop Meetup",
        description: "A casual meetup at a local coffee shop",
        categories: ["social", "food"],
        targetLocation: {
            center: { lat: 40.7580, lng: -73.9855 }, // Times Square, NYC
            radiusMeters: 1000
        },
        venueTypeQuery: "coffee shop",
        clusterUserIds: ["user1", "user2", "user3"],
        generatedFrom: {
            centroidUserIds: ["user1", "user2"],
            clusterId: "cluster1"
        }
    };

    try {
        const coffeeVenue = await findBestVenue({
            pseudoEvent: coffeePseudoEvent,
            apiKey: GOOGLE_PLACES_API_KEY!,
            maxResults: 5,
            maxDetailFetches: 3,
            scoreThreshold: 0.3
        });

        if (coffeeVenue) {
            console.log('✅ Found coffee venue:');
            console.log(JSON.stringify(coffeeVenue, null, 2));
            console.log(`   🔗 Google Maps: https://maps.google.com/?q=${coffeeVenue.location.latitude},${coffeeVenue.location.longitude}`);
        }

        // Test 2: Restaurant search (different type, slightly different location)
        console.log('\n🔍 Test 2: Restaurant Search');
        const restaurantPseudoEvent: PseudoEvent = {
            title: "Dinner Meetup",
            description: "A dinner meetup at a restaurant",
            categories: ["social", "food"],
            targetLocation: {
                center: { lat: 40.7600, lng: -73.9830 }, // Slightly different location
                radiusMeters: 800
            },
            venueTypeQuery: "restaurant",
            clusterUserIds: ["user4", "user5", "user6"],
            generatedFrom: {
                centroidUserIds: ["user4", "user5"],
                clusterId: "cluster2"
            }
        };

        const restaurantVenue = await findBestVenue({
            pseudoEvent: restaurantPseudoEvent,
            apiKey: GOOGLE_PLACES_API_KEY!,
            maxResults: 5,
            maxDetailFetches: 3,
            scoreThreshold: 0.3
        });

        if (restaurantVenue) {
            console.log('✅ Found restaurant venue:');
            console.log(JSON.stringify(restaurantVenue, null, 2));
            console.log(`   🔗 Google Maps: https://maps.google.com/?q=${restaurantVenue.location.latitude},${restaurantVenue.location.longitude}`);
        }

        console.log('\n🎉 Venue search tests completed!');

        // Test 3: Rock climbing gym (specific venue type)
        console.log('\n🔍 Test 3: Rock Climbing Gym Search');
        const climbingPseudoEvent: PseudoEvent = {
            title: "Rock Climbing Meetup",
            description: "A rock climbing meetup at a climbing gym",
            categories: ["fitness", "social"],
            targetLocation: {
                center: { lat: 40.7500, lng: -73.9800 }, // Different location
                radiusMeters: 2000
            },
            venueTypeQuery: "rock climbing gym",
            clusterUserIds: ["user7", "user8", "user9"],
            generatedFrom: {
                centroidUserIds: ["user7", "user8"],
                clusterId: "cluster3"
            }
        };

        const climbingVenue = await findBestVenue({
            pseudoEvent: climbingPseudoEvent,
            apiKey: GOOGLE_PLACES_API_KEY!,
            maxResults: 10,
            maxDetailFetches: 5,
            scoreThreshold: 0.3
        });

        if (climbingVenue) {
            console.log('✅ Found climbing venue:');
            console.log(JSON.stringify(climbingVenue, null, 2));
            console.log(`   🔗 Google Maps: https://maps.google.com/?q=${climbingVenue.location.latitude},${climbingVenue.location.longitude}`);
        } else {
            console.log('❌ No suitable climbing venue found');
        }

        console.log('\n🎉 All venue search tests completed!');

    } catch (error: any) {
        console.error('❌ Venue search test failed:', error.message);
        process.exit(1);
    }
}

// Run the test
testVenueSearch(); 