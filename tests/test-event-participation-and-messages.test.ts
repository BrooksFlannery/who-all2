import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initializeDatabase } from '../lib/db';
import { event, eventMessage, eventParticipation, user } from '../lib/db/schema';

let testUserId: string;
let testEventId: string;

// Helper to create a user and event for testing
async function setupTestUserAndEvent() {
    const db = initializeDatabase();
    if (!db) {
        throw new Error('Database not available');
    }

    // Generate unique IDs to avoid conflicts
    const uniqueId = Date.now().toString();
    const uniqueEmail = `testuser-${uniqueId}@example.com`;

    // Insert user with unique email
    const [userRow] = await db.insert(user).values({
        id: `test-user-id-${uniqueId}`,
        name: 'Test User',
        email: uniqueEmail,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    }).onConflictDoNothing().returning();

    if (!userRow) {
        throw new Error('Failed to create test user');
    }

    // Insert event with proper UUID format
    const [eventRow] = await db.insert(event).values({
        id: `00000000-0000-0000-0000-${uniqueId.slice(-12).padStart(12, '0')}`,
        title: 'Test Event',
        date: new Date(),
        location: { lat: 0, lng: 0 },
        description: 'A test event',
        categories: ['social'],
        createdAt: new Date(),
        updatedAt: new Date(),
        attendeesCount: 0,
        interestedCount: 0,
    }).onConflictDoNothing().returning();

    if (!eventRow) {
        throw new Error('Failed to create test event');
    }

    return {
        userId: userRow.id,
        eventId: eventRow.id,
    };
}

describe('event_participation and event_messages tables', () => {
    beforeAll(async () => {
        const ids = await setupTestUserAndEvent();
        testUserId = ids.userId;
        testEventId = ids.eventId;
    });

    it('should insert and query event_participation', async () => {
        const db = initializeDatabase();
        if (!db) {
            throw new Error('Database not available');
        }

        // Insert participation
        await db.insert(eventParticipation).values({
            eventId: testEventId,
            userId: testUserId,
            status: 'attending',
            joinedAt: new Date(),
        });
        // Query
        const rows = await db.select().from(eventParticipation).where(eq(eventParticipation.eventId, testEventId));
        expect(rows.length).toBeGreaterThan(0);
        expect(rows[0].status).toBe('attending');
    });

    it('should insert and query event_messages', async () => {
        const db = initializeDatabase();
        if (!db) {
            throw new Error('Database not available');
        }

        // Insert message
        await db.insert(eventMessage).values({
            eventId: testEventId,
            userId: testUserId,
            content: 'Hello world',
            userName: 'Test User',
            userImage: null,
            createdAt: new Date(),
        });
        // Query
        const rows = await db.select().from(eventMessage).where(eq(eventMessage.eventId, testEventId));
        expect(rows.length).toBeGreaterThan(0);
        expect(rows[0].content).toBe('Hello world');
    });

    afterAll(async () => {
        const db = initializeDatabase();
        if (!db || !testEventId || !testUserId) return;

        // Clean up
        await db.delete(eventParticipation).where(eq(eventParticipation.eventId, testEventId));
        await db.delete(eventMessage).where(eq(eventMessage.eventId, testEventId));
        await db.delete(event).where(eq(event.id, testEventId));
        await db.delete(user).where(eq(user.id, testUserId));
    });
}); 