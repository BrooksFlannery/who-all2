import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/components/AuthProvider';
import { SocketProvider } from '@/components/providers/SocketProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useBackgroundColor, useBorderColor, useCardBackgroundColor, usePrimaryColor, useSecondaryBackgroundColor, useTextColor } from '@/hooks/useThemeColor';

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const { user, isLoading } = useAuth();
  const primaryColor = usePrimaryColor();
  const backgroundColor = useBackgroundColor();
  const secondaryBackgroundColor = useSecondaryBackgroundColor();
  const cardBackgroundColor = useCardBackgroundColor();
  const textColor = useTextColor();
  const borderColor = useBorderColor();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Create custom navigation themes that match our color system
  const customLightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: backgroundColor, // Use main background for navigation
      card: cardBackgroundColor, // Match our card background
      text: textColor, // Match our text color
      border: borderColor, // Match our border color
      primary: '#0a7ea4', // Keep our primary color
      notification: '#FF3B30', // Keep notification color
    },
  };

  const customDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: backgroundColor, // Use main background for navigation
      card: cardBackgroundColor, // Match our card background
      text: textColor, // Match our text color
      border: borderColor, // Match our border color
      primary: '#4ECDC4', // Keep our primary color
      notification: '#FF3B30', // Keep notification color
    },
  };

  if (!loaded || isLoading) {
    // Show loading screen while fonts are loading or auth is checking
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <ThemeProvider value={colorScheme === 'dark' ? customDarkTheme : customLightTheme}>
          <SocketProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: {
                  backgroundColor: backgroundColor, // Use main background for navigation
                },
              }}
            >
              {user ? (
                [
                  <Stack.Screen key="tabs" name="(tabs)" options={{ headerShown: false }} />,
                  <Stack.Screen key="nf" name="+not-found" />
                ]
              ) : (
                [
                  <Stack.Screen key="signin" name="(auth)/sign-in" options={{ headerShown: false }} />
                ]
              )}
            </Stack>
          </SocketProvider>
        </ThemeProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutContent />
    </AuthProvider>
  );
}
