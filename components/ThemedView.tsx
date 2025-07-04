import { View, type ViewProps } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  // Always call useThemeColor to follow React hooks rules
  const defaultBackgroundColor = useThemeColor('background');

  // Determine the background color to use
  const backgroundColor = lightColor && darkColor ? lightColor : defaultBackgroundColor;

  return (
    <View
      style={[
        { backgroundColor },
        style
      ]}
      {...otherProps}
    />
  );
}
