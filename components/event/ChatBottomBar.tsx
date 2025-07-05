import { ThemedText } from '@/components/ThemedText';
import { useBackgroundColor, useBorderColor, useCardBackgroundColor, useTextColor } from '@/hooks/useThemeColor';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

/**
 * Props for the ChatBottomBar component
 */
interface ChatBottomBarProps {
    onPress: () => void;
    messageCount: number;
    unreadCount: number;
}

/**
 * ChatBottomBar Component
 * 
 * A bottom bar that displays the event chat title and message count.
 * When tapped, it opens the chat drawer.
 * 
 * @component
 * @param {ChatBottomBarProps} props - Component props
 * @returns {JSX.Element} The rendered chat bottom bar
 */
export function ChatBottomBar({ onPress, messageCount, unreadCount }: ChatBottomBarProps) {
    const backgroundColor = useBackgroundColor();
    const cardBackgroundColor = useCardBackgroundColor();
    const textColor = useTextColor();
    const borderColor = useBorderColor();

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
    };

    return (
        <View style={[styles.container, { backgroundColor: cardBackgroundColor, borderTopColor: borderColor }]}>
            <TouchableOpacity
                style={styles.button}
                onPress={handlePress}
                activeOpacity={0.7}
            >
                <View style={styles.content}>
                    <View style={styles.iconContainer}>
                        {unreadCount > 0 && (
                            <View style={styles.badge}>
                                <ThemedText style={styles.badgeText}>
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </ThemedText>
                            </View>
                        )}
                    </View>
                    <View style={styles.textContainer}>
                        <ThemedText style={[styles.title, { color: textColor }]}>
                            Event Chat
                        </ThemedText>
                        <ThemedText style={[styles.subtitle, { color: textColor }]}>
                            {messageCount} {messageCount === 1 ? 'message' : 'messages'}
                            {unreadCount > 0 && ` • ${unreadCount} new`}
                        </ThemedText>
                    </View>
                </View>
                <ThemedText style={[styles.chevron, { color: textColor }]}>›</ThemedText>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderTopWidth: 0.5,
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        position: 'relative',
        marginRight: 12,
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#FF3B30',
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '600',
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 14,
        opacity: 0.6,
    },
    chevron: {
        fontSize: 18,
        fontWeight: '600',
        opacity: 0.6,
    },
}); 