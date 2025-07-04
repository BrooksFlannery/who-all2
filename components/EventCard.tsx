import { ThemedText } from '@/components/ThemedText';
import { useCardBackgroundColor, useCategoryColor, useSecondaryTextColor, useTextColor } from '@/hooks/useThemeColor';
import { Event } from '@/lib/db/types';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { VenuePhoto } from './VenuePhoto';

interface EventCardProps {
    event: Event;
    onPress?: () => void;
    compact?: boolean;
    scrollY: Animated.SharedValue<number>;
    index: number;
}

// Parallax zoom factor
const ZOOM_FACTOR = 1.5;

export function EventCard({ event, onPress, compact = false, scrollY, index }: EventCardProps) {
    const textColor = useTextColor();
    const secondaryTextColor = useSecondaryTextColor();
    const backgroundColor = useCardBackgroundColor();
    const { height: screenHeight } = useWindowDimensions();

    // Get category colors at component level (hooks must be at top level)
    const categoryColors = {
        fitness: useCategoryColor('fitness'),
        social: useCategoryColor('social'),
        creative: useCategoryColor('creative'),
        technology: useCategoryColor('technology'),
        education: useCategoryColor('education'),
        food: useCategoryColor('food'),
        music: useCategoryColor('music'),
        outdoors: useCategoryColor('outdoors'),
        business: useCategoryColor('business'),
        sports: useCategoryColor('sports'),
        other: useCategoryColor('other'),
    };

    // Extract venue information
    const venueName = event.location?.venueName;
    const neighborhood = event.location?.neighborhood;

    // Debug logging for photo reference
    console.log('EventCard:', event.title, 'photoReference:', event.location?.photoReference);

    const formatDate = (date: Date | string) => {
        const eventDate = typeof date === 'string' ? new Date(date) : date;
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (eventDate.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (eventDate.toDateString() === tomorrow.toDateString()) {
            return 'Tomorrow';
        } else {
            return eventDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                weekday: 'short'
            });
        }
    };

    const formatTime = (date: Date | string) => {
        const eventDate = typeof date === 'string' ? new Date(date) : date;
        return eventDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const getCategoryColor = (category: string) => {
        return categoryColors[category as keyof typeof categoryColors] || categoryColors.other;
    };

    const handleVenuePress = () => {
        if (event.location?.placeId) {
            const mapsUrl = `https://maps.google.com/?q=place_id:${event.location.placeId}`;
            Linking.openURL(mapsUrl);
        }
    };

    // Remove quotes from title if present
    const cleanTitle = event.title.replace(/^["']|["']$/g, '');

    // Image height for the card
    const imageHeight = compact ? 160 : 200;
    const cardHeight = imageHeight + 200; // Approximate total card height

    // Simple parallax effect
    const animatedStyle = useAnimatedStyle(() => {
        const cardTop = index * cardHeight;
        const cardBottom = cardTop + cardHeight;
        const scrollOffset = scrollY.value;

        // Calculate how much the card has moved through the viewport
        const cardCenter = cardTop + cardHeight / 2;
        const viewportCenter = scrollOffset + screenHeight / 2;
        const distanceFromCenter = cardCenter - viewportCenter;

        // Normalize to [-1, 1] range
        const normalizedDistance = distanceFromCenter / (screenHeight / 2);
        const clampedDistance = Math.max(-1, Math.min(1, normalizedDistance));

        // Calculate parallax translation (opposite direction of scroll)
        const maxTranslation = (imageHeight * (ZOOM_FACTOR - 1)) / 2;
        const translateY = -clampedDistance * maxTranslation;

        return {
            transform: [
                { translateY },
                { scale: ZOOM_FACTOR },
            ],
        };
    });

    return (
        <View style={[styles.eventCard, compact && styles.eventCardCompact, { backgroundColor }]}>
            <TouchableOpacity
                style={styles.cardContent}
                activeOpacity={0.7}
                onPress={onPress}
            >
                {/* Header Photo with Title Overlay */}
                <View style={[styles.photoContainer, { height: imageHeight }]}>
                    <Animated.View style={[styles.parallaxImageContainer, animatedStyle]}>
                        <VenuePhoto
                            photoReference={event.location?.photoReference}
                            height={imageHeight}
                            borderRadius={0}
                        />
                    </Animated.View>

                    {/* Stats Badge - Top Left */}
                    <View style={styles.statsBadge}>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{event.attendeesCount}</Text>
                            <Text style={styles.statLabel}>Going</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{event.interestedCount}</Text>
                            <Text style={styles.statLabel}>Interested</Text>
                        </View>
                    </View>

                    <LinearGradient
                        colors={['transparent', 'rgba(0, 0, 0, 0.2)', 'rgba(0, 0, 0, 0.5)', 'rgba(0, 0, 0, 0.8)']}
                        style={styles.titleOverlay}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                    >
                        <ThemedText style={styles.eventTitle}>{cleanTitle}</ThemedText>
                    </LinearGradient>
                </View>

                {/* Content Section */}
                <View style={styles.contentContainer}>
                    {/* Venue and Time Row */}
                    <View style={styles.venueRow}>
                        {venueName && (
                            <TouchableOpacity
                                style={styles.venueContainer}
                                onPress={handleVenuePress}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.venueName, { color: textColor }]}>
                                    {venueName}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* Time Information */}
                        <View style={styles.timeContainer}>
                            <Text style={[styles.eventDate, { color: textColor }]}>{formatDate(event.date)}</Text>
                            <Text style={[styles.eventTime, { color: secondaryTextColor }]}>{formatTime(event.date)}</Text>
                        </View>
                    </View>

                    {/* Description */}
                    <View style={[styles.descriptionContainer, compact && styles.descriptionContainerCompact]}>
                        <LinearGradient
                            colors={[backgroundColor, 'rgba(255, 255, 255, 0)']}
                            style={styles.descriptionTopGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                        />
                        <ScrollView
                            style={[styles.eventDescription, compact && styles.eventDescriptionCompact]}
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled={true}
                        >
                            <Text style={[styles.descriptionText, { color: secondaryTextColor }]}>
                                {event.description}
                            </Text>
                        </ScrollView>
                        <LinearGradient
                            colors={['transparent', backgroundColor]}
                            style={styles.descriptionBottomGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                        />
                    </View>

                    {/* Neighborhood at bottom */}
                    {neighborhood && (
                        <Text style={[styles.neighborhoodText, { color: secondaryTextColor }]}>
                            {neighborhood}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    eventCard: {
        borderRadius: 16,
        marginBottom: 16,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        overflow: 'hidden',
    },
    eventCardCompact: {
        borderRadius: 12,
        marginBottom: 12,
        shadowOpacity: 0.06,
        shadowRadius: 6,
    },
    cardContent: {
        flex: 1,
    },
    photoContainer: {
        position: 'relative',
        overflow: 'hidden',
    },
    parallaxImageContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    titleOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        paddingTop: 40,
        justifyContent: 'flex-end',
    },
    eventTitle: {
        fontSize: 28,
        fontWeight: '700',
        lineHeight: 34,
        color: '#FFFFFF',
    },
    statsBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        flexDirection: 'row',
        gap: 12,
        zIndex: 2,
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    statLabel: {
        fontSize: 10,
        color: '#FFFFFF',
        opacity: 0.9,
    },
    dateTimeBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    eventDate: {
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'right',
    },
    eventTime: {
        fontSize: 12,
        textAlign: 'right',
        opacity: 0.8,
    },
    contentContainer: {
        padding: 20,
    },
    venueContainer: {
        flex: 1,
        marginRight: 12,
    },
    venueName: {
        fontSize: 16,
        fontWeight: '600',
    },
    neighborhoodText: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'right',
    },
    venueRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 0,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    timeContainer: {
        alignItems: 'flex-end',
    },
    eventDescription: {
        maxHeight: 80,
        paddingTop: 20,
        paddingBottom: 20,
    },
    eventDescriptionCompact: {
        maxHeight: 60,
        paddingTop: 20,
        paddingBottom: 20,
    },
    descriptionText: {
        fontSize: 13,
        lineHeight: 18,
    },
    descriptionContainer: {
        maxHeight: 80,
        position: 'relative',
    },
    descriptionContainerCompact: {
        maxHeight: 60,
        position: 'relative',
    },
    descriptionTopGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 20,
        zIndex: 1,
    },
    descriptionBottomGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 20,
        zIndex: 1,
    },
}); 