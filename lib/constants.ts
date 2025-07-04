/**
 * Global Constants for Pseudo-Event Generation
 */

// HDBSCAN Clustering Parameters
export const CLUSTERING_CONFIG = {
    // Minimum number of users required to form a cluster
    MIN_CLUSTER_SIZE: 2, // Reduced from 20 for development/testing

    // Minimum number of neighbors required for a point to be considered a "core point"
    // Core points can start new clusters. Lower values = more sensitive clustering
    MIN_SAMPLES: 2, // Reduced from 5 for development/testing

    // Distance metric for clustering (HDBSCAN-ts only supports euclidean)
    METRIC: 'euclidean' as const,

    // Target number of users per cluster (for reference)
    TARGET_CLUSTER_SIZE: 20
} as const;

// Event Generation Parameters
export const EVENT_CONFIG = {
    // Default number of event descriptions to generate per cluster
    DESCRIPTIONS_PER_CLUSTER: 5,

    // Number of centroid users to use for event generation
    CENTROID_USERS_COUNT: 5,

    // Default estimated attendees per event
    DEFAULT_ATTENDEES: 20,

    // Default search radius in meters (5km)
    DEFAULT_RADIUS_METERS: 5000
} as const;

// Location Configuration
export const LOCATION_CONFIG = {
    // Default coordinates when no user location data is available
    DEFAULT_COORDINATES: {
        latitude: 40.7685,
        longitude: -73.9822
    },

    // Default venue type fallback
    DEFAULT_VENUE_TYPE: 'restaurant'
} as const;

// OpenAI Configuration
export const OPENAI_CONFIG = {
    // Model for event description generation
    EVENT_GENERATION_MODEL: 'gpt-4',

    // Model for venue type extraction
    VENUE_EXTRACTION_MODEL: 'gpt-4',

    // Temperature for event generation (higher = more creative)
    EVENT_GENERATION_TEMPERATURE: 0.8,

    // Temperature for venue extraction (lower = more consistent)
    VENUE_EXTRACTION_TEMPERATURE: 0.3
} as const;

// Development/Testing Configuration
export const DEV_CONFIG = {
    // Whether to treat unclustered users as individual clusters
    // Set to true for development with small datasets
    TREAT_UNCLUSTERED_AS_CLUSTERS: true,

    // Minimum users required to run clustering
    MIN_USERS_FOR_CLUSTERING: 1
} as const;

// Semantic Venue Type Matching Configuration
export const SEMANTIC_CONFIG = {
    // Semantic matching thresholds
    SEMANTIC_MATCH_THRESHOLD: 0.7,    // Minimum similarity for semantic match
    CONFIDENCE_THRESHOLD: 0.6,         // Minimum confidence for venue type mapping
    MAX_VENUE_TYPES_PER_QUERY: 3,     // Maximum venue types to return per query

    // Clustering parameters
    MIN_CLUSTER_SIZE: 20,              // Minimum users per cluster
    MIN_SAMPLES: 5,                    // Minimum samples for HDBSCAN
    CLUSTER_SIMILARITY_THRESHOLD: 0.8, // Minimum similarity for centroid selection

    // Event generation parameters
    DEFAULT_ATTENDEES: 20,             // Default estimated attendees
    DEFAULT_RADIUS_METERS: 5000,       // Default search radius
    CENTROID_USERS_COUNT: 5,           // Number of centroid users to use
    DESCRIPTIONS_PER_CLUSTER: 5        // Number of event descriptions to generate
} as const;

// Venue Scoring Configuration (for Google Places API integration)
export const VENUE_SCORING_CONFIG = {
    // Venue scoring weights (should sum to 1.0)
    DISTANCE_WEIGHT: 0.2,      // 20% weight for distance
    RATING_WEIGHT: 0.2,        // 20% weight for venue rating  
    VENUE_TYPE_WEIGHT: 0.4,    // 40% weight for venue type match

    // Venue selection thresholds
    SCORE_THRESHOLD: 0.5,      // Minimum score to consider a venue
    VENUE_TYPE_MATCH_THRESHOLD: 0.3, // Minimum venue type match score
    VENUE_TYPE_CONFIDENCE_THRESHOLD: 0.2, // Only include additional types if within 0.2 confidence of top pick
    VENUE_MAX_DETAIL_FETCHES: 10, // Max venues to check for best match
    VENUE_IDEAL_SCORE_THRESHOLD: 0.9, // Ideal score to short-circuit search

    // Search parameters
    DEFAULT_MAX_RESULTS: 20,   // Default max venues to search
    DEFAULT_MAX_DETAIL_FETCHES: 10 // Default max venues to check details
} as const; 