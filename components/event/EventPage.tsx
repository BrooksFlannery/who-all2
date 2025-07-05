import { useAuth } from '@/components/AuthProvider';
import { ChatBottomBar } from '@/components/event/ChatBottomBar';
import { ChatDrawer } from '@/components/event/ChatDrawer';
import { EventDetails } from '@/components/event/EventDetails';
import { EventHeader } from '@/components/event/EventHeader';
import { ParticipantSection } from '@/components/event/ParticipantSection';
import { useSocket } from '@/components/providers/SocketProvider';
import { ThemedText } from '@/components/ThemedText';
import { Skeleton } from '@/components/ui/Skeleton';
import { useBackgroundColor, useSecondaryBackgroundColor, useTextColor } from '@/hooks/useThemeColor';
import { Event } from '@/lib/db/types';
import { EventMessage, TypingUser } from '@/lib/socket-client';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, RefreshControl, StyleSheet, View } from 'react-native';
import Animated, {
    useAnimatedRef,
    useAnimatedScrollHandler,
    useSharedValue,
} from 'react-native-reanimated';

/**
 * Types for the API response from the event endpoint
 */
type EventApiResponse = {
    event: Event;
    userParticipation: 'attending' | 'interested' | null;
    attendees: any[];
    interested: any[];
};

/**
 * EventPage Component
 * 
 * Main component for displaying event details, managing participation,
 * and providing real-time chat functionality. This component handles:
 * 
 * - Event data fetching and display
 * - User participation management (attending/interested)
 * - Real-time chat with Socket.IO integration
 * - Real-time attendee list updates
 * - Parallax scrolling effects
 * - Error handling and loading states
 * 
 * @component
 * @returns {JSX.Element} The rendered event page
 */
export const EventPage = React.memo(function EventPage() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuth();
    const {
        joinEventRoom,
        leaveEventRoom,
        sendMessage,
        onMessage,
        onUserTyping,
        onUserStoppedTyping,
        onUserJoined,
        onUserLeft,
        isConnected
    } = useSocket();

    const [event, setEvent] = useState<Event | null>(null);
    const [attendees, setAttendees] = useState<any[]>([]);
    const [interested, setInterested] = useState<any[]>([]);
    const [userParticipation, setUserParticipation] = useState<'attending' | 'interested' | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [joiningStatus, setJoiningStatus] = useState<'attending' | 'interested' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [participationError, setParticipationError] = useState<string | null>(null);

    // Chat state
    const [messages, setMessages] = useState<EventMessage[]>([]);
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);

    // Chat drawer ref
    const chatDrawerRef = useRef<{ present: () => void; dismiss: () => void }>(null);

    const backgroundColor = useBackgroundColor();
    const secondaryBackgroundColor = useSecondaryBackgroundColor();
    const textColor = useTextColor();

    // Scroll view ref and offset for parallax effect
    const scrollRef = useAnimatedRef<Animated.ScrollView>();
    const scrollY = useSharedValue(0);

    const onScroll = useAnimatedScrollHandler(({ contentOffset }) => {
        scrollY.value = contentOffset.y;
    });

    // Memoize participants object to prevent unnecessary re-renders
    const participants = useMemo(() => ({
        attending: attendees,
        interested: interested,
    }), [attendees, interested]);

    // Memoize canSendMessage to prevent unnecessary re-renders
    const canSendMessage = useMemo(() => userParticipation !== null, [userParticipation]);

    // Chat drawer handlers
    const handleOpenChat = () => {
        chatDrawerRef.current?.present();
    };

    const handleCloseChat = () => {
        chatDrawerRef.current?.dismiss();
    };

    useEffect(() => {
        if (!id) {
            setError('Event ID is required');
            setIsLoading(false);
            return;
        }

        fetchEventData();
        loadMessages();
    }, [id]);

    // Socket.IO event listeners
    useEffect(() => {
        if (!id || !isConnected) return;

        // Join event room when connected
        joinEventRoom(id);

        // Set up event listeners
        const unsubscribeMessage = onMessage((message) => {
            if (message.eventId === id) {
                setMessages(prev => {
                    // Check if we have an optimistic message from the same user with similar content
                    const optimisticIndex = prev.findIndex(msg =>
                        msg.id.startsWith('temp-') &&
                        msg.userId === message.userId &&
                        msg.content === message.content
                    );

                    if (optimisticIndex !== -1) {
                        // Replace optimistic message with real message
                        const newMessages = [...prev];
                        newMessages[optimisticIndex] = message;
                        return newMessages;
                    } else {
                        // Add new message at the bottom (newest messages at bottom)
                        return [...prev, message];
                    }
                });
            }
        });

        const unsubscribeTyping = onUserTyping((user) => {
            setTypingUsers(prev => {
                const existing = prev.find(u => u.userId === user.userId);
                if (existing) return prev;
                return [...prev, user];
            });
        });

        const unsubscribeStopTyping = onUserStoppedTyping((userId) => {
            setTypingUsers(prev => prev.filter(u => u.userId !== userId));
        });

        const unsubscribeUserJoined = onUserJoined((data) => {
            // Update attendee lists based on participation status
            if (data.status === 'attending') {
                setAttendees(prev => {
                    const existing = prev.find(u => u.id === data.user.id);
                    if (existing) return prev;
                    return [...prev, data.user];
                });
            } else if (data.status === 'interested') {
                setInterested(prev => {
                    const existing = prev.find(u => u.id === data.user.id);
                    if (existing) return prev;
                    return [...prev, data.user];
                });
            }
        });

        const unsubscribeUserLeft = onUserLeft((data) => {
            // Remove user from appropriate list
            if (data.status === 'attending') {
                setAttendees(prev => prev.filter(u => u.id !== data.userId));
            } else if (data.status === 'interested') {
                setInterested(prev => prev.filter(u => u.id !== data.userId));
            }
        });

        // Cleanup on unmount
        return () => {
            leaveEventRoom(id);
            unsubscribeMessage();
            unsubscribeTyping();
            unsubscribeStopTyping();
            unsubscribeUserJoined();
            unsubscribeUserLeft();
        };
    }, [id, isConnected, joinEventRoom, leaveEventRoom, onMessage, onUserTyping, onUserStoppedTyping, onUserJoined, onUserLeft]);

    /**
     * Fetches event data including event details, user participation status,
     * and attendee lists from the API
     * 
     * @async
     * @throws {Error} When event is not found, user is not authenticated, or API fails
     */
    const fetchEventData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch(`/api/events/${id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Event not found');
                } else if (response.status === 401) {
                    throw new Error('Please sign in to view this event');
                } else {
                    throw new Error('Failed to load event');
                }
            }

            const data: EventApiResponse = await response.json();

            setEvent(data.event);
            setAttendees(data.attendees);
            setInterested(data.interested);
            setUserParticipation(data.userParticipation);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
            setError(errorMessage);
            console.error('Error fetching event data:', err);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    /**
     * Loads chat messages for the event with pagination support
     * 
     * @async
     * @param {Date} [before] - Optional timestamp to load messages before this date
     * @throws {Error} When message loading fails
     */
    const loadMessages = useCallback(async (before?: Date) => {
        if (!id || isLoadingMessages) return;

        try {
            setIsLoadingMessages(true);

            const url = new URL(`/api/events/${id}/messages`, window.location.origin);
            if (before) {
                url.searchParams.set('before', before.toISOString());
            }
            url.searchParams.set('limit', '20');

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to load messages');
            }

            const data = await response.json();

            if (before) {
                // Loading older messages
                setMessages(prev => [...prev, ...data.messages]);
            } else {
                // Loading initial messages
                setMessages(data.messages);
            }

            setHasMoreMessages(data.hasMore);
        } catch (err) {
            console.error('Error loading messages:', err);
        } finally {
            setIsLoadingMessages(false);
        }
    }, [id, isLoadingMessages]);

    /**
     * Handles sending a message to the event chat
     * 
     * @async
     * @param {string} content - The message content to send
     * @throws {Error} When message sending fails
     */
    const handleSendMessage = useCallback(async (content: string) => {
        if (!id || !user) return;

        // Create optimistic message
        const optimisticMessage: EventMessage = {
            id: `temp-${Date.now()}`,
            eventId: id,
            userId: user.id,
            content: content,
            userName: user.name || 'You',
            userImage: undefined, // Will be filled by server response
            createdAt: new Date().toISOString(),
        };

        // Add optimistic message immediately to UI (at the bottom for newest messages)
        setMessages(prev => [...prev, optimisticMessage]);

        try {
            // Send via socket if connected
            if (isConnected) {
                sendMessage(id, content);
            } else {
                // Fallback to API if socket not connected
                const response = await fetch(`/api/events/${id}/messages`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ content }),
                });

                if (!response.ok) {
                    throw new Error('Failed to send message');
                }

                const result = await response.json();

                // Replace optimistic message with real message
                setMessages(prev => prev.map(msg =>
                    msg.id === optimisticMessage.id ? result.message : msg
                ));
            }
        } catch (err) {
            console.error('Error sending message:', err);
            // Remove optimistic message on error
            setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
            Alert.alert('Error', 'Failed to send message. Please try again.');
        }
    }, [id, user, isConnected, sendMessage]);

    const handleLoadMoreMessages = useCallback(() => {
        if (messages.length > 0) {
            const oldestMessage = messages[0]; // Oldest message is at the beginning
            const beforeDate = new Date(oldestMessage.createdAt);
            loadMessages(beforeDate);
        }
    }, [messages, loadMessages]);

    /**
     * Handles user participation in the event (join/leave attending/interested)
     * 
     * @async
     * @param {'attending' | 'interested' | null} status - The participation status to set
     * @throws {Error} When participation update fails
     */
    const handleJoinEvent = useCallback(async (status: 'attending' | 'interested' | null) => {
        if (!id || joiningStatus) return;

        // Store previous state for rollback on error
        const previousParticipation = userParticipation;
        const previousEvent = event;

        try {
            setJoiningStatus(status);
            setParticipationError(null);

            // Optimistically update UI
            setUserParticipation(status);
            if (event) {
                const newEvent = { ...event };
                if (status === 'attending') {
                    newEvent.attendeesCount = (newEvent.attendeesCount || 0) + 1;
                    if (previousParticipation === 'interested') {
                        newEvent.interestedCount = Math.max(0, (newEvent.interestedCount || 0) - 1);
                    }
                } else if (status === 'interested') {
                    newEvent.interestedCount = (newEvent.interestedCount || 0) + 1;
                    if (previousParticipation === 'attending') {
                        newEvent.attendeesCount = Math.max(0, (newEvent.attendeesCount || 0) - 1);
                    }
                } else {
                    // Leaving event
                    if (previousParticipation === 'attending') {
                        newEvent.attendeesCount = Math.max(0, (newEvent.attendeesCount || 0) - 1);
                    } else if (previousParticipation === 'interested') {
                        newEvent.interestedCount = Math.max(0, (newEvent.interestedCount || 0) - 1);
                    }
                }
                setEvent(newEvent);
            }

            const response = await fetch(`/api/events/${id}/participate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to update participation');
            }

            const result = await response.json();

            if (result.success) {
                // Update with actual server data
                setEvent({
                    ...event!,
                    attendeesCount: result.newCounts.attending,
                    interestedCount: result.newCounts.interested,
                });

                // Update participant lists directly from response if available
                if (result.attendees && result.interested) {
                    setAttendees(result.attendees);
                    setInterested(result.interested);
                }
            } else {
                throw new Error('Failed to update participation');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';

            // Revert UI state on error
            setUserParticipation(previousParticipation);
            if (previousEvent) {
                setEvent(previousEvent);
            }

            // Show error to user
            setParticipationError(errorMessage);
            Alert.alert(
                'Participation Update Failed',
                errorMessage,
                [{ text: 'OK' }]
            );

            console.error('Error updating participation:', err);
        } finally {
            setJoiningStatus(null);
        }
    }, [id, joiningStatus, userParticipation, event, fetchEventData]);

    const handleBackPress = useCallback(() => {
        router.back();
    }, [router]);

    // Memoize loading state
    const loadingState = useMemo(() => ({
        isLoading,
        isLoadingMessages,
        hasMoreMessages,
    }), [isLoading, isLoadingMessages, hasMoreMessages]);

    if (loadingState.isLoading) {
        return (
            <View style={[styles.container, { backgroundColor }]}>
                <ThemedText style={styles.backButton} onPress={handleBackPress}>
                    ← Back
                </ThemedText>
                <View style={{ paddingHorizontal: 0, paddingTop: 100 }}>
                    {/* Event Header Skeleton */}
                    <Skeleton width={'100%'} height={220} borderRadius={16} style={{ marginBottom: 24 }} />
                    {/* Event Title Skeleton */}
                    <Skeleton width={'60%'} height={32} borderRadius={8} style={{ marginBottom: 12 }} />
                    {/* Date/Time Skeleton */}
                    <Skeleton width={120} height={20} borderRadius={8} style={{ marginBottom: 16 }} />
                    {/* Venue Skeleton */}
                    <Skeleton width={'80%'} height={24} borderRadius={8} style={{ marginBottom: 24 }} />
                    {/* Categories Skeleton */}
                    <Skeleton width={'40%'} height={20} borderRadius={8} style={{ marginBottom: 24 }} />
                    {/* Description Skeleton */}
                    <Skeleton width={'100%'} height={60} borderRadius={8} style={{ marginBottom: 32 }} />

                    {/* Participant Section Skeleton */}
                    <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
                        {/* Attending Section Skeleton */}
                        <View style={{
                            marginBottom: 8,
                            paddingHorizontal: 12,
                            paddingVertical: 16,
                            borderRadius: 50,
                            borderWidth: 1,
                            borderColor: '#E5E5EA',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            {/* Attendee Avatars Skeleton */}
                            <View style={{ flex: 1, marginRight: 16, flexDirection: 'row', gap: 8 }}>
                                {[...Array(4)].map((_, i) => (
                                    <Skeleton key={i} width={32} height={32} borderRadius={16} />
                                ))}
                            </View>
                            {/* Join Button Skeleton */}
                            <Skeleton width={80} height={36} borderRadius={18} />
                        </View>

                        {/* Interested Section Skeleton */}
                        <View style={{
                            marginBottom: 8,
                            paddingHorizontal: 12,
                            paddingVertical: 16,
                            borderRadius: 50,
                            borderWidth: 1,
                            borderColor: '#E5E5EA',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            {/* Interested Avatars Skeleton */}
                            <View style={{ flex: 1, marginRight: 16, flexDirection: 'row', gap: 8 }}>
                                {[...Array(3)].map((_, i) => (
                                    <Skeleton key={i} width={32} height={32} borderRadius={16} />
                                ))}
                            </View>
                            {/* Join Button Skeleton */}
                            <Skeleton width={80} height={36} borderRadius={18} />
                        </View>
                    </View>

                    {/* Chat Bottom Bar Skeleton */}
                    <View style={{
                        borderTopWidth: 1,
                        borderTopColor: '#E5E5EA',
                        paddingHorizontal: 20,
                        paddingVertical: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <View style={{ flex: 1 }}>
                            <Skeleton width={'40%'} height={18} borderRadius={4} style={{ marginBottom: 4 }} />
                            <Skeleton width={'60%'} height={14} borderRadius={4} />
                        </View>
                        <Skeleton width={20} height={20} borderRadius={10} />
                    </View>
                </View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.container, { backgroundColor }]}>
                <ThemedText style={styles.backButton} onPress={handleBackPress}>
                    ← Back
                </ThemedText>
                <View style={styles.errorContainer}>
                    <ThemedText style={styles.errorTitle}>Error</ThemedText>
                    <ThemedText style={styles.errorMessage}>{error}</ThemedText>
                    <ThemedText
                        style={styles.retryButton}
                        onPress={fetchEventData}
                    >
                        Try Again
                    </ThemedText>
                </View>
            </View>
        );
    }

    if (!event) {
        return (
            <View style={[styles.container, { backgroundColor }]}>
                <ThemedText style={styles.backButton} onPress={handleBackPress}>
                    ← Back
                </ThemedText>
                <View style={styles.errorContainer}>
                    <ThemedText style={styles.errorTitle}>Event Not Found</ThemedText>
                    <ThemedText style={styles.errorMessage}>
                        The event you&apos;re looking for doesn&apos;t exist or has been removed.
                    </ThemedText>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: secondaryBackgroundColor }]}>
            {/* Back Button - Absolute positioned */}
            <ThemedText style={styles.backButton} onPress={handleBackPress}>
                ← Back
            </ThemedText>

            {/* Scrollable Content with Parallax Effect */}
            <Animated.ScrollView
                ref={scrollRef}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                onScroll={onScroll}
                refreshControl={
                    <RefreshControl
                        refreshing={loadingState.isLoading}
                        onRefresh={fetchEventData}
                    />
                }
            >
                {/* Event Header with Photo */}
                <EventHeader event={event} scrollOffset={scrollY} />

                {/* Event Details */}
                <EventDetails event={event} />

                {/* Participant Section */}
                <ParticipantSection
                    participants={participants}
                    userParticipation={userParticipation}
                    onJoinEvent={handleJoinEvent}
                    loadingStatus={joiningStatus}
                    isSignedIn={!!user}
                />

                {/* Error message for participation */}
                {participationError && (
                    <View style={styles.errorMessageContainer}>
                        <ThemedText style={styles.participationErrorText}>
                            {participationError}
                        </ThemedText>
                    </View>
                )}

                {/* Chat Bottom Bar - At bottom of page content */}
                <ChatBottomBar
                    onPress={handleOpenChat}
                    messageCount={messages.length}
                    unreadCount={0}
                />
            </Animated.ScrollView>

            {/* Chat Drawer */}
            <ChatDrawer
                ref={chatDrawerRef}
                eventId={id}
                messages={messages}
                typingUsers={typingUsers}
                onSendMessage={handleSendMessage}
                onLoadMoreMessages={handleLoadMoreMessages}
                canSendMessage={canSendMessage}
                isLoadingMessages={loadingState.isLoadingMessages}
                hasMoreMessages={loadingState.hasMoreMessages}
                isSignedIn={!!user}
            />
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        // No bottom padding needed since ChatBottomBar is now part of content
    },
    backButton: {
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 10,
        fontSize: 18,
        color: '#007AFF',
        fontWeight: '600',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    errorMessage: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24,
    },
    retryButton: {
        fontSize: 16,
        color: '#007AFF',
        fontWeight: '500',
    },
    errorMessageContainer: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#FFE5E5',
        marginHorizontal: 20,
        marginVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FFCCCC',
    },
    participationErrorText: {
        fontSize: 14,
        color: '#D32F2F',
        textAlign: 'center',
    },
}); 