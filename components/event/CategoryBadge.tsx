import { ThemedText } from '@/components/ThemedText';
import { useCategoryColor } from '@/hooks/useThemeColor';
import { EventCategory } from '@/lib/db/types';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface CategoryBadgeProps {
    category: EventCategory;
    size?: 'small' | 'medium' | 'large';
}

export function CategoryBadge({ category, size = 'medium' }: CategoryBadgeProps) {
    const backgroundColor = useCategoryColor(category);

    const sizeStyles = {
        small: {
            paddingHorizontal: 8,
            paddingVertical: 4,
            fontSize: 10,
        },
        medium: {
            paddingHorizontal: 12,
            paddingVertical: 6,
            fontSize: 12,
        },
        large: {
            paddingHorizontal: 16,
            paddingVertical: 8,
            fontSize: 14,
        },
    };

    const currentSize = sizeStyles[size];

    return (
        <View
            style={[
                styles.badge,
                { backgroundColor },
                {
                    paddingHorizontal: currentSize.paddingHorizontal,
                    paddingVertical: currentSize.paddingVertical,
                }
            ]}
        >
            <ThemedText
                style={[
                    styles.text,
                    { fontSize: currentSize.fontSize }
                ]}
            >
                {category.charAt(0).toUpperCase() + category.slice(1)}
            </ThemedText>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        borderRadius: 16,
        alignSelf: 'flex-start',
    },
    text: {
        fontWeight: '500',
        color: '#FFFFFF', // Keep white for contrast against colored backgrounds
    },
}); 