import axios from 'axios';
import { beforeAll, describe, expect, it } from 'vitest';

describe('Socket.IO Server Dependencies', () => {
    const SOCKET_URL = 'http://localhost:3001';
    const EXPO_URL = 'http://localhost:8081';

    beforeAll(async () => {
        // Wait for servers to be ready
        await new Promise(resolve => setTimeout(resolve, 2000));
    });

    describe('Express Server', () => {
        it('should start and respond to health check', async () => {
            const response = await axios.get(`${SOCKET_URL}/health`);
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('status', 'ready');
            expect(response.data).toHaveProperty('socketIO', true);
            expect(response.data).toHaveProperty('timestamp');
            expect(response.data).toHaveProperty('port', 3001);
            expect(response.data).toHaveProperty('environment', 'development');
        });

        it('should respond to root endpoint', async () => {
            const response = await axios.get(SOCKET_URL);
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('message', 'Socket.IO Server is running');
            expect(response.data).toHaveProperty('version', '1.0.0');
            expect(response.data).toHaveProperty('timestamp');
        });
    });

    describe('CORS Configuration', () => {
        it('should allow requests from Expo client', async () => {
            const response = await axios.get(`${SOCKET_URL}/health`, {
                headers: {
                    'Origin': 'http://localhost:8081'
                }
            });
            expect(response.status).toBe(200);
            expect(response.headers['access-control-allow-origin']).toBe('http://localhost:8081');
        });

        it('should handle preflight requests', async () => {
            const response = await axios.options(`${SOCKET_URL}/health`, {
                headers: {
                    'Origin': 'http://localhost:8081',
                    'Access-Control-Request-Method': 'GET',
                    'Access-Control-Request-Headers': 'Content-Type'
                }
            });
            expect(response.status).toBe(204);
            expect(response.headers['access-control-allow-origin']).toBe('http://localhost:8081');
        });
    });

    describe('Socket.IO Integration', () => {
        it('should have Socket.IO server ready', async () => {
            const response = await axios.get(`${SOCKET_URL}/health`);
            expect(response.data.socketIO).toBe(true);
        });

        it('should accept WebSocket connections', async () => {
            // This test verifies that the Socket.IO server is properly initialized
            // The actual WebSocket connection test will be in a separate integration test
            const response = await axios.get(`${SOCKET_URL}/health`);
            expect(response.data.socketIO).toBe(true);
        });
    });

    describe('Environment Configuration', () => {
        it('should use correct port from environment', async () => {
            const response = await axios.get(`${SOCKET_URL}/health`);
            expect(response.data.port).toBe(3001);
        });

        it('should use correct environment mode', async () => {
            const response = await axios.get(`${SOCKET_URL}/health`);
            expect(response.data.environment).toBe('development');
        });
    });

    describe('Concurrent Server Operation', () => {
        it('should have both servers running', async () => {
            // Test Socket.IO server
            const socketResponse = await axios.get(`${SOCKET_URL}/health`);
            expect(socketResponse.status).toBe(200);

            // Test Expo server
            const expoResponse = await axios.get(EXPO_URL);
            expect(expoResponse.status).toBe(200);
            expect(expoResponse.data).toContain('<!DOCTYPE html>');
        });
    });

    describe('Error Handling', () => {
        it('should handle 404 gracefully', async () => {
            try {
                await axios.get(`${SOCKET_URL}/nonexistent`);
                expect.fail('Should have thrown an error');
            } catch (error: any) {
                expect(error.response.status).toBe(404);
            }
        });
    });
}); 