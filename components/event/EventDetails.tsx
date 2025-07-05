import { ThemedText } from '@/components/ThemedText';
import { useBackgroundColor, useSecondaryTextColor, useTextColor } from '@/hooks/useThemeColor';
import { Event } from '@/lib/db/types';
import React from 'react';
import { ImageBackground, Linking, StyleSheet, TouchableOpacity, View } from 'react-native';

interface EventDetailsProps {
    event: Event;
}

export function EventDetails({ event }: EventDetailsProps) {
    const textColor = useTextColor();
    const secondaryTextColor = useSecondaryTextColor();
    const backgroundColor = useBackgroundColor();

    const formatDate = (date: Date | string) => {
        const eventDate = typeof date === 'string' ? new Date(date) : date;
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfterTomorrow = new Date(today);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

        if (eventDate.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (eventDate.toDateString() === tomorrow.toDateString()) {
            return 'Tomorrow';
        } else if (eventDate.toDateString() === dayAfterTomorrow.toDateString()) {
            return 'Day After Tomorrow';
        } else {
            // Check if it's within the next 7 days
            const diffTime = eventDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 0 && diffDays <= 7) {
                return eventDate.toLocaleDateString('en-US', {
                    weekday: 'long'
                });
            } else {
                return eventDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    weekday: 'short'
                });
            }
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

    const handleVenuePress = () => {
        if (event.location?.placeId) {
            const mapsUrl = `https://maps.google.com/?q=place_id:${event.location.placeId}`;
            Linking.openURL(mapsUrl);
        }
    };

    const renderRating = (rating?: number) => {
        if (!rating) return null;
        return (
            <ThemedText style={[styles.venueMetaText, { color: secondaryTextColor }]}>
                ⭐ {rating.toFixed(1)}
            </ThemedText>
        );
    };

    const renderPriceLevel = (priceLevel?: number) => {
        if (!priceLevel) return null;
        return (
            <ThemedText style={[styles.venueMetaText, { color: secondaryTextColor }]}>
                {'💰'.repeat(priceLevel)}
            </ThemedText>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor }]}>
            {/* Venue and Time Row */}
            <View style={styles.venueTimeRow}>
                {event.location?.venueName && (
                    <TouchableOpacity
                        style={styles.venueContainer}
                        onPress={handleVenuePress}
                        activeOpacity={0.7}
                    >
                        <ThemedText style={[styles.venueName, { color: textColor }]}>
                            {event.location.venueName}
                        </ThemedText>
                        {event.location.neighborhood && (
                            <ThemedText style={[styles.neighborhood, { color: secondaryTextColor }]}>
                                {event.location.neighborhood}
                            </ThemedText>
                        )}
                        <View style={styles.venueMeta}>
                            {renderRating(event.venueRating)}
                            {renderPriceLevel(event.venuePriceLevel)}
                        </View>
                    </TouchableOpacity>
                )}

                {/* Time Information */}
                <View style={styles.timeContainer}>
                    <ThemedText style={[styles.dateText, { color: textColor }]}>
                        {formatDate(event.date)}
                    </ThemedText>
                    <ThemedText style={[styles.timeText, { color: secondaryTextColor }]}>
                        {formatTime(event.date)}
                    </ThemedText>
                </View>
            </View>

            {/* Description */}
            <View style={styles.descriptionContainer}>
                {event.secondaryPhotoUrl ? (
                    <ImageBackground
                        source={{ uri: event.secondaryPhotoUrl }}
                        style={styles.descriptionBackground}
                        imageStyle={styles.backgroundImage}
                        onError={(error) => console.log('Image loading error:', error)}
                    >
                        <View style={styles.descriptionOverlay}>
                            <ThemedText style={[styles.descriptionText, { color: '#FFFFFF' }]}>
                                {event.description}
                            </ThemedText>
                        </View>
                    </ImageBackground>
                ) : (
                    <ThemedText style={[styles.descriptionText, { color: secondaryTextColor }]}>
                        {event.description}
                    </ThemedText>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    venueTimeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    venueContainer: {
        flex: 1,
        marginRight: 12,
    },
    venueName: {
        fontSize: 22,
        fontWeight: '600',
        marginBottom: 6,
    },
    neighborhood: {
        fontSize: 16,
        marginBottom: 6,
    },
    venueMeta: {
        flexDirection: 'row',
        gap: 8,
    },
    venueMetaText: {
        fontSize: 14,
        fontWeight: '500',
    },
    timeContainer: {
        alignItems: 'flex-end',
    },
    dateText: {
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'right',
    },
    timeText: {
        fontSize: 16,
        textAlign: 'right',
        opacity: 0.8,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 16,
    },
    mapsLink: {
        fontSize: 22,
    },
    descriptionContainer: {
        marginBottom: 24,
    },
    descriptionBackground: {
        borderRadius: 12,
        overflow: 'hidden',
        minHeight: 120,
    },
    backgroundImage: {
        borderRadius: 12,
    },
    descriptionOverlay: {
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        padding: 20,
        minHeight: 120,
        justifyContent: 'center',
    },
    descriptionText: {
        fontSize: 18,
        lineHeight: 26,
    },
}); 