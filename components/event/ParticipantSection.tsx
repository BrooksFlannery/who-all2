import { ThemedText } from '@/components/ThemedText';
import { useTextColor } from '@/hooks/useThemeColor';
import { LinearGradient } from 'expo-linear-gradient';
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
    loadingStatus?: 'attending' | 'interested' | null;
    isSignedIn?: boolean;
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
 * - Attendee circles positioned to the left of join buttons
 * 
 * @component
 * @param {ParticipantSectionProps} props - Component props
 * @returns {JSX.Element} The rendered participant section
 */
export const ParticipantSection = React.memo(function ParticipantSection({
    participants,
    userParticipation,
    onJoinEvent,
    loadingStatus = null,
    isSignedIn = true
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
                {isUserAttending && (
                    <LinearGradient
                        colors={['rgba(0, 122, 255, 0.3)', 'rgba(0, 122, 255, 0)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradientOverlay}
                    />
                )}
                <View style={styles.contentRow}>
                    <View style={styles.attendeeContainer}>
                        {participants.attending.length > 0 ? (
                            <AttendeeList
                                users={participants.attending}
                                maxVisible={8}
                                overlap={0.5}
                                onUserPress={handleUserPress}
                            />
                        ) : (
                            <View style={styles.emptyContainer}>
                                <ThemedText style={[styles.emptyText, { color: textColor }]}>
                                    No attendees yet
                                </ThemedText>
                            </View>
                        )}
                    </View>

                    <JoinButton
                        status="attending"
                        currentStatus={userParticipation}
                        onPress={handleJoinAttending}
                        loading={loadingStatus === 'attending'}
                    />
                </View>
            </View>

            {/* Interested Section */}
            <View style={[
                styles.section,
                isUserInterested && styles.activeSection
            ]}>
                {isUserInterested && (
                    <LinearGradient
                        colors={['rgba(0, 122, 255, 0.3)', 'rgba(0, 122, 255, 0)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradientOverlay}
                    />
                )}
                <View style={styles.contentRow}>
                    <View style={styles.attendeeContainer}>
                        {participants.interested.length > 0 ? (
                            <AttendeeList
                                users={participants.interested}
                                maxVisible={8}
                                overlap={0.5}
                                onUserPress={handleUserPress}
                            />
                        ) : (
                            <View style={styles.emptyContainer}>
                                <ThemedText style={[styles.emptyText, { color: textColor }]}>
                                    No interested users yet
                                </ThemedText>
                            </View>
                        )}
                    </View>

                    <JoinButton
                        status="interested"
                        currentStatus={userParticipation}
                        onPress={handleJoinInterested}
                        loading={loadingStatus === 'interested'}
                    />
                </View>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    section: {
        marginBottom: 8,
        paddingHorizontal: 12,
        paddingVertical: 0,
        borderRadius: 50,
        borderWidth: 1,
        borderColor: 'transparent',
        position: 'relative',
        overflow: 'hidden',
    },
    activeSection: {
        borderColor: 'transparent',
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    attendeeContainer: {
        flex: 1,
        marginRight: 16,
    },
    emptyContainer: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        opacity: 0.6,
    },
    gradientOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 50,
    },
}); 