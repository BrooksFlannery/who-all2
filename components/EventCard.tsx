import { Event } from '@/lib/db/types';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface EventCardProps {
    event: Event;
    onPress?: () => void;
    compact?: boolean;
}

export function EventCard({ event, onPress, compact = false }: EventCardProps) {
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
        const colors = {
            fitness: '#FF6B6B',
            social: '#4ECDC4',
            creative: '#45B7D1',
            technology: '#96CEB4',
            education: '#FFEAA7',
            food: '#DDA0DD',
            music: '#98D8C8',
            outdoors: '#F7DC6F',
            business: '#BB8FCE',
            other: '#85C1E9'
        };
        return colors[category as keyof typeof colors] || '#85C1E9';
    };

    return (
        <TouchableOpacity
            style={[styles.eventCard, compact && styles.eventCardCompact]}
            activeOpacity={0.7}
            onPress={onPress}
        >
            <View style={styles.eventHeader}>
                <View style={styles.dateTimeContainer}>
                    <Text style={styles.eventDate}>{formatDate(event.date)}</Text>
                    <Text style={styles.eventTime}>{formatTime(event.date)}</Text>
                </View>
                <View style={styles.categoriesContainer}>
                    {event.categories.map((category, index) => (
                        <View
                            key={index}
                            style={[
                                styles.categoryBadge,
                                { backgroundColor: getCategoryColor(category) }
                            ]}
                        >
                            <Text style={styles.categoryText}>{category}</Text>
                        </View>
                    ))}
                </View>
            </View>

            <Text style={[styles.eventTitle, compact && styles.eventTitleCompact]}>
                {event.title}
            </Text>
            <Text style={[styles.eventDescription, compact && styles.eventDescriptionCompact]}>
                {event.description}
            </Text>

            <View style={styles.eventFooter}>
                <View style={styles.locationContainer}>
                    <Text style={styles.locationText}>
                        📍 {(event.location as any)?.neighborhood || 'San Francisco'}
                    </Text>
                </View>
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{event.attendeesCount}</Text>
                        <Text style={styles.statLabel}>Going</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{event.interestedCount}</Text>
                        <Text style={styles.statLabel}>Interested</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    eventCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    eventCardCompact: {
        padding: 16,
        borderRadius: 12,
        shadowOpacity: 0.06,
        shadowRadius: 6,
    },
    eventHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    dateTimeContainer: {
        flexShrink: 0,
    },
    eventDate: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 2,
    },
    eventTime: {
        fontSize: 14,
        color: '#666666',
        fontWeight: '500',
    },
    categoriesContainer: {
        flexDirection: 'row',
        gap: 6,
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        alignItems: 'flex-start',
        flex: 1,
        marginLeft: 12,
    },
    categoryBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    categoryText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#FFFFFF',
        textTransform: 'capitalize',
    },
    eventTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 8,
        lineHeight: 26,
    },
    eventTitleCompact: {
        fontSize: 18,
        lineHeight: 24,
    },
    eventDescription: {
        fontSize: 15,
        color: '#495057',
        lineHeight: 22,
        marginBottom: 16,
    },
    eventDescriptionCompact: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
    eventFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    locationContainer: {
        flex: 1,
    },
    locationText: {
        fontSize: 14,
        color: '#666666',
        fontWeight: '500',
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 16,
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    statLabel: {
        fontSize: 12,
        color: '#666666',
        fontWeight: '500',
    },
}); 