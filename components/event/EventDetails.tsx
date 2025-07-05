import { CategoryBadge } from '@/components/event/CategoryBadge';
import { ThemedText } from '@/components/ThemedText';
import { useSecondaryTextColor, useTextColor } from '@/hooks/useThemeColor';
import { Event } from '@/lib/db/types';
import React from 'react';
import { Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

interface EventDetailsProps {
    event: Event;
}

export function EventDetails({ event }: EventDetailsProps) {
    const textColor = useTextColor();
    const secondaryTextColor = useSecondaryTextColor();

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



    const renderPriceLevel = (priceLevel?: number) => {
        if (!priceLevel) return null;
        return '💰'.repeat(priceLevel);
    };

    const renderRating = (rating?: number) => {
        if (!rating) return null;
        return `⭐ ${rating.toFixed(1)}`;
    };

    return (
        <View style={styles.container}>
            {/* Date and Time */}
            <View style={styles.dateTimeContainer}>
                <View style={styles.dateContainer}>
                    <ThemedText style={[styles.dateText, { color: textColor }]}>
                        {formatDate(event.date)}
                    </ThemedText>
                    <ThemedText style={[styles.timeText, { color: secondaryTextColor }]}>
                        {formatTime(event.date)}
                    </ThemedText>
                </View>
            </View>

            {/* Venue Information */}
            {event.location?.venueName && (
                <View style={styles.venueContainer}>
                    <ThemedText style={styles.sectionTitle}>Location</ThemedText>
                    <TouchableOpacity
                        style={styles.venueRow}
                        onPress={handleVenuePress}
                        activeOpacity={0.7}
                    >
                        <View style={styles.venueInfo}>
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
                        </View>
                        <ThemedText style={styles.mapsLink}>📍</ThemedText>
                    </TouchableOpacity>
                </View>
            )}

            {/* Categories */}
            {event.categories && event.categories.length > 0 && (
                <View style={styles.categoriesContainer}>
                    <ThemedText style={styles.sectionTitle}>Categories</ThemedText>
                    <View style={styles.categoriesList}>
                        {event.categories.map((category, index) => (
                            <CategoryBadge
                                key={index}
                                category={category}
                                size="medium"
                            />
                        ))}
                    </View>
                </View>
            )}

            {/* Description */}
            <View style={styles.descriptionContainer}>
                <ThemedText style={styles.sectionTitle}>About</ThemedText>
                <ScrollView
                    style={styles.descriptionScroll}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled={true}
                >
                    <ThemedText style={[styles.descriptionText, { color: secondaryTextColor }]}>
                        {event.description}
                    </ThemedText>
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
    },
    dateTimeContainer: {
        marginBottom: 24,
    },
    dateContainer: {
        alignItems: 'flex-start',
    },
    dateText: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    timeText: {
        fontSize: 16,
    },
    venueContainer: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
    },
    venueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        borderRadius: 12,
    },
    venueInfo: {
        flex: 1,
    },
    venueName: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    neighborhood: {
        fontSize: 14,
        marginBottom: 4,
    },
    venueMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    mapsLink: {
        fontSize: 20,
    },
    categoriesContainer: {
        marginBottom: 24,
    },
    categoriesList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },

    descriptionContainer: {
        marginBottom: 24,
    },
    descriptionScroll: {
        maxHeight: 200,
    },
    descriptionText: {
        fontSize: 16,
        lineHeight: 24,
    },
}); 