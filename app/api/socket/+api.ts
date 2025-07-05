import { socketServer } from '@/lib/socket-server';
import { createServer } from 'http';

// Create HTTP server for Socket.IO
const server = createServer();

// Initialize Socket.IO server
socketServer.initialize(server);

// Export the server for use in other parts of the application
export { server as socketServer };

// This endpoint is used to check if Socket.IO server is ready
export async function GET() {
    return Response.json({
        status: 'ready',
        socketIO: socketServer.isReady()
    });
} 