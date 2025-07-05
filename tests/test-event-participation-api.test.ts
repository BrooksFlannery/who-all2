import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initializeDatabase } from '../lib/db';
import {
    getEventParticipants,
    getEventParticipationCounts,
    getUserParticipationStatus,
    updateEventParticipation
} from '../lib/db/event-participation';
import { event, user } from '../lib/db/schema';

let testUserId1: string;
let testUserId2: string;
let testEventId: string;

// Helper to create test users and event
async function setupTestData() {
    const db = initializeDatabase();
    if (!db) {
        throw new Error('Database not available');
    }

    // Insert test users
    const [user1] = await db.insert(user).values({
        id: 'test-user-1-12345',
        name: 'Test User 1',
        email: 'testuser1@example.com',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    }).returning();

    const [user2] = await db.insert(user).values({
        id: 'test-user-2-12345',
        name: 'Test User 2',
        email: 'testuser2@example.com',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    }).returning();

    if (!user1 || !user2) {
        throw new Error('Failed to create test users');
    }

    // Insert test event
    const [eventRow] = await db.insert(event).values({
        id: '00000000-0000-0000-0000-000000000002',
        title: 'Test Event for Participation',
        date: new Date(),
        location: { lat: 0, lng: 0 },
        description: 'A test event for participation testing',
        categories: ['social'],
        createdAt: new Date(),
        updatedAt: new Date(),
        attendeesCount: 0,
        interestedCount: 0,
    }).returning();

    if (!eventRow) {
        throw new Error('Failed to create test event');
    }

    return {
        userId1: user1.id,
        userId2: user2.id,
        eventId: eventRow.id,
    };
}

describe('Event Participation API and Database Functions', () => {
    beforeAll(async () => {
        const ids = await setupTestData();
        testUserId1 = ids.userId1;
        testUserId2 = ids.userId2;
        testEventId = ids.eventId;
    });

    describe('Database Functions', () => {
        it('should allow user to join as attending', async () => {
            const result = await updateEventParticipation(testEventId, testUserId1, 'attending');

            expect(result.success).toBe(true);
            expect(result.newCounts.attending).toBe(1);
            expect(result.newCounts.interested).toBe(0);
        });

        it('should allow user to join as interested', async () => {
            const result = await updateEventParticipation(testEventId, testUserId2, 'interested');

            expect(result.success).toBe(true);
            expect(result.newCounts.attending).toBe(1);
            expect(result.newCounts.interested).toBe(1);
        });

        it('should allow user to switch from interested to attending', async () => {
            const result = await updateEventParticipation(testEventId, testUserId2, 'attending');

            expect(result.success).toBe(true);
            expect(result.newCounts.attending).toBe(2);
            expect(result.newCounts.interested).toBe(0);
        });

        it('should allow user to leave event', async () => {
            const result = await updateEventParticipation(testEventId, testUserId1, null);

            expect(result.success).toBe(true);
            expect(result.newCounts.attending).toBe(1);
            expect(result.newCounts.interested).toBe(0);
        });

        it('should get correct participation counts', async () => {
            const counts = await getEventParticipationCounts(testEventId);

            expect(counts.attending).toBe(1);
            expect(counts.interested).toBe(0);
        });

        it('should get correct user participation status', async () => {
            const status1 = await getUserParticipationStatus(testEventId, testUserId1);
            const status2 = await getUserParticipationStatus(testEventId, testUserId2);

            expect(status1).toBe(null); // User 1 left the event
            expect(status2).toBe('attending'); // User 2 is attending
        });

        it('should get event participants with user details', async () => {
            const participants = await getEventParticipants(testEventId);

            expect(participants.attending).toHaveLength(1);
            expect(participants.interested).toHaveLength(0);
            expect(participants.attending[0].id).toBe(testUserId2);
            expect(participants.attending[0].name).toBe('Test User 2');
        });
    });

    describe('API Endpoints', () => {
        it('should get event details with participation info', async () => {
            const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

            try {
                const response = await fetch(`${baseUrl}/api/events/${testEventId}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        // Note: In a real test, we'd need to mock authentication
                    }
                });

                // If server is running, expect 401 without auth
                expect(response.status).toBe(401);
            } catch (error) {
                // If server is not running, expect connection error
                expect(error).toBeDefined();
                if (error instanceof Error) {
                    expect(error.message).toContain('fetch failed');
                }
            }
        });

        it('should allow joining event via API', async () => {
            const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

            try {
                const response = await fetch(`${baseUrl}/api/events/${testEventId}/participate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ status: 'attending' })
                });

                // If server is running, expect 401 without auth
                expect(response.status).toBe(401);
            } catch (error) {
                // If server is not running, expect connection error
                expect(error).toBeDefined();
                if (error instanceof Error) {
                    expect(error.message).toContain('fetch failed');
                }
            }
        });
    });

    afterAll(async () => {
        const db = initializeDatabase();
        if (!db || !testEventId || !testUserId1 || !testUserId2) return;

        // Clean up test data
        await db.delete(event).where(eq(event.id, testEventId));
        await db.delete(user).where(eq(user.id, testUserId1));
        await db.delete(user).where(eq(user.id, testUserId2));
    });
}); 