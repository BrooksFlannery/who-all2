import { ThemedText } from '@/components/ThemedText';
import { useBackgroundColor, useTextColor } from '@/hooks/useThemeColor';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

/**
 * Props for the ChatBottomBar component
 */
interface ChatBottomBarProps {
    onPress: () => void;
    messageCount?: number;
    disabled?: boolean;
    showJoinMessage?: boolean;
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
export const ChatBottomBar = React.memo(function ChatBottomBar({
    onPress,
    messageCount = 0,
    disabled = false,
    showJoinMessage = false
}: ChatBottomBarProps) {
    const textColor = useTextColor();
    const backgroundColor = useBackgroundColor();

    const handlePress = () => {
        if (!disabled) {
            onPress();
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.container,
                { backgroundColor },
                disabled && styles.disabled
            ]}
            onPress={handlePress}
            disabled={disabled}
            activeOpacity={0.8}
        >
            {/* Title */}
            <View style={styles.titleContainer}>
                <ThemedText style={[styles.title, { color: textColor }]}>
                    Event Chat
                </ThemedText>
                {messageCount > 0 && (
                    <ThemedText style={[styles.subtitle, { color: textColor }]}>
                        {messageCount} message{messageCount !== 1 ? 's' : ''}
                    </ThemedText>
                )}
            </View>

            {/* Join Message */}
            {showJoinMessage && (
                <View style={styles.joinMessageContainer}>
                    <ThemedText style={[styles.joinMessage, { color: textColor }]}>
                        Join to chat
                    </ThemedText>
                </View>
            )}

            {/* Arrow Icon */}
            <ThemedText style={[styles.arrowIcon, { color: textColor }]}>
                →
            </ThemedText>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    container: {
        borderTopWidth: 1,
        borderTopColor: '#E5E5EA',
        paddingHorizontal: 20,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    disabled: {
        opacity: 0.5,
    },
    titleContainer: {
        flex: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 14,
        opacity: 0.6,
        fontWeight: '400',
    },
    arrowIcon: {
        fontSize: 20,
        fontWeight: '500',
    },
    joinMessageContainer: {
        marginRight: 12,
    },
    joinMessage: {
        fontSize: 12,
        opacity: 0.6,
        fontWeight: '400',
    },
}); 