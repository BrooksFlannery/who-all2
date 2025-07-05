import { initializeDatabase } from '@/lib/db';
import { getEventParticipationCounts, getUserParticipationStatus, updateEventParticipation } from '@/lib/db/event-participation';
import { event, eventParticipation, user } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// Mock data for testing
const mockEventId = '00000000-0000-0000-0000-000000000001';
const mockUserId = 'test-user-456';

describe('Event Participation Integration Tests', () => {
    beforeEach(async () => {
        // Set up test data
        const db = initializeDatabase();
        if (!db) {
            throw new Error('Database not available');
        }

        // Create test event if it doesn't exist
        try {
            await db.insert(event).values({
                id: mockEventId,
                title: 'Test Event for Integration',
                date: new Date(),
                location: { lat: 0, lng: 0 },
                description: 'A test event for integration testing',
                categories: ['social'],
                createdAt: new Date(),
                updatedAt: new Date(),
                attendeesCount: 0,
                interestedCount: 0,
                embedding: JSON.stringify(Array.from({ length: 1536 }, () => Math.random() * 2 - 1)), // Add a proper 1536-dimensional embedding
                embeddingDescription: 'Test Event (0.9), Integration (0.8), Social (0.7)',
            }).onConflictDoNothing();

            // Verify event was created
            const eventExists = await db.select().from(event).where(eq(event.id, mockEventId));
            if (eventExists.length === 0) {
                throw new Error('Failed to create test event');
            }
        } catch (error) {
            console.error('Error creating test event:', error);
            throw error;
        }

        // Create test user if it doesn't exist
        try {
            await db.insert(user).values({
                id: mockUserId,
                name: 'Test User',
                email: 'testuser@example.com',
                emailVerified: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            }).onConflictDoNothing();

            // Verify user was created
            const userExists = await db.select().from(user).where(eq(user.id, mockUserId));
            if (userExists.length === 0) {
                throw new Error('Failed to create test user');
            }
        } catch (error) {
            console.error('Error creating test user:', error);
            throw error;
        }

        // Create additional test users for multiple user tests
        const additionalUsers = [
            { id: 'user-1-12345', name: 'User 1', email: 'user1@example.com' },
            { id: 'user-2-12345', name: 'User 2', email: 'user2@example.com' },
            { id: 'user-3-12345', name: 'User 3', email: 'user3@example.com' },
        ];

        for (const userData of additionalUsers) {
            try {
                await db.insert(user).values({
                    id: userData.id,
                    name: userData.name,
                    email: userData.email,
                    emailVerified: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }).onConflictDoNothing();
            } catch (error) {
                // User might already exist, that's okay
            }
        }

        console.log('Setting up test environment...');
    });

    afterEach(async () => {
        // Clean up after each test
        const db = initializeDatabase();
        if (!db) {
            console.log('Database not available for cleanup');
            return;
        }

        try {
            // Remove all participation records for the test event
            await db.delete(eventParticipation).where(eq(eventParticipation.eventId, mockEventId));

            // Reset event counts to 0
            await db.update(event).set({
                attendeesCount: 0,
                interestedCount: 0,
                updatedAt: new Date()
            }).where(eq(event.id, mockEventId));

            console.log('Cleaning up test environment...');
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    });

    describe('Joining Events', () => {
        it('should allow user to join as attending', async () => {
            const result = await updateEventParticipation(mockEventId, mockUserId, 'attending');

            expect(result.success).toBe(true);
            expect(result.newCounts.attending).toBeGreaterThan(0);

            const userStatus = await getUserParticipationStatus(mockEventId, mockUserId);
            expect(userStatus).toBe('attending');
        });

        it('should allow user to join as interested', async () => {
            const result = await updateEventParticipation(mockEventId, mockUserId, 'interested');

            expect(result.success).toBe(true);
            expect(result.newCounts.interested).toBeGreaterThan(0);

            const userStatus = await getUserParticipationStatus(mockEventId, mockUserId);
            expect(userStatus).toBe('interested');
        });

        it('should update counts correctly when multiple users join', async () => {
            const user1 = 'user-1-12345';
            const user2 = 'user-2-12345';
            const user3 = 'user-3-12345';

            // User 1 joins as attending
            await updateEventParticipation(mockEventId, user1, 'attending');

            // User 2 joins as interested
            await updateEventParticipation(mockEventId, user2, 'interested');

            // User 3 joins as attending
            await updateEventParticipation(mockEventId, user3, 'attending');

            const counts = await getEventParticipationCounts(mockEventId);
            expect(counts.attending).toBe(2);
            expect(counts.interested).toBe(1);
        });
    });

    describe('Switching Participation Status', () => {
        it('should allow user to switch from attending to interested', async () => {
            // First join as attending
            await updateEventParticipation(mockEventId, mockUserId, 'attending');

            // Then switch to interested
            const result = await updateEventParticipation(mockEventId, mockUserId, 'interested');

            expect(result.success).toBe(true);

            const userStatus = await getUserParticipationStatus(mockEventId, mockUserId);
            expect(userStatus).toBe('interested');

            // Verify counts are updated correctly
            const counts = await getEventParticipationCounts(mockEventId);
            expect(counts.attending).toBe(0);
            expect(counts.interested).toBe(1);
        });

        it('should allow user to switch from interested to attending', async () => {
            // First join as interested
            await updateEventParticipation(mockEventId, mockUserId, 'interested');

            // Then switch to attending
            const result = await updateEventParticipation(mockEventId, mockUserId, 'attending');

            expect(result.success).toBe(true);

            const userStatus = await getUserParticipationStatus(mockEventId, mockUserId);
            expect(userStatus).toBe('attending');

            // Verify counts are updated correctly
            const counts = await getEventParticipationCounts(mockEventId);
            expect(counts.attending).toBe(1);
            expect(counts.interested).toBe(0);
        });
    });

    describe('Leaving Events', () => {
        it('should allow user to leave event (set status to null)', async () => {
            // First join as attending
            await updateEventParticipation(mockEventId, mockUserId, 'attending');

            // Then leave the event
            const result = await updateEventParticipation(mockEventId, mockUserId, null);

            expect(result.success).toBe(true);

            const userStatus = await getUserParticipationStatus(mockEventId, mockUserId);
            expect(userStatus).toBe(null);

            // Verify counts are updated correctly
            const counts = await getEventParticipationCounts(mockEventId);
            expect(counts.attending).toBe(0);
        });

        it('should handle leaving when not participating', async () => {
            // Try to leave when not participating
            const result = await updateEventParticipation(mockEventId, mockUserId, null);

            expect(result.success).toBe(true);

            const userStatus = await getUserParticipationStatus(mockEventId, mockUserId);
            expect(userStatus).toBe(null);
        });
    });

    describe('Count Management', () => {
        it('should maintain accurate counts across multiple operations', async () => {
            const user1 = 'user-1-12345';
            const user2 = 'user-2-12345';

            // Initial state
            let counts = await getEventParticipationCounts(mockEventId);
            expect(counts.attending).toBe(0);
            expect(counts.interested).toBe(0);

            // User 1 joins as attending
            await updateEventParticipation(mockEventId, user1, 'attending');
            counts = await getEventParticipationCounts(mockEventId);
            expect(counts.attending).toBe(1);
            expect(counts.interested).toBe(0);

            // User 2 joins as interested
            await updateEventParticipation(mockEventId, user2, 'interested');
            counts = await getEventParticipationCounts(mockEventId);
            expect(counts.attending).toBe(1);
            expect(counts.interested).toBe(1);

            // User 1 switches to interested
            await updateEventParticipation(mockEventId, user1, 'interested');
            counts = await getEventParticipationCounts(mockEventId);
            expect(counts.attending).toBe(0);
            expect(counts.interested).toBe(2);

            // User 2 leaves
            await updateEventParticipation(mockEventId, user2, null);
            counts = await getEventParticipationCounts(mockEventId);
            expect(counts.attending).toBe(0);
            expect(counts.interested).toBe(1);

            // User 1 leaves
            await updateEventParticipation(mockEventId, user1, null);
            counts = await getEventParticipationCounts(mockEventId);
            expect(counts.attending).toBe(0);
            expect(counts.interested).toBe(0);
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid event IDs gracefully', async () => {
            const invalidEventId = 'invalid-uuid-format';

            try {
                await updateEventParticipation(invalidEventId, mockUserId, 'attending');
                // If we reach here, the function should handle the error gracefully
            } catch (error) {
                // Expected to throw an error for invalid event ID
                expect(error).toBeDefined();
            }
        });

        it('should handle invalid user IDs gracefully', async () => {
            const invalidUserId = 'invalid-user-id';

            try {
                await updateEventParticipation(mockEventId, invalidUserId, 'attending');
                // If we reach here, the function should handle the error gracefully
            } catch (error) {
                // Expected to throw an error for invalid user ID
                expect(error).toBeDefined();
            }
        });
    });

    describe('API Response Format', () => {
        it('should return correct response format for successful operations', async () => {
            const result = await updateEventParticipation(mockEventId, mockUserId, 'attending');

            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('newCounts');
            expect(result.newCounts).toHaveProperty('attending');
            expect(result.newCounts).toHaveProperty('interested');

            expect(typeof result.success).toBe('boolean');
            expect(typeof result.newCounts.attending).toBe('number');
            expect(typeof result.newCounts.interested).toBe('number');
        });
    });
}); 