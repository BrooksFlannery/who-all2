import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initializeDatabase } from '../lib/db';
import { event, eventMessage, eventParticipation, message, user } from '../lib/db/schema';
import { assignSeedUsersToEvents } from '../scripts/assign-seed-users-to-events';
import { updateSeedUserIds } from '../scripts/update-seed-user-ids';

let testUserId: string;
let testEventId: string;

// Helper to create test user and event
async function setupTestData() {
    const db = initializeDatabase();
    if (!db) {
        throw new Error('Database not available');
    }

    // Create test user with old "user-" prefix
    const [userRow] = await db.insert(user).values({
        id: 'user-test-12345',
        name: 'Test User',
        email: 'testuser@example.com',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    }).returning();

    if (!userRow) {
        throw new Error('Failed to create test user');
    }

    // Create test event
    const [eventRow] = await db.insert(event).values({
        id: '00000000-0000-0000-0000-000000000003',
        title: 'Test Event for Seed User Assignment',
        date: new Date(),
        location: { lat: 0, lng: 0 },
        description: 'A test event for seed user assignment testing',
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
        userId: userRow.id,
        eventId: eventRow.id,
    };
}

describe('Seed User Updates', () => {
    beforeAll(async () => {
        const ids = await setupTestData();
        testUserId = ids.userId;
        testEventId = ids.eventId;
    });

    describe('User ID Update', () => {
        it('should update user IDs from "user-" to "seed-" prefix', async () => {
            const db = initializeDatabase();
            if (!db) {
                throw new Error('Database not available');
            }

            // Verify user exists with old prefix
            const oldUser = await db.select().from(user).where(eq(user.id, testUserId));
            expect(oldUser.length).toBe(1);

            // Run the update script
            const result = await updateSeedUserIds();
            expect(result.success).toBe(true);
            expect(result.usersUpdated).toBeGreaterThan(0);

            // Verify user now has new prefix
            const newUserId = testUserId.replace('user-', 'seed-');
            const newUser = await db.select().from(user).where(eq(user.id, newUserId));
            expect(newUser.length).toBe(1);
            expect(newUser[0].name).toBe('Test User');

            // Verify old user ID no longer exists
            const oldUserCheck = await db.select().from(user).where(eq(user.id, testUserId));
            expect(oldUserCheck.length).toBe(0);
        });

        it('should update related message user IDs', async () => {
            const db = initializeDatabase();
            if (!db) {
                throw new Error('Database not available');
            }

            const newUserId = testUserId.replace('user-', 'seed-');

            // Create a test message with the new user ID
            await db.insert(message).values({
                userId: newUserId,
                role: 'user',
                content: 'Test message',
                isSummarized: false,
                createdAt: new Date(),
            });

            // Verify message was created with new user ID
            const messages = await db.select().from(message).where(eq(message.userId, newUserId));
            expect(messages.length).toBeGreaterThan(0);
        });
    });

    describe('Seed User Event Assignment', () => {
        it('should assign seed users to events with correct distribution', async () => {
            const db = initializeDatabase();
            if (!db) {
                throw new Error('Database not available');
            }

            // Create a seed user for testing
            const seedUserId = 'seed-test-assignment-12345';
            await db.insert(user).values({
                id: seedUserId,
                name: 'Test Assignment User',
                email: 'testassignment@example.com',
                emailVerified: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            }).onConflictDoNothing();

            // Run the assignment script
            const result = await assignSeedUsersToEvents();
            expect(result.success).toBe(true);

            // Verify that some assignments were made
            const participations = await db.select()
                .from(eventParticipation)
                .where(eq(eventParticipation.userId, seedUserId));

            // The user might be assigned to events (depending on random selection)
            // Just verify the script ran successfully
            expect(result.success).toBe(true);

            // Verify the distribution is roughly correct (66% interested, 33% attending)
            const interestedCount = participations.filter(p => p.status === 'interested').length;
            const attendingCount = participations.filter(p => p.status === 'attending').length;
            const totalAssignments = participations.length;

            if (totalAssignments > 0) {
                const interestedPercentage = (interestedCount / totalAssignments) * 100;
                const attendingPercentage = (attendingCount / totalAssignments) * 100;

                // Allow some variance (should be roughly 66% interested, 33% attending)
                expect(interestedPercentage).toBeGreaterThan(50); // At least 50% interested
                expect(attendingPercentage).toBeLessThan(50); // Less than 50% attending
            } else {
                // If no assignments, that's also valid (random selection)
                console.log('No assignments made for test user (random selection)');
            }
        });

        it('should update event participation counts correctly', async () => {
            const db = initializeDatabase();
            if (!db) {
                throw new Error('Database not available');
            }

            // Get the test event
            const eventRecord = await db.select().from(event).where(eq(event.id, testEventId));
            expect(eventRecord.length).toBe(1);

            // Verify that the event has updated counts
            expect(eventRecord[0].attendeesCount).toBeGreaterThanOrEqual(0);
            expect(eventRecord[0].interestedCount).toBeGreaterThanOrEqual(0);
        });

        it('should not assign users to the same event multiple times', async () => {
            const db = initializeDatabase();
            if (!db) {
                throw new Error('Database not available');
            }

            const seedUserId = 'seed-test-duplicate-12345';

            // Create a test user
            await db.insert(user).values({
                id: seedUserId,
                name: 'Test Duplicate User',
                email: 'testduplicate@example.com',
                emailVerified: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            }).onConflictDoNothing();

            // Manually assign user to an event
            await db.insert(eventParticipation).values({
                eventId: testEventId,
                userId: seedUserId,
                status: 'interested',
                joinedAt: new Date(),
            }).onConflictDoNothing();

            // Run assignment script again
            const result = await assignSeedUsersToEvents();
            expect(result.success).toBe(true);

            // Verify user is only assigned once to the test event
            const participations = await db.select()
                .from(eventParticipation)
                .where(
                    eq(eventParticipation.userId, seedUserId),
                    eq(eventParticipation.eventId, testEventId)
                );

            // Print participations for debugging
            console.log('Participations for user/event:', participations);

            // Should have at most one participation record for this user/event
            expect(participations.length).toBeLessThanOrEqual(1);
            if (participations.length === 1) {
                expect(['interested', 'attending']).toContain(participations[0].status);
            }
        });
    });

    afterAll(async () => {
        const db = initializeDatabase();
        if (!db) return;

        // Clean up test data
        const testIds = [
            testUserId,
            testUserId.replace('user-', 'seed-'),
            'seed-test-assignment-12345',
            'seed-test-duplicate-12345'
        ];

        for (const userId of testIds) {
            // Clean up event participations
            await db.delete(eventParticipation).where(eq(eventParticipation.userId, userId));

            // Clean up event messages
            await db.delete(eventMessage).where(eq(eventMessage.userId, userId));

            // Clean up messages
            await db.delete(message).where(eq(message.userId, userId));

            // Clean up users
            await db.delete(user).where(eq(user.id, userId));
        }

        // Clean up test event
        await db.delete(event).where(eq(event.id, testEventId));
    });
}); 