# Socket.IO Server Implementation

## Overview

The Socket.IO server provides real-time communication capabilities for the event chat system. It enables users to send and receive messages in real-time, see typing indicators, and get live updates when users join or leave events.

## Architecture

### Server Setup

The Socket.IO server runs on port 3001 (configurable via `SOCKET_PORT` environment variable) and integrates with the existing Expo Router API structure.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Expo Client   │    │  Socket.IO      │    │   Database      │
│                 │◄──►│   Server        │◄──►│                 │
│  (Port 8081)    │    │  (Port 3001)    │    │  (PostgreSQL)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Components

1. **Socket.IO Server** (`server.js`) - Standalone server for real-time communication
2. **Socket Client** (`lib/socket-client.ts`) - Client-side Socket.IO implementation
3. **Socket Provider** (`components/providers/SocketProvider.tsx`) - React context for Socket.IO
4. **Broadcast Helpers** (`lib/socket-broadcast.ts`) - API integration helpers

## Features

### 1. Authentication
- Token-based authentication using the existing auth system
- Automatic session validation on connection
- Secure user identification and authorization

### 2. Event Room Management
- Users can join/leave event-specific rooms
- Only participants can access event chat rooms
- Automatic room cleanup on disconnection

### 3. Real-time Messaging
- Instant message broadcasting to all room participants
- Message persistence in database
- Content validation (length, content filtering)
- Permission checks (only participants can send messages)

### 4. Typing Indicators
- Real-time typing status updates
- Auto-clear after 5 seconds of inactivity
- Per-event room typing state management

### 5. Participation Updates
- Live notifications when users join/leave events
- Real-time attendee count updates
- Integration with existing participation API

## Installation and Setup

### 1. Install Dependencies

```bash
npm install socket.io
npm install --save-dev concurrently
```

### 2. Environment Configuration

Add to your environment variables:

```env
EXPO_PUBLIC_SOCKET_URL=http://localhost:3001
SOCKET_PORT=3001
```

### 3. Start the Servers

#### Development (both servers)
```bash
npm run dev
```

#### Individual servers
```bash
# Start Expo development server
npm start

# Start Socket.IO server
npm run start:socket
```

## API Integration

### Broadcasting from API Routes

The Socket.IO server integrates with existing API routes to broadcast real-time updates:

#### Participation Updates
```typescript
import { broadcastParticipationUpdate } from '@/lib/socket-broadcast';

// In your participation API
await broadcastParticipationUpdate(
    eventId,
    userId,
    status, // 'attending' | 'interested' | null
    { id: userId, name: userName, image: userImage }
);
```

#### Message Broadcasting
```typescript
import { broadcastNewMessage } from '@/lib/socket-broadcast';

// In your messages API
await broadcastNewMessage({
    id: message.id,
    eventId: message.eventId,
    userId: message.userId,
    content: message.content,
    userName: message.userName,
    userImage: message.userImage,
    createdAt: message.createdAt.toISOString()
});
```

## Client-Side Usage

### 1. Socket Provider Setup

The `SocketProvider` is already configured in the app root:

```typescript
// app/_layout.tsx
import { SocketProvider } from '@/components/providers/SocketProvider';

export default function RootLayout() {
  return (
    <AuthProvider>
      <SocketProvider>
        {/* Your app content */}
      </SocketProvider>
    </AuthProvider>
  );
}
```

### 2. Using Socket in Components

```typescript
import { useSocket } from '@/components/providers/SocketProvider';

export function EventPage() {
  const { 
    isConnected, 
    joinEventRoom, 
    sendMessage, 
    onMessage 
  } = useSocket();

  useEffect(() => {
    if (isConnected && eventId) {
      // Join event room
      joinEventRoom(eventId);

      // Listen for new messages
      const unsubscribe = onMessage((message) => {
        // Handle new message
        console.log('New message:', message);
      });

      return unsubscribe;
    }
  }, [isConnected, eventId]);

  const handleSendMessage = (content: string) => {
    sendMessage(eventId, content);
  };
}
```

## Socket Events

### Client to Server Events

| Event | Data | Description |
|-------|------|-------------|
| `join-event` | `{ eventId: string }` | Join an event chat room |
| `leave-event` | `{ eventId: string }` | Leave an event chat room |
| `send-message` | `{ eventId: string, content: string }` | Send a message to an event |
| `typing` | `{ eventId: string }` | Start typing indicator |
| `stop-typing` | `{ eventId: string }` | Stop typing indicator |

### Server to Client Events

| Event | Data | Description |
|-------|------|-------------|
| `new-message` | `EventMessage` | New message received |
| `user-typing` | `{ userId: string, userName: string }` | User started typing |
| `user-stopped-typing` | `string` | User stopped typing (userId) |
| `user-joined` | `UserParticipationUpdate` | User joined event |
| `user-left` | `{ userId: string, status: string }` | User left event |
| `error` | `{ message: string }` | Error message |

## Data Types

### EventMessage
```typescript
interface EventMessage {
    id: string;
    eventId: string;
    userId: string;
    content: string;
    userName: string;
    userImage?: string;
    createdAt: string;
}
```

### TypingUser
```typescript
interface TypingUser {
    userId: string;
    userName: string;
}
```

### UserParticipationUpdate
```typescript
interface UserParticipationUpdate {
    userId: string;
    status: 'attending' | 'interested' | null;
    user: {
        id: string;
        name: string;
        image?: string;
    };
}
```

## Security Features

### 1. Authentication
- All connections require valid authentication tokens
- Automatic session validation on connection
- User information securely stored in socket session

### 2. Authorization
- Only event participants can join chat rooms
- Only participants can send messages
- Permission checks on all operations

### 3. Input Validation
- Message content length limits (max 1000 characters)
- Empty message rejection
- Content filtering capabilities

### 4. Rate Limiting
- Built-in Socket.IO rate limiting
- Typing indicator auto-cleanup
- Connection limits per user

## Error Handling

### Connection Errors
- Automatic reconnection with exponential backoff
- Graceful degradation when server unavailable
- User-friendly error messages

### Message Errors
- Validation errors returned to client
- Database errors logged and handled
- Fallback mechanisms for failed operations

## Performance Considerations

### 1. Room Management
- Efficient room joining/leaving
- Automatic cleanup of empty rooms
- Memory-efficient user session storage

### 2. Message Broadcasting
- Optimized message delivery to room participants
- Minimal data transfer with efficient serialization
- Connection pooling for high concurrency

### 3. Typing Indicators
- Debounced typing events
- Auto-cleanup to prevent memory leaks
- Efficient state management

## Testing

### Running Tests
```bash
# Test Socket.IO server functionality
npm run test:socket-server

# Run all tests including Socket.IO
npm test
```

### Test Coverage
- Connection and authentication
- Event room management
- Message broadcasting
- Typing indicators
- Participation updates
- Error handling
- Multiple client scenarios

## Monitoring and Debugging

### Server Logs
The Socket.IO server provides comprehensive logging:

```
[INFO] Socket.IO server running on port 3001
[INFO] User authenticated: user123 (John Doe)
[INFO] User user123 joining event room: event456
[INFO] Message sent by user123 to event event456
[INFO] User user123 left event room: event456
```

### Client Logs
The client provides detailed connection and event logging:

```
[INFO] Socket connected
[INFO] Joining event room: event456
[INFO] Received new message: { id: "msg123", content: "Hello!" }
[INFO] User typing: { userId: "user123", userName: "John" }
```

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check if Socket.IO server is running on port 3001
   - Verify `EXPO_PUBLIC_SOCKET_URL` environment variable
   - Check firewall settings

2. **Authentication Errors**
   - Verify auth token is valid
   - Check auth middleware configuration
   - Ensure user session exists

3. **Message Not Received**
   - Verify user is participating in event
   - Check event room membership
   - Validate message content

4. **Typing Indicators Not Working**
   - Check typing event emission
   - Verify room membership
   - Check auto-cleanup timing

### Debug Mode
Enable debug logging by setting environment variable:
```env
DEBUG=socket.io:*
```

## Future Enhancements

### Planned Features
- Message reactions and emojis
- File/image sharing
- Message editing and deletion
- User presence indicators
- Message search functionality
- Push notifications integration

### Scalability Improvements
- Redis adapter for horizontal scaling
- Message queuing for high load
- WebSocket clustering
- Load balancing support

## Contributing

When contributing to the Socket.IO server:

1. Follow the existing code style and patterns
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Test with multiple clients and scenarios
5. Ensure backward compatibility

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review server and client logs
3. Test with the provided test scripts
4. Create detailed bug reports with logs 