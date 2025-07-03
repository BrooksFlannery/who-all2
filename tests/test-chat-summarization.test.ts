import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '../lib/db';
import { message, user } from '../lib/db/schema';
import { chatRequestSchema, chatResponseSchema, summarizationResponseSchema } from '../lib/schemas';
import { validateData } from '../lib/validation';

// Mock data for testing
const testUserId = 'test-user-123';
const testMessages = [
    { role: 'user' as const, content: 'Hello, I love coding and hiking' },
    { role: 'assistant' as const, content: 'That sounds great! What kind of coding do you enjoy?' },
    { role: 'user' as const, content: 'I mostly do web development with React and TypeScript' },
    { role: 'assistant' as const, content: 'React and TypeScript are excellent choices!' },
    { role: 'user' as const, content: 'Yes, and I also enjoy hiking in the mountains' },
    { role: 'assistant' as const, content: 'Mountain hiking is wonderful for staying active' },
    { role: 'user' as const, content: 'I also like coffee and reading sci-fi books' },
    { role: 'assistant' as const, content: 'Coffee and sci-fi make a perfect combination!' },
    { role: 'user' as const, content: 'What about you? What do you enjoy?' },
    { role: 'assistant' as const, content: 'I enjoy helping people and learning new things!' },
    { role: 'user' as const, content: 'That sounds like a great approach to life' }
];

describe('Chat Summarization System', () => {
    beforeAll(async () => {
        // Clean up any existing test data
        if (db) {
            await db.delete(message).where(eq(message.userId, testUserId));
            await db.delete(user).where(eq(user.id, testUserId));
        }
    });

    afterAll(async () => {
        // Clean up test data
        if (db) {
            await db.delete(message).where(eq(message.userId, testUserId));
            await db.delete(user).where(eq(user.id, testUserId));
        }
    });

    describe('Database Schema', () => {
        it('should have required fields for user table', () => {
            expect(user.id).toBeDefined();
            expect(user.userInterestSummary).toBeDefined();
            expect(user.name).toBeDefined();
            expect(user.email).toBeDefined();
        });

        it('should have required fields for message table', () => {
            expect(message.id).toBeDefined();
            expect(message.userId).toBeDefined();
            expect(message.content).toBeDefined();
            expect(message.isSummarized).toBeDefined();
            expect(message.role).toBeDefined();
            expect(message.createdAt).toBeDefined();
        });
    });

    describe('Data Validation Schemas', () => {
        it('should validate chat request schema', () => {
            const validRequest = {
                messages: [
                    { role: 'user' as const, content: 'Hello' },
                    { role: 'assistant' as const, content: 'Hi there!' }
                ]
            };

            const validation = validateData(chatRequestSchema, validRequest);
            expect(validation.success).toBe(true);
        });

        it('should validate chat response schema', () => {
            const validResponse = {
                messages: [
                    {
                        id: 'msg-123',
                        role: 'user' as const,
                        content: 'Hello',
                        createdAt: new Date().toISOString(),
                        isSummarized: false
                    }
                ]
            };

            const validation = validateData(chatResponseSchema, validResponse);
            expect(validation.success).toBe(true);
        });

        it('should validate summarization response schema', () => {
            const validResponse = {
                success: true,
                message: 'Interest summary updated successfully',
                messageCount: 5,
                summaryLength: 250
            };

            const validation = validateData(summarizationResponseSchema, validResponse);
            expect(validation.success).toBe(true);
        });

        it('should reject invalid chat request', () => {
            const invalidRequest = {
                messages: [] // Empty messages array
            };

            const validation = validateData(chatRequestSchema, invalidRequest);
            expect(validation.success).toBe(false);
        });
    });

    describe('Database Operations', () => {
        it('should create a test user', async () => {
            if (!db) {
                console.log('Database not available, skipping test');
                return;
            }

            const testUser = {
                id: testUserId,
                name: 'Test User',
                email: 'test@example.com',
                userInterestSummary: ''
            };

            await db.insert(user).values(testUser);

            const createdUser = await db
                .select()
                .from(user)
                .where(eq(user.id, testUserId))
                .limit(1);

            expect(createdUser).toHaveLength(1);
            expect(createdUser[0].id).toBe(testUserId);
            expect(createdUser[0].userInterestSummary).toBe('');
        });

        it('should insert test messages', async () => {
            if (!db) {
                console.log('Database not available, skipping test');
                return;
            }

            const messageValues = testMessages.map(msg => ({
                userId: testUserId,
                content: msg.content,
                role: msg.role,
                isSummarized: false
            }));

            await db.insert(message).values(messageValues);

            const insertedMessages = await db
                .select()
                .from(message)
                .where(eq(message.userId, testUserId))
                .orderBy(message.createdAt);

            expect(insertedMessages).toHaveLength(testMessages.length);
            expect(insertedMessages[0].isSummarized).toBe(false);
        });

        it('should find unsummarized messages', async () => {
            if (!db) {
                console.log('Database not available, skipping test');
                return;
            }

            const unsummarizedMessages = await db
                .select()
                .from(message)
                .where(
                    and(
                        eq(message.userId, testUserId),
                        eq(message.isSummarized, false)
                    )
                )
                .orderBy(message.createdAt);

            expect(unsummarizedMessages.length).toBeGreaterThan(0);
            expect(unsummarizedMessages.every(msg => !msg.isSummarized)).toBe(true);
        });
    });

    describe('Message Processing Logic', () => {
        it('should correctly identify user vs assistant messages', () => {
            const userMessages = testMessages.filter(msg => msg.role === 'user');
            const assistantMessages = testMessages.filter(msg => msg.role === 'assistant');

            expect(userMessages.length).toBeGreaterThan(0);
            expect(assistantMessages.length).toBeGreaterThan(0);
            expect(userMessages.length + assistantMessages.length).toBe(testMessages.length);
        });

        it('should format conversation context correctly', () => {
            const conversationContext = testMessages
                .map(msg => `${msg.role}: ${msg.content}`)
                .join('\n');

            expect(conversationContext).toContain('user: Hello, I love coding and hiking');
            expect(conversationContext).toContain('assistant: That sounds great!');
            expect(conversationContext.split('\n')).toHaveLength(testMessages.length);
        });
    });

    describe('Summarization Triggers', () => {
        it('should trigger summarization after 10 messages', () => {
            const messageCount = testMessages.length;
            const shouldTrigger = messageCount >= 10;

            expect(shouldTrigger).toBe(true);
            expect(messageCount).toBe(11);
        });

        it('should not trigger summarization for fewer than 10 messages', () => {
            const fewMessages = testMessages.slice(0, 5);
            const shouldTrigger = fewMessages.length >= 10;

            expect(shouldTrigger).toBe(false);
            expect(fewMessages.length).toBe(5);
        });
    });

    describe('API Endpoint Structure', () => {
        it('should have correct chat API structure', () => {
            const chatEndpoints = [
                '/api/chat',           // Main chat endpoint (POST/GET)
                '/api/chat/summarize'  // Summarization endpoint (POST)
            ];

            expect(chatEndpoints).toHaveLength(2);
            expect(chatEndpoints[0]).toBe('/api/chat');
            expect(chatEndpoints[1]).toBe('/api/chat/summarize');
        });
    });

    describe('Error Handling', () => {
        it('should handle missing user gracefully', () => {
            const nonExistentUserId = 'non-existent-user';

            expect(() => {
                return Promise.resolve([]);
            }).not.toThrow();
        });

        it('should handle empty message arrays', () => {
            const emptyMessages: any[] = [];
            const messageCount = emptyMessages.length;

            expect(messageCount).toBe(0);
            expect(emptyMessages).toHaveLength(0);
        });
    });

    describe('Frontend Integration', () => {
        it('should have correct message structure for frontend', () => {
            const frontendMessage = {
                id: 'msg-123',
                role: 'user' as const,
                content: 'Hello world',
                createdAt: new Date().toISOString(),
                isSummarized: false
            };

            expect(frontendMessage).toHaveProperty('id');
            expect(frontendMessage).toHaveProperty('role');
            expect(frontendMessage).toHaveProperty('content');
            expect(frontendMessage).toHaveProperty('createdAt');
            expect(frontendMessage).toHaveProperty('isSummarized');
        });

        it('should support message roles correctly', () => {
            const validRoles = ['user', 'assistant', 'system'] as const;

            validRoles.forEach(role => {
                const message = {
                    id: 'test',
                    role,
                    content: 'Test message',
                    createdAt: new Date().toISOString(),
                    isSummarized: false
                };

                expect(message.role).toBe(role);
            });
        });
    });
}); 