import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { DimensionValue, StyleSheet, View, ViewStyle, useColorScheme } from 'react-native';

interface SkeletonProps {
    width?: DimensionValue;
    height?: number;
    borderRadius?: number;
    style?: ViewStyle;
    testID?: string;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 8, style, testID }: SkeletonProps) {
    const colorScheme = useColorScheme();

    // Use different colors for light and dark mode
    const skeletonColor = colorScheme === 'dark' ? '#3A3A3A' : '#E1E5E9';
    const gradientColors = colorScheme === 'dark'
        ? ['#3A3A3A', '#4A4A4A', '#3A3A3A'] as const
        : ['#E1E5E9', '#F5F5F5', '#E1E5E9'] as const;

    return (
        <View testID={testID || 'skeleton'} style={[{ width, height, borderRadius, overflow: 'hidden', backgroundColor: skeletonColor } as ViewStyle, style]}>
            <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
            />
        </View>
    );
} 