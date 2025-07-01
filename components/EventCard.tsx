import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';

export interface EventCardProps {
    id: string;
    title: string;
    description: string;
    categories: string[];
    attendeesCount: number;
    interestedCount: number;
    location?: {
        neighborhood?: string;
    };
    similarityScore?: number;
    onPress?: () => void;
    compact?: boolean;
}

export function EventCard({
    id,
    title,
    description,
    categories,
    attendeesCount,
    interestedCount,
    location,
    similarityScore,
    onPress,
    compact = false
}: EventCardProps) {
    const CardComponent = onPress ? TouchableOpacity : View;
    const cardProps = onPress ? { onPress, activeOpacity: 0.7 } : {};

    return (
        <CardComponent style={[styles.container, compact && styles.compact]} {...cardProps}>
            <View style={styles.header}>
                <ThemedText style={styles.title} numberOfLines={2}>
                    {title}
                </ThemedText>
                {similarityScore !== undefined && (
                    <View style={styles.similarityBadge}>
                        <ThemedText style={styles.similarityText}>
                            {Math.round(similarityScore * 100)}% match
                        </ThemedText>
                    </View>
                )}
            </View>

            <ThemedText style={[styles.description, compact && styles.compactDescription]} numberOfLines={compact ? 2 : 3}>
                {description}
            </ThemedText>

            <View style={styles.footer}>
                <View style={styles.categories}>
                    {categories.slice(0, 2).map((category, index) => (
                        <View key={index} style={styles.categoryBadge}>
                            <ThemedText style={styles.categoryText}>
                                {category}
                            </ThemedText>
                        </View>
                    ))}
                    {categories.length > 2 && (
                        <ThemedText style={styles.moreCategories}>
                            +{categories.length - 2} more
                        </ThemedText>
                    )}
                </View>

                <View style={styles.stats}>
                    {location?.neighborhood && (
                        <View style={styles.stat}>
                            <ThemedText style={styles.statLabel}>📍</ThemedText>
                            <ThemedText style={styles.statText}>{location.neighborhood}</ThemedText>
                        </View>
                    )}
                    <View style={styles.stat}>
                        <ThemedText style={styles.statLabel}>👥</ThemedText>
                        <ThemedText style={styles.statText}>{attendeesCount + interestedCount}</ThemedText>
                    </View>
                </View>
            </View>
        </CardComponent>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginVertical: 8,
        marginHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    compact: {
        padding: 12,
        marginVertical: 4,
        marginHorizontal: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        flex: 1,
        marginRight: 8,
    },
    similarityBadge: {
        backgroundColor: '#10B981',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    similarityText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    description: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
        marginBottom: 12,
    },
    compactDescription: {
        fontSize: 13,
        marginBottom: 8,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    categories: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    categoryBadge: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginRight: 6,
    },
    categoryText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#374151',
    },
    moreCategories: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    stats: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 12,
    },
    statLabel: {
        fontSize: 14,
        marginRight: 4,
    },
    statText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
}); 