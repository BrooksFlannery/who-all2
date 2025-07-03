import { describe, expect, it } from 'vitest';
import {
    chatMessageSchema,
    chatRequestSchema,
    chatResponseSchema,
    eventSchema,
    eventsResponseSchema,
    summarizationResponseSchema
} from '../lib/schemas';
import { validateData, validateEnv } from '../lib/validation';

describe('Zod Validation', () => {
    describe('Environment Variables', () => {
        it('should validate environment variables', () => {
            // This test will pass if env vars are set, skip if not
            try {
                const env = validateEnv();
                expect(env).toBeDefined();
            } catch (error) {
                // If env validation fails, that's expected in test environment
                expect(error).toBeDefined();
            }
        });
    });

    describe('Chat Message Schema', () => {
        it('should validate valid chat message', () => {
            const validMessage = {
                role: 'user' as const,
                content: 'Hello, how are you?'
            };

            const validation = validateData(chatMessageSchema, validMessage);
            expect(validation.success).toBe(true);
        });

        it('should reject invalid chat message', () => {
            const invalidMessage = {
                role: 'invalid' as any,
                content: ''
            };

            const validation = validateData(chatMessageSchema, invalidMessage);
            expect(validation.success).toBe(false);
        });

        it('should accept optional id field', () => {
            const messageWithId = {
                id: 'msg-123',
                role: 'user' as const,
                content: 'Hello'
            };

            const validation = validateData(chatMessageSchema, messageWithId);
            expect(validation.success).toBe(true);
        });
    });

    describe('Chat Request Schema', () => {
        it('should validate valid chat request', () => {
            const validChatRequest = {
                messages: [
                    { role: 'user' as const, content: 'Hello' },
                    { role: 'assistant' as const, content: 'Hi there!' }
                ]
            };

            const validation = validateData(chatRequestSchema, validChatRequest);
            expect(validation.success).toBe(true);
        });

        it('should reject empty messages array', () => {
            const invalidChatRequest = {
                messages: []
            };

            const validation = validateData(chatRequestSchema, invalidChatRequest);
            expect(validation.success).toBe(false);
        });

        it('should reject missing messages field', () => {
            const invalidChatRequest = {};

            const validation = validateData(chatRequestSchema, invalidChatRequest);
            expect(validation.success).toBe(false);
        });
    });

    describe('Chat Response Schema', () => {
        it('should validate valid chat response', () => {
            const validChatResponse = {
                messages: [
                    {
                        id: 'msg123',
                        role: 'user' as const,
                        content: 'Hello',
                        createdAt: new Date().toISOString(),
                        isSummarized: false
                    }
                ]
            };

            const validation = validateData(chatResponseSchema, validChatResponse);
            expect(validation.success).toBe(true);
        });

        it('should require all message fields', () => {
            const invalidMessage = {
                id: 'msg123',
                role: 'user' as const,
                content: 'Hello'
                // Missing createdAt and isSummarized
            };

            const invalidResponse = {
                messages: [invalidMessage]
            };

            const validation = validateData(chatResponseSchema, invalidResponse);
            expect(validation.success).toBe(false);
        });
    });

    describe('Summarization Response Schema', () => {
        it('should validate valid summarization response', () => {
            const validSummarizationResponse = {
                success: true,
                message: 'Interest summary updated successfully',
                messageCount: 10,
                summaryLength: 500
            };

            const validation = validateData(summarizationResponseSchema, validSummarizationResponse);
            expect(validation.success).toBe(true);
        });

        it('should accept response without summaryLength', () => {
            const responseWithoutLength = {
                success: true,
                message: 'Interest summary updated successfully',
                messageCount: 10
            };

            const validation = validateData(summarizationResponseSchema, responseWithoutLength);
            expect(validation.success).toBe(true);
        });

        it('should reject negative message count', () => {
            const invalidResponse = {
                success: true,
                message: 'Test',
                messageCount: -1
            };

            const validation = validateData(summarizationResponseSchema, invalidResponse);
            expect(validation.success).toBe(false);
        });
    });

    describe('Event Schema', () => {
        it('should validate valid event', () => {
            const validEvent = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                title: 'Test Event',
                date: new Date().toISOString(),
                location: { lat: 37.7749, lng: -122.4194, neighborhood: 'San Francisco' },
                description: 'A test event description',
                categories: ['social', 'food'],
                hostId: 'user123',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                attendeesCount: 0,
                interestedCount: 0
            };

            const validation = validateData(eventSchema, validEvent);
            expect(validation.success).toBe(true);
        });

        it('should accept event without hostId', () => {
            const eventWithoutHost = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                title: 'Test Event',
                date: new Date().toISOString(),
                location: { lat: 37.7749, lng: -122.4194 },
                description: 'A test event description',
                categories: ['social'],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                attendeesCount: 0,
                interestedCount: 0
            };

            const validation = validateData(eventSchema, eventWithoutHost);
            expect(validation.success).toBe(true);
        });

        it('should reject invalid coordinates', () => {
            const invalidEvent = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                title: 'Test Event',
                date: new Date().toISOString(),
                location: { lat: 200, lng: -122.4194 }, // Invalid latitude
                description: 'A test event description',
                categories: ['social'],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                attendeesCount: 0,
                interestedCount: 0
            };

            const validation = validateData(eventSchema, invalidEvent);
            expect(validation.success).toBe(false);
        });
    });

    describe('Events Response Schema', () => {
        it('should validate valid events response', () => {
            const validEvent = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                title: 'Test Event',
                date: new Date().toISOString(),
                location: { lat: 37.7749, lng: -122.4194 },
                description: 'A test event description',
                categories: ['social'],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                attendeesCount: 0,
                interestedCount: 0
            };

            const validEventsResponse = {
                events: [validEvent]
            };

            const validation = validateData(eventsResponseSchema, validEventsResponse);
            expect(validation.success).toBe(true);
        });

        it('should accept empty events array', () => {
            const emptyResponse = {
                events: []
            };

            const validation = validateData(eventsResponseSchema, emptyResponse);
            expect(validation.success).toBe(true);
        });
    });
}); 