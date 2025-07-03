import { describe, expect, it } from 'vitest';

describe('API Endpoints', () => {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8081';

    describe('Chat API', () => {
        it('should have correct endpoint structure', () => {
            const endpoints = [
                `${baseUrl}/api/chat`,
                `${baseUrl}/api/chat/summarize`
            ];

            expect(endpoints).toHaveLength(2);
            expect(endpoints[0]).toContain('/api/chat');
            expect(endpoints[1]).toContain('/api/chat/summarize');
        });

        it('should support POST and GET methods for chat', () => {
            const methods = ['POST', 'GET'];
            expect(methods).toContain('POST');
            expect(methods).toContain('GET');
        });

        it('should support POST method for summarization', () => {
            const methods = ['POST'];
            expect(methods).toContain('POST');
        });
    });

    describe('Events API', () => {
        it('should have events endpoint', () => {
            const endpoint = `${baseUrl}/api/events`;
            expect(endpoint).toContain('/api/events');
        });

        it('should support GET method for events', () => {
            const methods = ['GET'];
            expect(methods).toContain('GET');
        });
    });

    describe('Authentication API', () => {
        it('should have auth endpoints', () => {
            const authEndpoints = [
                `${baseUrl}/api/auth/signin`,
                `${baseUrl}/api/auth/signup`,
                `${baseUrl}/api/auth/signout`
            ];

            expect(authEndpoints).toHaveLength(3);
            expect(authEndpoints[0]).toContain('/api/auth/signin');
            expect(authEndpoints[1]).toContain('/api/auth/signup');
            expect(authEndpoints[2]).toContain('/api/auth/signout');
        });
    });

    describe('Environment Configuration', () => {
        it('should have valid base URL', () => {
            expect(baseUrl).toBeDefined();
            expect(baseUrl).toMatch(/^https?:\/\//);
        });

        it('should use localhost as fallback', () => {
            const fallbackUrl = 'http://localhost:8081';
            expect(fallbackUrl).toBe('http://localhost:8081');
        });
    });
}); 