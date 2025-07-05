import { CategoryBadge } from '@/components/event/CategoryBadge';
import { ThemedText } from '@/components/ThemedText';
import { VenuePhoto } from '@/components/VenuePhoto';
import { Event } from '@/lib/db/types';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
    interpolate,
    useAnimatedStyle
} from 'react-native-reanimated';

interface EventHeaderProps {
    event: Event;
    scrollOffset?: Animated.SharedValue<number>;
}

const HEADER_HEIGHT = 300;

export function EventHeader({ event, scrollOffset }: EventHeaderProps) {
    // Remove quotes from title if present
    const cleanTitle = event.title.replace(/^["']|["']$/g, '');

    // Create animated style for parallax effect
    const photoAnimatedStyle = useAnimatedStyle(() => {
        if (!scrollOffset) return {};

        return {
            transform: [
                {
                    translateY: interpolate(
                        scrollOffset.value,
                        [0, HEADER_HEIGHT],
                        [0, HEADER_HEIGHT * 0.2]
                    ),
                },
            ],
        };
    });

    return (
        <View style={styles.container}>
            {/* Venue Photo with Parallax Effect */}
            <Animated.View style={[styles.photoContainer, photoAnimatedStyle]}>
                <VenuePhoto
                    photoReference={event.location?.photoReference}
                    height={HEADER_HEIGHT}
                    borderRadius={0}
                />
            </Animated.View>

            {/* Categories - Top Right */}
            {event.categories && event.categories.length > 0 && (
                <View style={styles.categoriesContainer}>
                    {event.categories.map((category, index) => (
                        <CategoryBadge
                            key={index}
                            category={category}
                            size="small"
                        />
                    ))}
                </View>
            )}

            {/* Title Overlay - Fixed Position */}
            <LinearGradient
                colors={['transparent', 'rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.7)', 'rgba(0, 0, 0, 0.9)']}
                style={styles.titleOverlay}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                <ThemedText style={styles.eventTitle}>{cleanTitle}</ThemedText>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    photoContainer: {
        position: 'relative',
        width: '100%',
        height: HEADER_HEIGHT,
        zIndex: 1,
    },
    titleOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingBottom: 20,
        paddingTop: 100,
        zIndex: 3,
    },
    eventTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
        lineHeight: 34,
    },
    categoriesContainer: {
        position: 'absolute',
        top: 16,
        right: 16,
        flexDirection: 'row',
        gap: 6,
        zIndex: 4,
    },
}); 