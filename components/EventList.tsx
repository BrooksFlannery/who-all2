import { Event } from '@/lib/db/types';
import React, { useCallback } from 'react';
import { ListRenderItem, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedRef, useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { EventCard } from './EventCard';

interface EventListProps {
    events: Event[];
    onEventPress?: (event: Event) => void;
    compact?: boolean;
}

export function EventList({ events, onEventPress, compact = false }: EventListProps) {
    const scrollRef = useAnimatedRef<Animated.ScrollView>();
    const scrollY = useSharedValue(0);

    const onScroll = useAnimatedScrollHandler(({ contentOffset }) => {
        scrollY.value = contentOffset.y;
    });

    const renderEventCard: ListRenderItem<Event> = useCallback(({ item, index }) => {
        return (
            <EventCard
                event={item}
                onPress={() => onEventPress?.(item)}
                compact={compact}
                scrollY={scrollY}
                index={index}
            />
        );
    }, [compact, onEventPress, scrollY]);

    const keyExtractor = useCallback((item: Event) => item.id.toString(), []);

    return (
        <View style={styles.container}>
            <Animated.FlatList
                ref={scrollRef as any}
                data={events}
                renderItem={renderEventCard}
                keyExtractor={keyExtractor}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16} // Important for smooth parallax
                onScroll={onScroll}
                contentContainerStyle={styles.contentContainer}
                removeClippedSubviews={true} // Performance optimization
                maxToRenderPerBatch={3} // Limit rendering for better performance
                windowSize={5} // Optimize memory usage
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 32,
    },
}); 