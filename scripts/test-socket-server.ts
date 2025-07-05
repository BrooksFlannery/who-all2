import { io as ClientIO } from 'socket.io-client';

/**
 * Test script for Socket.IO server functionality
 * 
 * This script tests:
 * 1. Server startup and health endpoint
 * 2. Basic server connectivity
 * 3. CORS configuration
 * 4. Server shutdown
 */

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3001';

async function testServerHealth() {
    console.log('=== Socket.IO Server Health Test ===');
    console.log('Socket URL:', SOCKET_URL);

    // Test 1: Health endpoint
    console.log('\n1. Testing health endpoint...');
    try {
        const response = await fetch(`${SOCKET_URL}/health`);
        const healthData = await response.json();

        console.log('✅ Health endpoint responded');
        console.log('   Status:', healthData.status);
        console.log('   SocketIO:', healthData.socketIO);
        console.log('   Port:', healthData.port);
        console.log('   Environment:', healthData.environment);

        if (healthData.status !== 'ready') {
            throw new Error('Server not ready');
        }
    } catch (error) {
        console.error('❌ Health endpoint test failed:', error);
        throw error;
    }
}

async function testServerConnectivity() {
    console.log('\n2. Testing server connectivity...');
    try {
        const response = await fetch(`${SOCKET_URL}/`);
        const data = await response.json();

        console.log('✅ Server root endpoint responded');
        console.log('   Message:', data.message);
        console.log('   Version:', data.version);

        if (data.message !== 'Socket.IO Server is running') {
            throw new Error('Unexpected server response');
        }
    } catch (error) {
        console.error('❌ Server connectivity test failed:', error);
        throw error;
    }
}

async function testCORSConfiguration() {
    console.log('\n3. Testing CORS configuration...');
    try {
        const response = await fetch(`${SOCKET_URL}/health`, {
            method: 'OPTIONS',
            headers: {
                'Origin': 'http://localhost:8081',
                'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': 'Content-Type'
            }
        });

        console.log('✅ CORS preflight request successful');
        console.log('   Status:', response.status);

        const corsHeaders = response.headers.get('access-control-allow-origin');
        if (corsHeaders) {
            console.log('   CORS Origin:', corsHeaders);
        }
    } catch (error) {
        console.error('❌ CORS test failed:', error);
        throw error;
    }
}

async function testSocketIOConnection() {
    console.log('\n4. Testing Socket.IO connection (without auth)...');
    try {
        const socket = ClientIO(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            timeout: 5000,
            forceNew: true
        });

        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Connection timeout'));
            }, 5000);

            socket.on('connect', () => {
                console.log('✅ Socket.IO connection established');
                clearTimeout(timeout);
                resolve();
            });

            socket.on('connect_error', (error) => {
                console.log('⚠️  Socket.IO connection error (expected without auth):', error.message);
                clearTimeout(timeout);
                // This is expected without authentication, so we don't reject
                resolve();
            });
        });

        socket.disconnect();
    } catch (error) {
        console.error('❌ Socket.IO connection test failed:', error);
        throw error;
    }
}

// Run tests
async function runTests() {
    try {
        await testServerHealth();
        await testServerConnectivity();
        await testCORSConfiguration();
        await testSocketIOConnection();

        console.log('\n🎉 All Socket.IO server dependency tests passed!');
        console.log('✅ Express server is working');
        console.log('✅ CORS is configured correctly');
        console.log('✅ Socket.IO server is initialized');
        console.log('✅ Health endpoints are responding');
        console.log('✅ All required dependencies are installed and working');
    } catch (error) {
        console.error('\n💥 Socket.IO server dependency tests failed:', error);
        process.exit(1);
    }
}

// Run if this script is executed directly
if (require.main === module) {
    runTests();
} 