import { useAuth } from '@/components/AuthProvider';
import { ChatSection } from '@/components/event/ChatSection';
import { EventDetails } from '@/components/event/EventDetails';
import { EventHeader } from '@/components/event/EventHeader';
import { ParticipantSection } from '@/components/event/ParticipantSection';
import { useSocket } from '@/components/providers/SocketProvider';
import { ThemedText } from '@/components/ThemedText';
import { Skeleton } from '@/components/ui/Skeleton';
import { useBackgroundColor, useTextColor } from '@/hooks/useThemeColor';
import { Event } from '@/lib/db/types';
import { EventMessage, TypingUser } from '@/lib/socket-client';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [participationError, setParticipationError] = useState<string | null>(null);

    // Chat state
    const [messages, setMessages] = useState<EventMessage[]>([]);
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);

    const backgroundColor = useBackgroundColor();
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
                setMessages(prev => [message, ...prev]);
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
     * Sends a chat message to the event
     * 
     * @async
     * @param {string} content - The message content to send
     * @throws {Error} When message sending fails
     */
    const handleSendMessage = useCallback(async (content: string) => {
        if (!id || !user) return;

        try {
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

            // Message will be added via Socket.IO event
            // No need to manually add it here
        } catch (err) {
            console.error('Error sending message:', err);
            Alert.alert('Error', 'Failed to send message. Please try again.');
        }
    }, [id, user]);

    const handleLoadMoreMessages = useCallback(() => {
        if (messages.length > 0) {
            const oldestMessage = messages[messages.length - 1];
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
        if (!id || isJoining) return;

        // Store previous state for rollback on error
        const previousParticipation = userParticipation;
        const previousEvent = event;

        try {
            setIsJoining(true);
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

                // Refresh participant lists to get updated data
                await fetchEventData();
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
            setIsJoining(false);
        }
    }, [id, isJoining, userParticipation, event, fetchEventData]);

    const handleBackPress = useCallback(() => {
        router.back();
    }, [router]);

    // Memoize loading state
    const loadingState = useMemo(() => ({
        isLoading,
        isJoining,
        isLoadingMessages,
        hasMoreMessages,
    }), [isLoading, isJoining, isLoadingMessages, hasMoreMessages]);

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
                    {/* Participant Avatars Skeleton */}
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} width={40} height={40} borderRadius={20} />
                        ))}
                    </View>
                    {/* Join Buttons Skeleton */}
                    <Skeleton width={100} height={36} borderRadius={18} style={{ marginBottom: 16 }} />
                    <Skeleton width={100} height={36} borderRadius={18} />
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
        <View style={[styles.container, { backgroundColor }]}>
            {/* Back Button - Absolute positioned */}
            <ThemedText style={styles.backButton} onPress={handleBackPress}>
                ← Back
            </ThemedText>

            {/* Scrollable Content with Parallax Effect */}
            <Animated.ScrollView
                ref={scrollRef}
                style={styles.scrollView}
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
                    loading={loadingState.isJoining}
                />

                {/* Error message for participation */}
                {participationError && (
                    <View style={styles.errorMessageContainer}>
                        <ThemedText style={styles.participationErrorText}>
                            {participationError}
                        </ThemedText>
                    </View>
                )}

                {/* Chat Section */}
                <View style={styles.chatSection}>
                    <ThemedText style={styles.chatTitle}>Chat</ThemedText>
                    <ChatSection
                        eventId={id}
                        messages={messages}
                        typingUsers={typingUsers}
                        onSendMessage={handleSendMessage}
                        onLoadMoreMessages={handleLoadMoreMessages}
                        canSendMessage={canSendMessage}
                        isLoadingMessages={loadingState.isLoadingMessages}
                        hasMoreMessages={loadingState.hasMoreMessages}
                    />
                </View>
            </Animated.ScrollView>
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
    chatSection: {
        height: 400, // Fixed height for chat section
        borderTopWidth: 1,
        borderTopColor: '#E5E5EA',
    },
    chatTitle: {
        fontSize: 18,
        fontWeight: '600',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
}); 