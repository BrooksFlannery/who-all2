import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { deleteEventById, getAllEvents, getEventById, insertEvent } from '../lib/db/events';
import { Event } from '../lib/event-generation';

describe('Event Database Operations', () => {
    let testEventId: string;

    const testEvent: Event = {
        title: 'Test Event',
        description: 'This is a test event for database operations',
        categories: ['test', 'social'],
        date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        location: {
            lat: 40.7580,
            lng: -73.9855,
            neighborhood: 'Midtown'
        },
        venue: {
            placeId: 'test-place-id',
            name: 'Test Venue',
            types: ['restaurant'],
            formattedAddress: '123 Test St, New York, NY',
            googleMapsUri: 'https://maps.google.com/?cid=123',
            primaryType: 'restaurant',
            primaryTypeDisplayName: 'Restaurant'
        },
        venueType: 'restaurant',
        venueRating: 4.5,
        venuePriceLevel: 2,
        hostId: null,
        embedding: null,
        attendeesCount: 0,
        interestedCount: 0
    };

    beforeAll(async () => {
        // Clean up any existing test events
        const allEvents = await getAllEvents();
        for (const event of allEvents) {
            if (event.title === 'Test Event') {
                // Find the event ID by title (since we don't have it in the Event interface)
                // This is a limitation of our current design - we should add ID to Event interface
                console.log('Found existing test event, will clean up after test');
            }
        }
    });

    afterAll(async () => {
        // Clean up test event if it was created
        if (testEventId) {
            await deleteEventById(testEventId);
        }
    });

    it('should insert a single event', async () => {
        testEventId = await insertEvent(testEvent);

        expect(testEventId).toBeDefined();
        expect(typeof testEventId).toBe('string');
        expect(testEventId.length).toBeGreaterThan(0);
    });

    it('should retrieve an event by ID', async () => {
        const retrievedEvent = await getEventById(testEventId);

        expect(retrievedEvent).toBeDefined();
        expect(retrievedEvent).not.toBeNull();
        expect(retrievedEvent!.title).toBe(testEvent.title);
        expect(retrievedEvent!.description).toBe(testEvent.description);
        expect(retrievedEvent!.categories).toEqual(testEvent.categories);
        expect(retrievedEvent!.venue?.name).toBe(testEvent.venue!.name);
        expect(retrievedEvent!.venueRating).toBe(testEvent.venueRating);
    });

    it('should return null for non-existent event ID', async () => {
        const nonExistentId = '00000000-0000-0000-0000-000000000000';
        const retrievedEvent = await getEventById(nonExistentId);

        expect(retrievedEvent).toBeNull();
    });

    it('should delete an event by ID', async () => {
        const deleted = await deleteEventById(testEventId);

        expect(deleted).toBe(true);

        // Verify it's gone
        const retrievedEvent = await getEventById(testEventId);
        expect(retrievedEvent).toBeNull();

        // Reset testEventId since it's now deleted
        testEventId = '';
    });

    it('should return false when deleting non-existent event', async () => {
        const nonExistentId = '00000000-0000-0000-0000-000000000000';
        const deleted = await deleteEventById(nonExistentId);

        expect(deleted).toBe(false);
    });
}); 