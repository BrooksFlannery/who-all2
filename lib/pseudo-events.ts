/**
 * Pseudo-Event Generation Types
 * Based on the tech spec for who-all event generation pipeline
 */

export interface PseudoEvent {
    title: string;                    // e.g. "Rock Climbing Meetup"
    description: string;              // Event description
    categories: string[];             // Event categories: ["fitness", "social"]
    targetLocation: {
        center: { lat: number; lng: number };
        radiusMeters: number;           // e.g. 5000 (5km)
    };
    venueTypeQuery: string;           // e.g. "rock climbing gym", "coffee shop"
    estimatedAttendees: number;       // Hard-coded to 20 for MVP
    clusterUserIds: string[];         // Users in this interest cluster
    generatedFrom: {
        centroidUserIds: string[];      // Top 5 users used for generation
        clusterId: string;              // HDBSCAN cluster identifier
    };
}

export interface UserCluster {
    id: string;
    userIds: string[];
    centroid: number[];  // Average embedding of cluster
}

export interface ClusteringParams {
    minClusterSize: number;    // Target: 20 users per cluster
    minSamples: number;        // Default: 5
    metric: 'cosine';          // Distance metric for embeddings
}

export interface CentroidUser {
    userId: string;
    similarity: number;
}

// Helper types for location data
export interface Location {
    latitude: number;
    longitude: number;
}

// Event generation result
export interface EventGenerationResult {
    success: boolean;
    pseudoEvents: PseudoEvent[];
    errors?: string[];
    stats: {
        totalUsers: number;
        clusteredUsers: number;
        unclusteredUsers: number;
        clustersGenerated: number;
        eventsGenerated: number;
    };
} 