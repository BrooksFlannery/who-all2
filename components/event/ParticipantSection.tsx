import { ThemedText } from '@/components/ThemedText';
import { useTextColor } from '@/hooks/useThemeColor';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AttendeeList } from './AttendeeList';
import { JoinButton } from './JoinButton';

/**
 * User interface for participant data
 */
interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
}

/**
 * Props for the ParticipantSection component
 */
interface ParticipantSectionProps {
    participants: {
        attending: User[];
        interested: User[];
    };
    userParticipation: 'attending' | 'interested' | null;
    onJoinEvent: (status: 'attending' | 'interested' | null) => void;
    loading?: boolean;
}

/**
 * ParticipantSection Component
 * 
 * Displays event participants organized by attendance status (attending/interested).
 * Provides join/leave functionality and visual feedback for user participation.
 * 
 * Features:
 * - Separate sections for attending and interested users
 * - Join/leave buttons with loading states
 * - Visual indicators for current user participation
 * - Expandable attendee lists with overlapping avatars
 * - "You" badge for current user's participation status
 * 
 * @component
 * @param {ParticipantSectionProps} props - Component props
 * @returns {JSX.Element} The rendered participant section
 */
export const ParticipantSection = React.memo(function ParticipantSection({
    participants,
    userParticipation,
    onJoinEvent,
    loading = false
}: ParticipantSectionProps) {
    const textColor = useTextColor();

    const handleJoinAttending = () => {
        const newStatus = userParticipation === 'attending' ? null : 'attending';
        onJoinEvent(newStatus);
    };

    const handleJoinInterested = () => {
        const newStatus = userParticipation === 'interested' ? null : 'interested';
        onJoinEvent(newStatus);
    };

    const handleUserPress = (user: User) => {
        // TODO: Implement user profile modal or navigation
        // For now, just show user name in a future implementation
    };

    const isUserAttending = userParticipation === 'attending';
    const isUserInterested = userParticipation === 'interested';

    return (
        <View style={styles.container}>
            {/* Attending Section */}
            <View style={[
                styles.section,
                isUserAttending && styles.activeSection
            ]}>
                <View style={styles.header}>
                    <View style={styles.titleContainer}>
                        <ThemedText style={[styles.title, { color: textColor }]}>
                            Attending ({participants.attending.length})
                        </ThemedText>
                        {isUserAttending && (
                            <View style={styles.statusBadge}>
                                <ThemedText style={styles.statusText}>You</ThemedText>
                            </View>
                        )}
                    </View>
                    <JoinButton
                        status="attending"
                        currentStatus={userParticipation}
                        onPress={handleJoinAttending}
                        loading={loading}
                    />
                </View>

                <AttendeeList
                    users={participants.attending}
                    maxVisible={8}
                    overlap={0.5}
                    onUserPress={handleUserPress}
                />
            </View>

            {/* Interested Section */}
            <View style={[
                styles.section,
                isUserInterested && styles.activeSection
            ]}>
                <View style={styles.header}>
                    <View style={styles.titleContainer}>
                        <ThemedText style={[styles.title, { color: textColor }]}>
                            Interested ({participants.interested.length})
                        </ThemedText>
                        {isUserInterested && (
                            <View style={styles.statusBadge}>
                                <ThemedText style={styles.statusText}>You</ThemedText>
                            </View>
                        )}
                    </View>
                    <JoinButton
                        status="interested"
                        currentStatus={userParticipation}
                        onPress={handleJoinInterested}
                        loading={loading}
                    />
                </View>

                <AttendeeList
                    users={participants.interested}
                    maxVisible={8}
                    overlap={0.5}
                    onUserPress={handleUserPress}
                />
            </View>

            {/* Not participating message */}
            {!userParticipation && (
                <View style={styles.notParticipatingContainer}>
                    <ThemedText style={[styles.notParticipatingText, { color: textColor }]}>
                        Join the event to see the full participant list and participate in chat
                    </ThemedText>
                </View>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    section: {
        marginBottom: 24,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    activeSection: {
        backgroundColor: 'rgba(0, 122, 255, 0.05)',
        borderColor: 'rgba(0, 122, 255, 0.2)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },
    statusBadge: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: 8,
    },
    statusText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    notParticipatingContainer: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    notParticipatingText: {
        fontSize: 14,
        textAlign: 'center',
        opacity: 0.7,
        lineHeight: 20,
    },
}); 