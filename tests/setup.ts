import axios from 'axios';
import { ChildProcess, spawn } from 'child_process';
import { afterAll, beforeAll } from 'vitest';

let socketServer: ChildProcess | null = null;
let expoServer: ChildProcess | null = null;

const SOCKET_URL = 'http://localhost:3001';
const EXPO_URL = 'http://localhost:8081';

// Wait for server to be ready
async function waitForServer(url: string, timeout = 30000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        try {
            await axios.get(url);
            return;
        } catch (error) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    throw new Error(`Server at ${url} did not start within ${timeout}ms`);
}

// Start Socket.IO server
async function startSocketServer(): Promise<void> {
    if (socketServer) return;

    console.log('Starting Socket.IO server...');
    socketServer = spawn('npm', ['run', 'start:socket'], {
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'test' }
    });

    // Wait for server to start
    await waitForServer(SOCKET_URL);
    console.log('Socket.IO server started');
}

// Start Expo server
async function startExpoServer(): Promise<void> {
    if (expoServer) return;

    console.log('Starting Expo server...');
    expoServer = spawn('npm', ['start'], {
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'test' }
    });

    // Wait for server to start
    await waitForServer(EXPO_URL);
    console.log('Expo server started');
}

// Stop servers
async function stopServers(): Promise<void> {
    if (socketServer) {
        console.log('Stopping Socket.IO server...');
        socketServer.kill('SIGTERM');
        socketServer = null;
    }

    if (expoServer) {
        console.log('Stopping Expo server...');
        expoServer.kill('SIGTERM');
        expoServer = null;
    }
}

// Global test setup
beforeAll(async () => {
    console.log('Setting up test environment...');

    // Start servers if they're not already running
    try {
        await startSocketServer();
    } catch (error) {
        console.log('Socket.IO server already running or failed to start:', error);
    }

    try {
        await startExpoServer();
    } catch (error) {
        console.log('Expo server already running or failed to start:', error);
    }

    console.log('Test environment setup complete');
}, 60000); // 60 second timeout

// Global test cleanup
afterAll(async () => {
    console.log('Cleaning up test environment...');
    await stopServers();
    console.log('Test environment cleanup complete');
}, 30000); // 30 second timeout

// Export for use in individual test files
export { startExpoServer, startSocketServer, stopServers, waitForServer };
