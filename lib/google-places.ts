import { cosineSimilarity } from 'ai';
import axios from 'axios';
import { EVENT_CONFIG, VENUE_SCORING_CONFIG } from './constants';
import { PseudoEvent } from './pseudo-events';
import { generateVenueEmbedding } from './venue-embeddings';

// Types for Google Places API integration
export interface VenueSearchParams {
    pseudoEvent: PseudoEvent;
    maxResults?: number;        // Default: 20
    maxDetailFetches?: number;  // Default: 10
    scoreThreshold?: number;    // Default: 0.5 (0-1)
    apiKey: string;            // From .env GOOGLE_PLACES_API_KEY
}

export interface VenueCandidate {
    id: string;
    displayName: { text: string };
    location: { latitude: number; longitude: number };
    types: string[];
    rating?: number;
    priceLevel?: number;
    score?: number;
    // ✅ ADD new fields for enhanced venue data
    formattedAddress?: string;
    googleMapsUri?: string;
    primaryType?: string;
    primaryTypeDisplayName?: string;
}

/**
 * Calculate venue type match score using semantic similarity with embeddings
 */
async function calculateVenueTypeMatch(venueName: string, venueTypes: string[], targetQuery: string): Promise<number> {
    console.log(`      🔍 SEMANTIC VENUE TYPE MATCHING:`);
    console.log(`         • Target query: "${targetQuery}"`);
    console.log(`         • Venue name: "${venueName}"`);
    console.log(`         • Venue types: [${venueTypes.join(', ')}]`);

    try {
        // Generate embedding for the target query
        const queryEmbedding = await generateVenueEmbedding(targetQuery);

        // Create venue text for comparison (name + types)
        const venueText = `${venueName} ${venueTypes.join(' ')}`;
        const venueEmbedding = await generateVenueEmbedding(venueText);

        // Calculate cosine similarity
        const similarity = cosineSimilarity(queryEmbedding, venueEmbedding);

        console.log(`         • Venue text: "${venueText}"`);
        console.log(`         • Semantic similarity: ${(similarity * 100).toFixed(1)}%`);

        return Math.max(0, similarity); // Ensure non-negative score

    } catch (error) {
        console.error(`         ❌ Error in semantic matching:`, error);

        // Fallback to simple keyword matching if embeddings fail
        console.log(`         🔄 Falling back to keyword matching...`);
        return fallbackKeywordMatching(venueName, venueTypes, targetQuery);
    }
}

/**
 * Fallback keyword matching when semantic matching fails
 */
function fallbackKeywordMatching(venueName: string, venueTypes: string[], targetQuery: string): number {
    const name = venueName.toLowerCase();
    const query = targetQuery.toLowerCase();

    // Simple keyword matching as fallback
    const queryWords = query.split(' ').filter(word => word.length > 2);
    const nameMatches = queryWords.filter(word => name.includes(word));
    const nameMatchScore = nameMatches.length / queryWords.length;

    console.log(`         • Fallback keyword matches: [${nameMatches.join(', ')}]`);
    console.log(`         • Fallback score: ${(nameMatchScore * 100).toFixed(1)}%`);

    return nameMatchScore;
}

/**
 * Search for venues using Google Places API v1 Text Search
 */
export async function searchText(params: VenueSearchParams): Promise<VenueCandidate[]> {
    console.log(`\n🌐 GOOGLE PLACES TEXT SEARCH API REQUEST:`);
    console.log(`   • Query: "${params.pseudoEvent.venueTypeQuery}"`);
    console.log(`   • Max results: ${params.maxResults || 20}`);
    console.log(`   • Location bias radius: ${EVENT_CONFIG.DEFAULT_RADIUS_METERS}m`);

    // Build the text query with location context
    const textQuery = `${params.pseudoEvent.venueTypeQuery}`;

    const body = {
        textQuery: textQuery,
        locationBias: {
            circle: {
                center: {
                    latitude: params.pseudoEvent.targetLocation.center.lat,
                    longitude: params.pseudoEvent.targetLocation.center.lng
                },
                radius: EVENT_CONFIG.DEFAULT_RADIUS_METERS
            }
        },
        pageSize: params.maxResults || 20,
        rankPreference: 'RELEVANCE' // Use relevance for text search instead of distance
    };

    try {
        const res = await axios.post(
            'https://places.googleapis.com/v1/places:searchText',
            body,
            {
                headers: {
                    'X-Goog-Api-Key': params.apiKey,
                    'X-Goog-FieldMask': [
                        'places.id',
                        'places.displayName',
                        'places.location',
                        'places.types',
                        'places.rating',
                        'places.priceLevel',
                        'places.formattedAddress',    // ✅ ADD - Critical for directions
                        'places.googleMapsUri',       // ✅ ADD - Easy navigation
                        'places.primaryType',         // ✅ ADD - Better categorization
                        'places.primaryTypeDisplayName' // ✅ ADD - Human-readable type
                    ].join(',')
                }
            }
        );

        const places = res.data.places || [];
        console.log(`   ✅ API returned ${places.length} venues`);

        if (places.length > 0) {
            console.log(`   📋 RAW API RESULTS:`);
            places.forEach((place: any, index: number) => {
                console.log(`      ${index + 1}. "${place.displayName?.text || 'Unknown'}" - [${place.types?.join(', ') || 'No types'}]`);
            });
        }

        return places;
    } catch (error: any) {
        console.error('❌ Google Places API search failed:', error.response?.data || error.message);
        throw new Error(`Venue search failed: ${error.response?.data?.error?.message || error.message}`);
    }
}

/**
 * Find the best venue from candidates using enhanced scoring algorithm
 */
export async function findBestVenue(params: VenueSearchParams): Promise<VenueCandidate | null> {
    console.log(`\n🔍 VENUE SELECTION PROCESS STARTED`);
    console.log(`📋 Query: "${params.pseudoEvent.venueTypeQuery}"`);
    console.log(`📍 Location: ${params.pseudoEvent.targetLocation.center.lat}, ${params.pseudoEvent.targetLocation.center.lng}`);
    console.log(`📏 Radius: ${EVENT_CONFIG.DEFAULT_RADIUS_METERS}m`);

    const candidates = await searchText(params);
    console.log(`\n📊 FOUND ${candidates.length} CANDIDATE VENUES`);

    let bestCandidate: VenueCandidate | null = null;
    let bestScore = -1;
    const maxFetches = VENUE_SCORING_CONFIG.VENUE_MAX_DETAIL_FETCHES;
    const idealThreshold = VENUE_SCORING_CONFIG.VENUE_IDEAL_SCORE_THRESHOLD;
    const scoreThreshold = params.scoreThreshold ?? VENUE_SCORING_CONFIG.SCORE_THRESHOLD;

    console.log(`\n⚙️  SCORING CONFIGURATION:`);
    console.log(`   • Max venues to analyze: ${maxFetches}`);
    console.log(`   • Ideal score threshold: ${idealThreshold}`);
    console.log(`   • Minimum score threshold: ${scoreThreshold}`);
    console.log(`   • Venue type weight: ${VENUE_SCORING_CONFIG.VENUE_TYPE_WEIGHT}`);
    console.log(`   • Rating weight: ${VENUE_SCORING_CONFIG.RATING_WEIGHT}`);
    console.log(`   • Distance weight: ${VENUE_SCORING_CONFIG.DISTANCE_WEIGHT}`);

    // Score each candidate with enhanced algorithm, up to maxFetches
    const venuesToAnalyze = Math.min(candidates.length, maxFetches);
    console.log(`\n🔍 ANALYZING ${venuesToAnalyze} VENUES:`);

    for (let i = 0; i < venuesToAnalyze; i++) {
        const candidate = candidates[i];

        console.log(`\n${i + 1}. VENUE ANALYSIS:`);
        console.log(`   🏢 Name: "${candidate.displayName.text}"`);
        console.log(`   🏷️  Types: [${candidate.types.join(', ')}]`);
        console.log(`   📍 Location: ${candidate.location.latitude}, ${candidate.location.longitude}`);
        console.log(`   ⭐ Rating: ${candidate.rating || 'N/A'}`);
        console.log(`   💰 Price Level: ${candidate.priceLevel ? '$'.repeat(candidate.priceLevel) : 'N/A'}`);

        // Calculate venue type match score
        const venueTypeScore = await calculateVenueTypeMatch(
            candidate.displayName.text,
            candidate.types,
            params.pseudoEvent.venueTypeQuery
        );

        // Enhanced scoring: 40% venue type match + 20% rating + 20% distance
        const distanceScore = 1 - i / Math.max(candidates.length - 1, 1);
        const ratingScore = (candidate.rating ?? 0) / 5;
        const score = VENUE_SCORING_CONFIG.VENUE_TYPE_WEIGHT * venueTypeScore +
            VENUE_SCORING_CONFIG.RATING_WEIGHT * ratingScore +
            VENUE_SCORING_CONFIG.DISTANCE_WEIGHT * distanceScore;

        candidate.score = score;

        console.log(`   📊 SCORING BREAKDOWN:`);
        console.log(`      • Venue type match: ${(venueTypeScore * 100).toFixed(1)}% (weight: ${VENUE_SCORING_CONFIG.VENUE_TYPE_WEIGHT})`);
        console.log(`      • Distance score: ${(distanceScore * 100).toFixed(1)}% (weight: ${VENUE_SCORING_CONFIG.DISTANCE_WEIGHT})`);
        console.log(`      • Rating score: ${(ratingScore * 100).toFixed(1)}% (weight: ${VENUE_SCORING_CONFIG.RATING_WEIGHT})`);
        console.log(`      • FINAL SCORE: ${(score * 100).toFixed(1)}%`);

        if (score > bestScore) {
            bestScore = score;
            bestCandidate = candidate;
            console.log(`      ✅ NEW BEST CANDIDATE!`);
        }

        // Return immediately if we find an ideal match
        if (score >= idealThreshold) {
            console.log(`\n🎯 IDEAL MATCH FOUND! Score ${(score * 100).toFixed(1)}% >= ${(idealThreshold * 100).toFixed(1)}%`);
            console.log(`🏆 SELECTED: "${candidate.displayName.text}"`);
            return candidate;
        }
    }

    console.log(`\n📋 FINAL SELECTION SUMMARY:`);
    console.log(`   • Analyzed ${venuesToAnalyze} venues`);
    console.log(`   • Best score found: ${bestScore >= 0 ? (bestScore * 100).toFixed(1) + '%' : 'None'}`);
    console.log(`   • Score threshold: ${(scoreThreshold * 100).toFixed(1)}%`);

    // If no candidate meets the ideal threshold, return the best found (if above SCORE_THRESHOLD)
    if (bestCandidate && bestScore >= scoreThreshold) {
        console.log(`   ✅ SELECTING BEST CANDIDATE: "${bestCandidate.displayName.text}"`);
        console.log(`   📊 Final score: ${(bestScore * 100).toFixed(1)}%`);
        return bestCandidate;
    }

    console.log(`   ❌ NO SUITABLE VENUE FOUND`);
    console.log(`   💡 All candidates below minimum threshold of ${(scoreThreshold * 100).toFixed(1)}%`);
    return null; // no venue met criteria
}