import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!GOOGLE_PLACES_API_KEY) {
    console.error('❌ GOOGLE_PLACES_API_KEY not found in environment variables');
    process.exit(1);
}

async function testGooglePlacesAPI() {
    console.log('🧪 Testing Google Places API v1...');
    console.log('🔍 Searching for restaurants near Times Square, NYC');

    try {
        // Using the new Places API v1 with nearby search
        const response = await axios.post(
            'https://places.googleapis.com/v1/places:searchNearby',
            {
                includedTypes: ["restaurant"],
                maxResultCount: 3,
                locationRestriction: {
                    circle: {
                        center: {
                            latitude: 40.7580,
                            longitude: -73.9855
                        },
                        radius: 1000.0
                    }
                }
            },
            {
                headers: {
                    'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
                    'X-Goog-FieldMask': 'places.displayName,places.types,places.rating,places.priceLevel'
                }
            }
        );

        console.log('✅ API call successful!');
        console.log(`📊 Found ${response.data.places?.length || 0} restaurants:`);

        if (response.data.places && response.data.places.length > 0) {
            response.data.places.forEach((place: any, index: number) => {
                console.log(`  ${index + 1}. ${place.displayName?.text || 'Unknown'}`);
                console.log(`     🏷️  Types: ${place.types?.slice(0, 2).join(', ') || 'None'}`);
                console.log(`     ⭐ Rating: ${place.rating || 'N/A'}`);
                console.log(`     💰 Price Level: ${place.priceLevel ? '$'.repeat(place.priceLevel) : 'N/A'}`);
                console.log('');
            });
        } else {
            console.log('  No restaurants found');
        }

        console.log('🎉 Google Places API v1 is working correctly!');
        console.log('✅ Your API key is valid and ready to use.');

    } catch (error: any) {
        console.error('❌ API call failed:');

        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Error: ${error.response.data?.error?.message || error.response.data?.status || error.response.data}`);

            if (error.response.status === 403) {
                console.error('   💡 This might be an API key issue. Check:');
                console.error('      - API key is correct');
                console.error('      - Places API is enabled in Google Cloud Console');
                console.error('      - Billing is set up (required for Places API)');
                console.error('      - API key restrictions are not too strict');
            }
        } else {
            console.error(`   Error: ${error.message}`);
        }

        process.exit(1);
    }
}

// Run the test
testGooglePlacesAPI(); 