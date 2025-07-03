import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../lib/db';
import { event, user } from '../lib/db/schema';

// Use valid UUIDs for event IDs
const uuid1 = '123e4567-e89b-12d3-a456-426614174001';
const uuid2 = '123e4567-e89b-12d3-a456-426614174002';
const uuid3 = '123e4567-e89b-12d3-a456-426614174003';

function getUniqueEmail() {
    return `test+${Math.random().toString(36).slice(2, 10)}@example.com`;
}

describe('Recommended Events', () => {
    const testUserId = 'test-user-recommended-123';
    const testEventIds = [uuid1, uuid2, uuid3];
    let testEmail: string;

    beforeEach(async () => {
        testEmail = getUniqueEmail();
        // Clean up test data
        if (db) {
            await db.delete(user).where(eq(user.id, testUserId));
            await db.delete(event).where(eq(event.id, testEventIds[0]));
            await db.delete(event).where(eq(event.id, testEventIds[1]));
            await db.delete(event).where(eq(event.id, testEventIds[2]));
        }
    });

    afterEach(async () => {
        // Clean up test data
        if (db) {
            await db.delete(user).where(eq(user.id, testUserId));
            await db.delete(event).where(eq(event.id, testEventIds[0]));
            await db.delete(event).where(eq(event.id, testEventIds[1]));
            await db.delete(event).where(eq(event.id, testEventIds[2]));
        }
    });

    it('should store and retrieve recommended event IDs', async () => {
        if (!db) {
            console.log('Database not available, skipping test');
            return;
        }

        // Create test user with recommended event IDs
        await db.insert(user).values({
            id: testUserId,
            name: 'Test User',
            email: testEmail,
            recommendedEventIds: testEventIds,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // Create test events
        await db.insert(event).values([
            {
                id: testEventIds[0],
                title: 'Test Event 1',
                date: new Date(),
                location: { lat: 37.7749, lng: -122.4194 },
                description: 'Test event 1 description',
                categories: ['social'],
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: testEventIds[1],
                title: 'Test Event 2',
                date: new Date(),
                location: { lat: 37.7749, lng: -122.4194 },
                description: 'Test event 2 description',
                categories: ['technology'],
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: testEventIds[2],
                title: 'Test Event 3',
                date: new Date(),
                location: { lat: 37.7749, lng: -122.4194 },
                description: 'Test event 3 description',
                categories: ['fitness'],
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ]);

        // Retrieve user's recommended event IDs
        const userResult = await db.select({ recommendedEventIds: user.recommendedEventIds })
            .from(user)
            .where(eq(user.id, testUserId))
            .limit(1);

        expect(userResult[0]?.recommendedEventIds).toEqual(testEventIds);
    });

    it('should handle empty recommended event IDs', async () => {
        if (!db) {
            console.log('Database not available, skipping test');
            return;
        }
        testEmail = getUniqueEmail();
        // Create test user with empty recommended event IDs
        await db.insert(user).values({
            id: testUserId,
            name: 'Test User',
            email: testEmail,
            recommendedEventIds: [],
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // Retrieve user's recommended event IDs
        const userResult = await db.select({ recommendedEventIds: user.recommendedEventIds })
            .from(user)
            .where(eq(user.id, testUserId))
            .limit(1);

        expect(userResult[0]?.recommendedEventIds).toEqual([]);
    });
}); 