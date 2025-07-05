import { useGradientColors } from '@/hooks/useThemeColor';
import { getAuthHeaders } from '@/lib/auth-client';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';

interface VenuePhotoProps {
    photoReference?: string;
    height: number;
    borderRadius?: number;
}

export function VenuePhoto({ photoReference, height, borderRadius = 0 }: VenuePhotoProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const fadeAnim = useState(new Animated.Value(0))[0];
    const gradientColors = useGradientColors('fallback');

    useEffect(() => {


        if (!photoReference) {

            setIsLoading(false);
            setHasError(true);
            return;
        }

        // Fetch the actual photo URL from our backend API
        const fetchPhotoUrl = async () => {
            try {

                setIsLoading(true);
                setHasError(false);

                const authHeaders = await getAuthHeaders();
                const response = await fetch(`/api/places/photo?photoReference=${encodeURIComponent(photoReference)}&maxWidth=800`, {
                    headers: authHeaders
                });



                if (response.ok) {
                    const data = await response.json();

                    setImageUrl(data.photoUrl);
                } else {
                    const errorText = await response.text();
                    console.warn('VenuePhoto: Failed to fetch photo URL:', response.status, errorText);
                    setHasError(true);
                }
            } catch (error) {
                console.error('VenuePhoto: Failed to fetch venue photo:', error);
                setHasError(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPhotoUrl();
    }, [photoReference]);

    useEffect(() => {
        if (!isLoading && !hasError && imageUrl) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [isLoading, hasError, imageUrl, fadeAnim]);

    if (isLoading) {
        return (
            <View style={[styles.skeleton, { height, borderRadius }]}>
                <LinearGradient
                    colors={['#E1E5E9', '#F5F5F5', '#E1E5E9']}
                    style={styles.skeletonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                />
            </View>
        );
    }

    if (hasError || !imageUrl) {
        return (
            <LinearGradient
                colors={gradientColors as [string, string]}
                style={[styles.gradientFallback, { height, borderRadius }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
        );
    }

    return (
        <Animated.View style={{ opacity: fadeAnim }}>
            <Image
                source={{ uri: imageUrl }}
                style={[styles.image, { height, borderRadius }]}
                resizeMode="cover"
                onLoad={() => { }}
                onError={(error) => console.error('VenuePhoto: Image failed to load:', error.nativeEvent)}
            />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    skeleton: {
        overflow: 'hidden',
    },
    skeletonGradient: {
        flex: 1,
    },
    gradientFallback: {
        // Gradient fallback styling
    },
    image: {
        width: '100%',
    },
}); 