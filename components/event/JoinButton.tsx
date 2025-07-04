import { ThemedText } from '@/components/ThemedText';
import { useBorderColor, useCardBackgroundColor, useTextColor } from '@/hooks/useThemeColor';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';

interface JoinButtonProps {
    status: 'attending' | 'interested';
    currentStatus: 'attending' | 'interested' | null;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
}

export const JoinButton = React.memo(function JoinButton({
    status,
    currentStatus,
    onPress,
    loading = false,
    disabled = false
}: JoinButtonProps) {
    const backgroundColor = useCardBackgroundColor();
    const textColor = useTextColor();
    const borderColor = useBorderColor();

    // Determine button state
    const isActive = currentStatus === status;
    const isDisabled = disabled || loading;

    // Get button text based on status and current state
    const getButtonText = () => {
        if (loading) return '...';

        if (status === 'attending') {
            return 'Attending';
        } else {
            return 'Interested';
        }
    };

    // Get button styles based on state
    const getButtonStyle = () => {
        if (isDisabled) {
            return [
                styles.button,
                styles.disabled,
                { backgroundColor: backgroundColor, borderColor: borderColor }
            ];
        }

        if (isActive) {
            return [
                styles.button,
                styles.active,
                { backgroundColor: '#007AFF' }
            ];
        }

        // Different style for switching between statuses
        if (currentStatus && currentStatus !== status) {
            return [
                styles.button,
                styles.switch,
                {
                    backgroundColor: backgroundColor,
                    borderColor: '#007AFF'
                }
            ];
        }

        return [
            styles.button,
            styles.inactive,
            {
                backgroundColor: backgroundColor,
                borderColor: borderColor
            }
        ];
    };

    const getTextStyle = () => {
        if (isDisabled) {
            return [styles.text, styles.disabledText, { color: textColor }];
        }

        if (isActive) {
            return [styles.text, styles.activeText, { color: '#FFFFFF' }];
        }

        // Different text style for switching between statuses
        if (currentStatus && currentStatus !== status) {
            return [styles.text, styles.switchText, { color: '#007AFF' }];
        }

        return [styles.text, styles.inactiveText, { color: textColor }];
    };

    const handlePress = () => {
        if (!isDisabled) {
            // Add haptic feedback
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onPress();
        }
    };

    return (
        <TouchableOpacity
            style={getButtonStyle()}
            onPress={handlePress}
            disabled={isDisabled}
            activeOpacity={0.7}
        >
            {loading ? (
                <ActivityIndicator size="small" color={isActive ? '#FFFFFF' : '#007AFF'} />
            ) : (
                <ThemedText style={getTextStyle()}>
                    {getButtonText()}
                </ThemedText>
            )}
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    button: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 50,
        width: 80,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    active: {
        borderColor: '#007AFF',
    },
    inactive: {
        // borderColor will be set dynamically
    },
    switch: {
        borderColor: '#007AFF',
        borderWidth: 2,
    },
    disabled: {
        // borderColor will be set dynamically
        opacity: 0.5,
    },
    text: {
        fontSize: 12,
        fontWeight: '600',
    },
    activeText: {
        color: '#FFFFFF',
    },
    inactiveText: {
        color: '#007AFF',
    },
    switchText: {
        color: '#007AFF',
        fontWeight: '700',
    },
    disabledText: {
        opacity: 0.5,
    },
}); 