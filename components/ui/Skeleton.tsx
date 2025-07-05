import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { DimensionValue, StyleSheet, View, ViewStyle } from 'react-native';

interface SkeletonProps {
    width?: DimensionValue;
    height?: number;
    borderRadius?: number;
    style?: ViewStyle;
    testID?: string;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 8, style, testID }: SkeletonProps) {
    return (
        <View testID={testID || 'skeleton'} style={[{ width, height, borderRadius, overflow: 'hidden', backgroundColor: '#E1E5E9' } as ViewStyle, style]}>
            <LinearGradient
                colors={['#E1E5E9', '#F5F5F5', '#E1E5E9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
            />
        </View>
    );
} 