import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/components/AuthProvider';
import { SocketProvider } from '@/components/providers/SocketProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import { usePrimaryColor } from '@/hooks/useThemeColor';

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const { user, isLoading } = useAuth();
  const primaryColor = usePrimaryColor();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded || isLoading) {
    // Show loading screen while fonts are loading or auth is checking
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SocketProvider>
        <Stack>
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
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutContent />
    </AuthProvider>
  );
}
