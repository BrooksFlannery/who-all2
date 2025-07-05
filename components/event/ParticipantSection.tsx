import { ThemedText } from '@/components/ThemedText';
import { useBackgroundColor, useBorderColor, useCardBackgroundColor, usePrimaryColor, useSecondaryTextColor, useTextColor } from '@/hooks/useThemeColor';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useState } from 'react';
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
        attending: any[];
        interested: any[];
    };
    userParticipation: 'attending' | 'interested' | null;
    onJoinEvent: (status: 'attending' | 'interested') => Promise<void>;
    loadingStatus: 'attending' | 'interested' | null;
    isSignedIn: boolean;
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
export function ParticipantSection({
    participants,
    userParticipation,
    onJoinEvent,
    loadingStatus,
    isSignedIn,
}: ParticipantSectionProps) {
    const [expandedSection, setExpandedSection] = useState<'attending' | 'interested' | null>(null);
    const backgroundColor = useBackgroundColor();
    const cardBackgroundColor = useCardBackgroundColor();
    const textColor = useTextColor();
    const secondaryTextColor = useSecondaryTextColor();
    const primaryColor = usePrimaryColor();
    const borderColor = useBorderColor();

    const handleJoinEvent = useCallback(async (status: 'attending' | 'interested') => {
        if (!isSignedIn) {
            // Handle not signed in case
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await onJoinEvent(status);
    }, [isSignedIn, onJoinEvent]);

    const toggleSection = useCallback((section: 'attending' | 'interested') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExpandedSection(expandedSection === section ? null : section);
    }, [expandedSection]);

    const attendingCount = participants.attending.length;
    const interestedCount = participants.interested.length;

    return (
        <View style={[styles.container, { backgroundColor: cardBackgroundColor, borderBottomColor: borderColor }]}>
            {/* Attending Section */}
            <View style={[
                styles.section,
                userParticipation === 'attending' && styles.activeSection
            ]}>
                {userParticipation === 'attending' && (
                    <LinearGradient
                        colors={['rgba(0, 122, 255, 0.3)', 'rgba(0, 122, 255, 0)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradientOverlay}
                    />
                )}
                <View style={styles.contentRow}>
                    <View style={styles.attendeeContainer}>
                        {attendingCount > 0 ? (
                            <AttendeeList
                                users={participants.attending.slice(0, 4)}
                                maxVisible={4}
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
                        onPress={() => handleJoinEvent('attending')}
                        loading={loadingStatus === 'attending'}
                        disabled={!isSignedIn}
                    />
                </View>
            </View>

            {/* Interested Section */}
            <View style={[
                styles.section,
                userParticipation === 'interested' && styles.activeSection
            ]}>
                {userParticipation === 'interested' && (
                    <LinearGradient
                        colors={['rgba(0, 122, 255, 0.3)', 'rgba(0, 122, 255, 0)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradientOverlay}
                    />
                )}
                <View style={styles.contentRow}>
                    <View style={styles.attendeeContainer}>
                        {interestedCount > 0 ? (
                            <AttendeeList
                                users={participants.interested.slice(0, 4)}
                                maxVisible={4}
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
                        onPress={() => handleJoinEvent('interested')}
                        loading={loadingStatus === 'interested'}
                        disabled={!isSignedIn}
                    />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        borderBottomWidth: 1,
    },
    section: {
        marginBottom: 8,
        paddingHorizontal: 12,
        paddingVertical: 0,
        borderRadius: 50,
        borderWidth: 1,
        borderColor: 'transparent',
        position: 'relative',
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