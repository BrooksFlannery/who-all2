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