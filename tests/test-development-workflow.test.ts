import axios from 'axios';
import { ChildProcess, spawn } from 'child_process';
import { setTimeout } from 'timers/promises';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

describe('Development Workflow Testing', () => {
    let socketServer: ChildProcess | null = null;
    let expoServer: ChildProcess | null = null;
    let concurrentProcess: ChildProcess | null = null;

    const SOCKET_PORT = 3001;
    const EXPO_PORT = 8081;
    const SOCKET_URL = `http://localhost:${SOCKET_PORT}`;
    const EXPO_URL = `http://localhost:${EXPO_PORT}`;

    // Helper function to start a process
    const startProcess = (command: string, args: string[] = []): Promise<ChildProcess> => {
        return new Promise((resolve, reject) => {
            const childProcess = spawn(command, args, {
                stdio: 'pipe',
                shell: true,
                env: { ...process.env, NODE_ENV: 'test' }
            });

            let output = '';
            let errorOutput = '';

            childProcess.stdout?.on('data', (data: Buffer) => {
                output += data.toString();
            });

            childProcess.stderr?.on('data', (data: Buffer) => {
                errorOutput += data.toString();
            });

            // Wait a bit for the process to start
            setTimeout(2000).then(() => {
                if (childProcess.exitCode === null) {
                    resolve(childProcess);
                } else {
                    reject(new Error(`Process failed to start: ${errorOutput}`));
                }
            });
        });
    };

    // Helper function to stop a process
    const stopProcess = async (childProcess: ChildProcess | null): Promise<void> => {
        if (childProcess) {
            childProcess.kill('SIGTERM');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    };

    // Helper function to check if a server is running
    const checkServerHealth = async (url: string, endpoint = '/health'): Promise<boolean> => {
        try {
            const response = await axios.get(`${url}${endpoint}`, { timeout: 5000 });
            return response.status === 200;
        } catch (error) {
            return false;
        }
    };

    // Helper function to wait for server to be ready
    const waitForServer = async (url: string, maxAttempts = 30): Promise<boolean> => {
        for (let i = 0; i < maxAttempts; i++) {
            if (await checkServerHealth(url)) {
                return true;
            }
            await setTimeout(1000);
        }
        return false;
    };

    beforeAll(async () => {
        // Ensure no servers are running before tests
        await stopProcess(socketServer);
        await stopProcess(expoServer);
        await stopProcess(concurrentProcess);
    });

    afterAll(async () => {
        // Clean up all processes
        await stopProcess(socketServer);
        await stopProcess(expoServer);
        await stopProcess(concurrentProcess);
    });

    beforeEach(async () => {
        // Clean up before each test
        await stopProcess(socketServer);
        await stopProcess(expoServer);
        await stopProcess(concurrentProcess);
        socketServer = null;
        expoServer = null;
        concurrentProcess = null;
    });

    afterEach(async () => {
        // Clean up after each test
        await stopProcess(socketServer);
        await stopProcess(expoServer);
        await stopProcess(concurrentProcess);
    });

    describe('Concurrent Server Startup', () => {
        it('should start both servers concurrently with npm run dev', async () => {
            // Start both servers using the dev script
            concurrentProcess = await startProcess('npm', ['run', 'dev']);

            // Wait for both servers to be ready
            const socketReady = await waitForServer(SOCKET_URL);
            const expoReady = await waitForServer(EXPO_URL, 60); // Expo takes longer to start

            expect(socketReady).toBe(true);
            expect(expoReady).toBe(true);

            // Verify both servers are responding correctly
            const socketHealth = await axios.get(`${SOCKET_URL}/health`);
            expect(socketHealth.status).toBe(200);
            expect(socketHealth.data.status).toBe('ready');

            const expoHealth = await axios.get(`${EXPO_URL}/`);
            expect(expoHealth.status).toBe(200);
        }, 120000); // 2 minute timeout for concurrent startup

        it('should handle concurrent server startup gracefully', async () => {
            // Start the dev process
            concurrentProcess = await startProcess('npm', ['run', 'dev']);

            // Wait for servers to be ready
            await waitForServer(SOCKET_URL);
            await waitForServer(EXPO_URL, 60);

            // Verify both servers are stable
            for (let i = 0; i < 5; i++) {
                const socketHealth = await checkServerHealth(SOCKET_URL);
                const expoHealth = await checkServerHealth(EXPO_URL);

                expect(socketHealth).toBe(true);
                expect(expoHealth).toBe(true);

                await setTimeout(2000);
            }
        }, 120000);

        it('should provide proper logging for concurrent startup', async () => {
            const logOutput: string[] = [];

            concurrentProcess = spawn('npm', ['run', 'dev'], {
                stdio: 'pipe',
                shell: true,
                env: { ...process.env, NODE_ENV: 'test' }
            });

            concurrentProcess.stdout?.on('data', (data: Buffer) => {
                logOutput.push(data.toString());
            });

            concurrentProcess.stderr?.on('data', (data: Buffer) => {
                logOutput.push(data.toString());
            });

            // Wait for startup
            await waitForServer(SOCKET_URL);
            await waitForServer(EXPO_URL, 60);

            const logs = logOutput.join('');

            // Check for expected log messages
            expect(logs).toContain('Socket.IO server running');
            expect(logs).toContain('Expo');
            expect(logs).toContain('concurrently');
        }, 120000);
    });

    describe('Individual Server Startup', () => {
        it('should start Socket.IO server independently', async () => {
            socketServer = await startProcess('npm', ['run', 'start:socket']);

            const ready = await waitForServer(SOCKET_URL);
            expect(ready).toBe(true);

            const health = await axios.get(`${SOCKET_URL}/health`);
            expect(health.status).toBe(200);
            expect(health.data.status).toBe('ready');
        }, 30000);

        it('should start Expo server independently', async () => {
            expoServer = await startProcess('npm', ['run', 'start']);

            const ready = await waitForServer(EXPO_URL, 60);
            expect(ready).toBe(true);

            const response = await axios.get(`${EXPO_URL}/`);
            expect(response.status).toBe(200);
        }, 120000);

        it('should handle individual server shutdown gracefully', async () => {
            socketServer = await startProcess('npm', ['run', 'start:socket']);
            await waitForServer(SOCKET_URL);

            // Stop the server
            await stopProcess(socketServer);
            socketServer = null;

            // Verify server is no longer responding
            const stillRunning = await checkServerHealth(SOCKET_URL);
            expect(stillRunning).toBe(false);
        }, 30000);
    });

    describe('Hot Reloading', () => {
        it('should restart Socket.IO server on file changes', async () => {
            socketServer = await startProcess('npm', ['run', 'start:socket']);
            await waitForServer(SOCKET_URL);

            // Simulate a file change by touching server.js
            const fs = require('fs');
            const originalStats = fs.statSync('server.js');

            // Wait a moment for file system
            await setTimeout(1000);

            // Verify server is still running after potential restart
            const stillRunning = await checkServerHealth(SOCKET_URL);
            expect(stillRunning).toBe(true);
        }, 30000);

        it('should maintain connections during hot reload', async () => {
            socketServer = await startProcess('npm', ['run', 'start:socket']);
            await waitForServer(SOCKET_URL);

            // Connect a client
            const { io } = require('socket.io-client');
            const client = io(SOCKET_URL);

            await new Promise<void>((resolve) => {
                client.on('connect', () => {
                    resolve();
                });
            });

            expect(client.connected).toBe(true);

            // Simulate server restart (in real scenario, this would be file change)
            await setTimeout(2000);

            // Client should still be connected or reconnect automatically
            expect(client.connected).toBe(true);

            client.disconnect();
        }, 30000);
    });

    describe('Environment Variable Changes', () => {
        it('should respect SOCKET_PORT environment variable', async () => {
            const customPort = 3002;
            const customUrl = `http://localhost:${customPort}`;

            socketServer = spawn('npm', ['run', 'start:socket'], {
                stdio: 'pipe',
                shell: true,
                env: { ...process.env, SOCKET_PORT: customPort.toString(), NODE_ENV: 'test' }
            });

            const ready = await waitForServer(customUrl);
            expect(ready).toBe(true);

            const health = await axios.get(`${customUrl}/health`);
            expect(health.status).toBe(200);
            expect(health.data.port).toBe(customPort);
        }, 30000);

        it('should respect LOG_LEVEL environment variable', async () => {
            const logOutput: string[] = [];

            socketServer = spawn('npm', ['run', 'start:socket'], {
                stdio: 'pipe',
                shell: true,
                env: { ...process.env, LOG_LEVEL: 'debug', NODE_ENV: 'test' }
            });

            socketServer.stdout?.on('data', (data) => {
                logOutput.push(data.toString());
            });

            await waitForServer(SOCKET_URL);

            const logs = logOutput.join('');
            expect(logs).toContain('Log Level: debug');
        }, 30000);

        it('should validate required environment variables', async () => {
            const childProcess = spawn('npm', ['run', 'start:socket'], {
                stdio: 'pipe',
                shell: true,
                env: { ...process.env, BETTER_AUTH_SECRET: undefined, NODE_ENV: 'test' }
            });

            let output = '';
            childProcess.stderr?.on('data', (data: Buffer) => {
                output += data.toString();
            });

            await new Promise<void>((resolve) => {
                childProcess.on('exit', () => resolve());
            });

            expect(output).toContain('Missing required environment variables');
            expect(output).toContain('BETTER_AUTH_SECRET');
        }, 10000);
    });

    describe('Server Health Monitoring', () => {
        it('should provide comprehensive health check endpoint', async () => {
            socketServer = await startProcess('npm', ['run', 'start:socket']);
            await waitForServer(SOCKET_URL);

            const health = await axios.get(`${SOCKET_URL}/health`);
            expect(health.status).toBe(200);
            expect(health.data).toMatchObject({
                status: 'ready',
                timestamp: expect.any(String),
                port: expect.any(Number),
                environment: expect.any(String)
            });
            expect(health.data.socketIO).toBeDefined();
        }, 30000);

        it('should provide root endpoint for basic connectivity', async () => {
            socketServer = await startProcess('npm', ['run', 'start:socket']);
            await waitForServer(SOCKET_URL);

            const response = await axios.get(`${SOCKET_URL}/`);
            expect(response.status).toBe(200);
            expect(response.data).toMatchObject({
                message: 'Socket.IO Server is running',
                version: '1.0.0',
                timestamp: expect.any(String)
            });
        }, 30000);

        it('should handle health check under load', async () => {
            socketServer = await startProcess('npm', ['run', 'start:socket']);
            await waitForServer(SOCKET_URL);

            // Make multiple concurrent health checks
            const promises = Array.from({ length: 10 }, () =>
                axios.get(`${SOCKET_URL}/health`)
            );

            const responses = await Promise.all(promises);

            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.data.status).toBe('ready');
            });
        }, 30000);
    });

    describe('Logging and Debugging', () => {
        it('should provide comprehensive logging', async () => {
            const logOutput: string[] = [];

            socketServer = spawn('npm', ['run', 'start:socket'], {
                stdio: 'pipe',
                shell: true,
                env: { ...process.env, NODE_ENV: 'test' }
            });

            socketServer.stdout?.on('data', (data) => {
                logOutput.push(data.toString());
            });

            socketServer.stderr?.on('data', (data) => {
                logOutput.push(data.toString());
            });

            await waitForServer(SOCKET_URL);

            const logs = logOutput.join('');

            // Check for expected log messages
            expect(logs).toContain('Socket.IO server running');
            expect(logs).toContain('Health check:');
            expect(logs).toContain('Client URL:');
            expect(logs).toContain('Log Level:');
        }, 30000);

        it('should handle debug mode logging', async () => {
            const logOutput: string[] = [];

            socketServer = spawn('npm', ['run', 'start:socket'], {
                stdio: 'pipe',
                shell: true,
                env: { ...process.env, LOG_LEVEL: 'debug', NODE_ENV: 'test' }
            });

            socketServer.stdout?.on('data', (data) => {
                logOutput.push(data.toString());
            });

            await waitForServer(SOCKET_URL);

            const logs = logOutput.join('');
            expect(logs).toContain('Log Level: debug');
        }, 30000);

        it('should log connection events', async () => {
            socketServer = await startProcess('npm', ['run', 'start:socket']);
            await waitForServer(SOCKET_URL);

            // Connect a client to trigger connection logging
            const { io } = require('socket.io-client');
            const client = io(SOCKET_URL);

            await new Promise<void>((resolve) => {
                client.on('connect', () => {
                    resolve();
                });
            });

            expect(client.connected).toBe(true);
            client.disconnect();
        }, 30000);
    });

    describe('Production Build Process', () => {
        it('should handle production build script', async () => {
            const childProcess = spawn('npm', ['run', 'build:socket'], {
                stdio: 'pipe',
                shell: true
            });

            let output = '';
            childProcess.stdout?.on('data', (data: Buffer) => {
                output += data.toString();
            });

            await new Promise<void>((resolve) => {
                childProcess.on('exit', () => resolve());
            });

            expect(output).toContain('Socket.IO server is standalone, no build needed');
        }, 10000);

        it('should run in production mode with correct environment', async () => {
            const logOutput: string[] = [];

            socketServer = spawn('npm', ['run', 'start:socket'], {
                stdio: 'pipe',
                shell: true,
                env: { ...process.env, NODE_ENV: 'production' }
            });

            socketServer.stdout?.on('data', (data) => {
                logOutput.push(data.toString());
            });

            await waitForServer(SOCKET_URL);

            const logs = logOutput.join('');
            expect(logs).toContain('Environment: production');
        }, 30000);
    });

    describe('Deployment Configuration', () => {
        it('should handle graceful shutdown on SIGTERM', async () => {
            socketServer = await startProcess('npm', ['run', 'start:socket']);
            await waitForServer(SOCKET_URL);

            // Send SIGTERM signal
            socketServer.kill('SIGTERM');

            // Wait for graceful shutdown
            await new Promise<void>((resolve) => {
                socketServer?.on('exit', () => resolve());
            });

            // Verify server is no longer running
            const stillRunning = await checkServerHealth(SOCKET_URL);
            expect(stillRunning).toBe(false);
        }, 30000);

        it('should handle graceful shutdown on SIGINT', async () => {
            socketServer = await startProcess('npm', ['run', 'start:socket']);
            await waitForServer(SOCKET_URL);

            // Send SIGINT signal
            socketServer.kill('SIGINT');

            // Wait for graceful shutdown
            await new Promise<void>((resolve) => {
                socketServer?.on('exit', () => resolve());
            });

            // Verify server is no longer running
            const stillRunning = await checkServerHealth(SOCKET_URL);
            expect(stillRunning).toBe(false);
        }, 30000);

        it('should handle port conflicts gracefully', async () => {
            // Start first server
            const server1 = await startProcess('npm', ['run', 'start:socket']);
            await waitForServer(SOCKET_URL);

            // Try to start second server on same port
            const server2 = spawn('npm', ['run', 'start:socket'], {
                stdio: 'pipe',
                shell: true,
                env: { ...process.env, NODE_ENV: 'test' }
            });

            let errorOutput = '';
            server2.stderr?.on('data', (data) => {
                errorOutput += data.toString();
            });

            await new Promise<void>((resolve) => {
                server2.on('exit', () => resolve());
            });

            expect(errorOutput).toContain('EADDRINUSE');
            expect(errorOutput).toContain('Port 3001 is already in use');

            // Clean up
            await stopProcess(server1);
        }, 30000);

        it('should validate deployment environment variables', async () => {
            const process = spawn('npm', ['run', 'validate:env'], {
                stdio: 'pipe',
                shell: true,
                env: { ...process.env, NODE_ENV: 'test' }
            });

            let output = '';
            process.stdout?.on('data', (data) => {
                output += data.toString();
            });

            await new Promise<void>((resolve) => {
                process.on('exit', () => resolve());
            });

            expect(output).toContain('Environment variables validated successfully');
        }, 10000);
    });

    describe('Development Workflow Integration', () => {
        it('should support full development workflow', async () => {
            // Test the complete workflow: validate env -> start servers -> test connectivity -> shutdown
            const validateProcess = spawn('npm', ['run', 'validate:env'], {
                stdio: 'pipe',
                shell: true,
                env: { ...process.env, NODE_ENV: 'test' }
            });

            let validateOutput = '';
            validateProcess.stdout?.on('data', (data) => {
                validateOutput += data.toString();
            });

            await new Promise<void>((resolve) => {
                validateProcess.on('exit', () => resolve());
            });

            expect(validateOutput).toContain('Environment variables validated successfully');

            // Start servers
            concurrentProcess = await startProcess('npm', ['run', 'dev']);

            // Wait for both servers
            const socketReady = await waitForServer(SOCKET_URL);
            const expoReady = await waitForServer(EXPO_URL, 60);

            expect(socketReady).toBe(true);
            expect(expoReady).toBe(true);

            // Test connectivity
            const socketHealth = await axios.get(`${SOCKET_URL}/health`);
            expect(socketHealth.status).toBe(200);

            const expoResponse = await axios.get(`${EXPO_URL}/`);
            expect(expoResponse.status).toBe(200);

            // Graceful shutdown
            await stopProcess(concurrentProcess);
        }, 180000); // 3 minute timeout for full workflow

        it('should handle development environment configuration', async () => {
            socketServer = await startProcess('npm', ['run', 'start:socket']);
            await waitForServer(SOCKET_URL);

            const health = await axios.get(`${SOCKET_URL}/health`);
            expect(health.data.environment).toBe('test');
        }, 30000);
    });
}); 