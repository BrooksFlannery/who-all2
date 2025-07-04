/**
 * Enhanced theme hook for the new color system
 * Provides easy access to colors with automatic theme detection
 */

import { colors, getColor } from '@/constants/Colors';
import { useColorScheme } from 'react-native';

export function useThemeColor(
  colorPath: string,
  fallbackTheme: 'light' | 'dark' = 'light'
): string {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? fallbackTheme;

  return getColor(colorPath, theme);
}

// Convenience hooks for common color categories
export function usePrimaryColor(): string {
  return useThemeColor('primary');
}

export function useBackgroundColor(): string {
  return useThemeColor('background');
}

export function useCardBackgroundColor(): string {
  return useThemeColor('background.card');
}

export function useTextColor(): string {
  return useThemeColor('text');
}

export function useSecondaryTextColor(): string {
  return useThemeColor('text.secondary');
}

export function useBorderColor(): string {
  return useThemeColor('border');
}

export function useShadowColor(): string {
  return useThemeColor('shadow');
}

export function useBackgroundOverlayColor(): string {
  return useThemeColor('background.overlay');
}

// Hook to get category colors
export function useCategoryColor(category: string): string {
  return useThemeColor(`categories.${category}`);
}

// Hook to get gradient colors
export function useGradientColors(gradientType: 'primary' | 'fallback' = 'primary'): string[] {
  const colorScheme = useColorScheme() ?? 'light';
  return colors.gradients[gradientType][colorScheme];
}
