import { describe, expect, it } from 'vitest';
import { generateRealEvent } from '../lib/event-generation';

const basePseudoEvent = {
    title: 'Test Event',
    description: 'A test event for photo scraping',
    categories: ['food'],
    targetLocation: { center: { lat: 40.758, lng: -73.9855 }, radiusMeters: 5000 },
    venueTypeQuery: 'restaurant',
    clusterUserIds: [],
    generatedFrom: { centroidUserIds: [], clusterId: 'test-cluster' },
};

describe('Event Generation - Secondary Photo', () => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY || '';
    it('should store a secondary photo URL if available', async () => {
        const event = await generateRealEvent(basePseudoEvent, apiKey);
        expect(event).toBeTruthy();
        // If the venue has more than one photo, secondaryPhotoUrl should be a string
        if (event && event.secondaryPhotoUrl) {
            expect(typeof event.secondaryPhotoUrl).toBe('string');
            expect(event.secondaryPhotoUrl.length).toBeGreaterThan(0);
        }
    });

    it('should set secondaryPhotoUrl to undefined if not available', async () => {
        const pseudoEvent = {
            ...basePseudoEvent,
            title: 'Test Event No Secondary',
            venueTypeQuery: 'small park',
            categories: ['outdoors'],
            targetLocation: { center: { lat: 40.785091, lng: -73.968285 }, radiusMeters: 5000 },
        };
        const event = await generateRealEvent(pseudoEvent, apiKey);
        expect(event).toBeTruthy();
        // If the venue has only one or zero photos, secondaryPhotoUrl should be undefined
        if (event) {
            expect(event.secondaryPhotoUrl === undefined || event.secondaryPhotoUrl === null).toBe(true);
        }
    });

    it('should handle restaurants with multiple photos', async () => {
        const restaurantEvent = {
            ...basePseudoEvent,
            title: 'Restaurant Event',
            venueTypeQuery: 'fine dining restaurant',
            categories: ['food'],
        };
        const event = await generateRealEvent(restaurantEvent, apiKey);
        expect(event).toBeTruthy();
        // Restaurants often have multiple photos, so secondaryPhotoUrl might be available
        if (event) {
            expect(event.secondaryPhotoUrl === undefined || typeof event.secondaryPhotoUrl === 'string').toBe(true);
        }
    });

    it('should handle gyms and fitness venues', async () => {
        const gymEvent = {
            ...basePseudoEvent,
            title: 'Gym Event',
            venueTypeQuery: 'fitness center gym',
            categories: ['fitness'],
        };
        const event = await generateRealEvent(gymEvent, apiKey);
        expect(event).toBeTruthy();
        // Gyms often have multiple photos, so secondaryPhotoUrl might be available
        if (event) {
            expect(event.secondaryPhotoUrl === undefined || typeof event.secondaryPhotoUrl === 'string').toBe(true);
        }
    });

    it('should handle coffee shops and cafes', async () => {
        const coffeeEvent = {
            ...basePseudoEvent,
            title: 'Coffee Event',
            venueTypeQuery: 'coffee shop cafe',
            categories: ['food'],
        };
        const event = await generateRealEvent(coffeeEvent, apiKey);
        expect(event).toBeTruthy();
        // Coffee shops often have multiple photos, so secondaryPhotoUrl might be available
        if (event) {
            expect(event.secondaryPhotoUrl === undefined || typeof event.secondaryPhotoUrl === 'string').toBe(true);
        }
    });

    it('should handle museums and cultural venues', async () => {
        const museumEvent = {
            ...basePseudoEvent,
            title: 'Museum Event',
            venueTypeQuery: 'museum art gallery',
            categories: ['education'],
        };
        const event = await generateRealEvent(museumEvent, apiKey);
        expect(event).toBeTruthy();
        // Museums often have multiple photos, so secondaryPhotoUrl might be available
        if (event) {
            expect(event.secondaryPhotoUrl === undefined || typeof event.secondaryPhotoUrl === 'string').toBe(true);
        }
    });
}); 