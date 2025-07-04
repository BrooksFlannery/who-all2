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
                    'X-Goog-FieldMask': 'places.displayName,places.types,places.rating,places.priceLevel,places.photos'
                }
            }
        );

        console.log('✅ API call successful!');
        console.log(`📊 Found ${response.data.places?.length || 0} restaurants:`);

        let foundPhoto = false;
        if (response.data.places && response.data.places.length > 0) {
            response.data.places.forEach((place: any, index: number) => {
                console.log(`  ${index + 1}. ${place.displayName?.text || 'Unknown'}`);
                console.log(`     🏷️  Types: ${place.types?.slice(0, 2).join(', ') || 'None'}`);
                console.log(`     ⭐ Rating: ${place.rating || 'N/A'}`);
                console.log(`     💰 Price Level: ${place.priceLevel ? '$'.repeat(place.priceLevel) : 'N/A'}`);
                if (place.photos && place.photos.length > 0) {
                    foundPhoto = true;
                    console.log(`     🖼️  Photo Resource Name: ${place.photos[0].name}`);
                    console.log(`     📐 Photo Dimensions: ${place.photos[0].widthPx}x${place.photos[0].heightPx}`);
                } else {
                    console.log('     🖼️  Photo Resource Name: None');
                }
                console.log('');
            });
        } else {
            console.log('  No restaurants found');
        }

        if (response.data.places && response.data.places.length > 0) {
            if (foundPhoto) {
                console.log('✅ At least one place has a photo resource name!');

                // Test fetching the actual photo URL for the first place with a photo
                const placeWithPhoto = response.data.places.find((place: any) => place.photos && place.photos.length > 0);
                if (placeWithPhoto && placeWithPhoto.photos[0] && placeWithPhoto.photos[0].name) {
                    console.log('🔗 Testing photo URL fetch...');
                    try {
                        const { getPhotoUrl } = await import('../lib/google-places');
                        const photoName = placeWithPhoto.photos[0].name;
                        if (photoName) {
                            const photoUrl = await getPhotoUrl(photoName, GOOGLE_PLACES_API_KEY!);
                            console.log(`✅ Photo URL fetched successfully: ${photoUrl.substring(0, 100)}...`);
                        }
                    } catch (error: any) {
                        console.error('❌ Failed to fetch photo URL:', error.message);
                    }
                }
            } else {
                console.warn('⚠️  No photo resource names found for any places.');
            }
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