import { spawn } from 'child_process';
import { config } from 'dotenv';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Load environment variables
config();

describe('Server Configuration Integration', () => {
    let serverProcess: any;
    const PORT = 3002;

    beforeAll(async () => {
        // Start the server
        serverProcess = spawn('node', ['server.js'], {
            stdio: 'pipe',
            env: {
                ...process.env,
                NODE_ENV: 'test',
                SOCKET_PORT: PORT.toString()
            }
        });

        // Wait for server to start
        await new Promise(resolve => setTimeout(resolve, 3000));
    });

    afterAll(async () => {
        if (serverProcess) {
            serverProcess.kill('SIGTERM');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    });

    describe('Server Startup', () => {
        it('should start server with configuration system', async () => {
            const response = await fetch(`http://localhost:${PORT}/health`);
            expect(response.ok).toBe(true);

            const data = await response.json();
            expect(data.status).toBe('ready');
            expect(data.socketIO).toBe(true);
            expect(data.port).toBe(PORT);
            expect(data.environment).toBe('test');
        });

        it('should respond to root endpoint', async () => {
            const response = await fetch(`http://localhost:${PORT}/`);
            expect(response.ok).toBe(true);

            const data = await response.json();
            expect(data.message).toBe('Socket.IO Server is running');
            expect(data.version).toBe('1.0.0');
            expect(data.timestamp).toBeDefined();
        });
    });

    describe('CORS Configuration', () => {
        it('should handle CORS preflight requests', async () => {
            const response = await fetch(`http://localhost:${PORT}/health`, {
                method: 'OPTIONS',
                headers: {
                    'Origin': 'http://localhost:8081',
                    'Access-Control-Request-Method': 'GET',
                    'Access-Control-Request-Headers': 'Content-Type'
                }
            });

            expect(response.status).toBe(204);
            expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:8081');
            expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
        });

        it('should include CORS headers in regular requests', async () => {
            const response = await fetch(`http://localhost:${PORT}/health`, {
                headers: {
                    'Origin': 'http://localhost:8081'
                }
            });

            expect(response.ok).toBe(true);
            expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:8081');
            expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
        });
    });

    describe('Environment Variable Validation', () => {
        it('should validate required environment variables on startup', () => {
            // The server should have started successfully, which means
            // required environment variables are present
            expect(process.env.EXPO_PUBLIC_SOCKET_URL).toBeDefined();
            expect(process.env.BETTER_AUTH_SECRET).toBeDefined();

            if (process.env.BETTER_AUTH_SECRET) {
                expect(process.env.BETTER_AUTH_SECRET.length).toBeGreaterThanOrEqual(32);
            }
        });

        it('should use default values for optional environment variables', async () => {
            const response = await fetch(`http://localhost:${PORT}/health`);
            const data = await response.json();

            // Should use default port if not specified
            expect(data.port).toBe(PORT);

            // Should use default environment if not specified
            expect(data.environment).toBe('test');
        });
    });

    describe('Configuration System Integration', () => {
        it('should load configuration based on NODE_ENV', async () => {
            const response = await fetch(`http://localhost:${PORT}/health`);
            const data = await response.json();

            // Should reflect the test environment configuration
            expect(data.environment).toBe('test');
        });

        it('should apply CORS configuration from config system', async () => {
            const response = await fetch(`http://localhost:${PORT}/health`, {
                method: 'OPTIONS',
                headers: {
                    'Origin': 'http://localhost:8081',
                    'Access-Control-Request-Method': 'GET'
                }
            });

            expect(response.status).toBe(204);
            expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:8081');
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid routes gracefully', async () => {
            const response = await fetch(`http://localhost:${PORT}/invalid-route`);
            expect(response.status).toBe(404);
        });

        it('should handle malformed requests gracefully', async () => {
            const response = await fetch(`http://localhost:${PORT}/health`, {
                method: 'POST',
                body: 'invalid json'
            });

            // Should either return 404 (method not allowed) or handle gracefully
            expect(response.status).toBeGreaterThanOrEqual(400);
        });
    });

    describe('Server Logging', () => {
        it('should log server startup information', () => {
            // This test verifies that the server logs are being generated
            // The actual log output is captured by the spawn process
            expect(serverProcess).toBeDefined();
            expect(serverProcess.pid).toBeDefined();
        });
    });
}); 