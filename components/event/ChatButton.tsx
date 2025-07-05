import { ThemedText } from '@/components/ThemedText';
import { useTextColor } from '@/hooks/useThemeColor';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

/**
 * Props for the ChatButton component
 */
interface ChatButtonProps {
    onPress: () => void;
    messageCount?: number;
    disabled?: boolean;
}

/**
 * ChatButton Component
 * 
 * A floating action button that triggers the chat drawer.
 * Features a chat icon, message count badge, and smooth animations.
 * 
 * @component
 * @param {ChatButtonProps} props - Component props
 * @returns {JSX.Element} The rendered chat button
 */
export const ChatButton = React.memo(function ChatButton({
    onPress,
    messageCount = 0,
    disabled = false
}: ChatButtonProps) {
    const textColor = useTextColor();

    const handlePress = () => {
        if (!disabled) {
            onPress();
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.container,
                disabled && styles.disabled
            ]}
            onPress={handlePress}
            disabled={disabled}
            activeOpacity={0.8}
        >
            {/* Chat Icon */}
            <View style={styles.iconContainer}>
                <ThemedText style={[styles.chatIcon, { color: textColor }]}>
                    💬
                </ThemedText>
            </View>

            {/* Message Count Badge */}
            {messageCount > 0 && (
                <View style={styles.badge}>
                    <ThemedText style={styles.badgeText}>
                        {messageCount > 99 ? '99+' : messageCount}
                    </ThemedText>
                </View>
            )}

            {/* Label */}
            <ThemedText style={[styles.label, { color: textColor }]}>
                Chat
            </ThemedText>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 25,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.05)',
    },
    disabled: {
        opacity: 0.5,
    },
    iconContainer: {
        marginRight: 8,
    },
    chatIcon: {
        fontSize: 20,
    },
    badge: {
        position: 'absolute',
        top: -5,
        right: 35,
        backgroundColor: '#FF3B30',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
    },
}); 