import { ThemedText } from '@/components/ThemedText';
import { useCardBackgroundColor, useTextColor } from '@/hooks/useThemeColor';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
    Extrapolate,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { UserAvatar } from './UserAvatar';

interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
}

interface AttendeeListProps {
    users: User[];
    maxVisible?: number;
    overlap?: number;
    onUserPress?: (user: User) => void;
}

const AVATAR_SIZE = 28;
const ANIMATION_DURATION = 300;
const SPRING_CONFIG = {
    damping: 15,
    stiffness: 150,
    mass: 1
};

export const AttendeeList = React.memo(function AttendeeList({
    users,
    maxVisible = 8,
    overlap = 0.5,
    onUserPress
}: AttendeeListProps) {
    const [expanded, setExpanded] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const backgroundColor = useCardBackgroundColor();
    const textColor = useTextColor();

    // Animation values
    const expandAnimation = useSharedValue(0);
    const entranceAnimations = useRef<{ [key: string]: Animated.SharedValue<number> }>({});
    const pressAnimations = useRef<{ [key: string]: Animated.SharedValue<number> }>({});

    const visibleUsers = expanded ? users : users.slice(0, maxVisible);
    const hasMoreUsers = users.length > maxVisible;
    const hiddenCount = users.length - maxVisible;

    // Initialize entrance animations for new users
    useEffect(() => {
        // Simplified animation logic to avoid hook violations
        users.forEach(user => {
            if (!entranceAnimations.current[user.id]) {
                entranceAnimations.current[user.id] = { value: 1 };
                pressAnimations.current[user.id] = { value: 1 };
            }
        });
    }, [users]);

    const handleUserPress = (user: User) => {
        // Press animation
        const pressAnim = pressAnimations.current[user.id];
        if (pressAnim) {
            pressAnim.value = withTiming(0.8, { duration: 100 }, () => {
                pressAnim.value = withSpring(1, SPRING_CONFIG);
            });
        }

        if (onUserPress) {
            onUserPress(user);
        }
    };

    const handleExpandPress = () => {
        if (isAnimating) return;

        setIsAnimating(true);
        expandAnimation.value = withTiming(1, { duration: ANIMATION_DURATION }, () => {
            runOnJS(setExpanded)(true);
            runOnJS(setIsAnimating)(false);
        });
    };

    const moreButtonAnimatedStyle = useAnimatedStyle(() => {
        const scale = interpolate(
            expandAnimation.value,
            [0, 1],
            [1, 0.8],
            Extrapolate.CLAMP
        );

        const opacity = interpolate(
            expandAnimation.value,
            [0, 1],
            [1, 0],
            Extrapolate.CLAMP
        );

        return {
            transform: [{ scale }],
            opacity
        };
    });

    const getAvatarAnimatedStyle = (user: User, index: number) => {
        const entranceAnim = entranceAnimations.current[user.id];
        const pressAnim = pressAnimations.current[user.id];

        if (!entranceAnim || !pressAnim) return {};

        // Simple style without animations for now to fix hook violations
        return {
            transform: [{ scale: 1 }],
            opacity: 1
        };
    };

    if (users.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <ThemedText style={[styles.emptyText, { color: textColor }]}>
                    No attendees yet
                </ThemedText>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
            >
                {visibleUsers.map((user, index) => (
                    <Animated.View
                        key={user.id}
                        style={[
                            styles.avatarContainer,
                            {
                                marginLeft: index === 0 ? 0 : -overlap * AVATAR_SIZE,
                                zIndex: visibleUsers.length - index
                            },
                            getAvatarAnimatedStyle(user, index)
                        ]}
                    >
                        <TouchableOpacity
                            onPress={() => handleUserPress(user)}
                            activeOpacity={0.7}
                            style={styles.avatarTouchable}
                        >
                            <UserAvatar
                                user={user}
                                size={AVATAR_SIZE}
                                showBorder={true}
                            />
                        </TouchableOpacity>
                    </Animated.View>
                ))}

                {!expanded && hasMoreUsers && (
                    <Animated.View style={moreButtonAnimatedStyle}>
                        <TouchableOpacity
                            style={[
                                styles.moreButton,
                                {
                                    marginLeft: -overlap * AVATAR_SIZE,
                                    backgroundColor: backgroundColor,
                                    borderColor: textColor,
                                }
                            ]}
                            onPress={handleExpandPress}
                            activeOpacity={0.7}
                            disabled={isAnimating}
                        >
                            <ThemedText style={[styles.moreText, { color: textColor }]}>
                                +{hiddenCount}
                            </ThemedText>
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </ScrollView>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        marginVertical: 8,
    },
    scrollView: {
        flexGrow: 0,
    },
    scrollContent: {
        paddingRight: 16,
    },
    avatarContainer: {
        // Container for each avatar with proper spacing
    },
    avatarTouchable: {
        // Touchable area for avatar
    },
    moreButton: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    moreText: {
        fontSize: 10,
        fontWeight: '600',
    },
    emptyContainer: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        opacity: 0.6,
    },
}); 