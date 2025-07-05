import { ThemedText } from '@/components/ThemedText';
import { useCardBackgroundColor, useTextColor } from '@/hooks/useThemeColor';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

interface UserAvatarProps {
    user: {
        id: string;
        name?: string | null;
        email?: string | null;
        image?: string | null;
    };
    size?: number;
    showBorder?: boolean;
}

export const UserAvatar = React.memo(function UserAvatar({ user, size = 40, showBorder = false }: UserAvatarProps) {
    const backgroundColor = useCardBackgroundColor();
    const textColor = useTextColor();

    // Generate initials from name or email
    const getInitials = () => {
        if (user.name) {
            const names = user.name.split(' ');
            if (names.length >= 2) {
                return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
            }
            return names[0][0]?.toUpperCase() || '?';
        }

        if (user.email) {
            return user.email[0]?.toUpperCase() || '?';
        }

        return '?';
    };

    const containerStyle = [
        styles.container,
        {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: user.image ? 'transparent' : backgroundColor,
            borderWidth: showBorder ? 2 : 0,
            borderColor: showBorder ? textColor : 'transparent',
        }
    ];

    const textStyle = [
        styles.initials,
        {
            fontSize: size * 0.4,
            color: textColor,
        }
    ];

    if (user.image) {
        return (
            <View style={containerStyle}>
                <Image
                    source={{ uri: user.image }}
                    style={[
                        styles.image,
                        {
                            width: size,
                            height: size,
                            borderRadius: size / 2,
                        }
                    ]}
                    resizeMode="cover"
                />
            </View>
        );
    }

    return (
        <View style={containerStyle}>
            <ThemedText style={textStyle}>
                {getInitials()}
            </ThemedText>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    initials: {
        fontWeight: '600',
        textAlign: 'center',
    },
}); 