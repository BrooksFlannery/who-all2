/**
 * Comprehensive color system for the app with dark mode support
 * All colors are organized by category and support both light and dark themes
 */

// Base color palette
const colors = {
  // Primary brand colors
  primary: {
    light: '#0a7ea4',
    dark: '#4ECDC4',
  },

  // Secondary colors
  secondary: {
    light: '#687076',
    dark: '#9BA1A6',
  },

  // Background colors
  background: {
    light: '#F8F9FA',
    dark: '#0F0F0F',
    secondary: {
      light: '#E8E8E8',
      dark: '#1F1F1F',
    },
    card: {
      light: '#FFFFFF',
      dark: '#0F0F0F',
    },
    message: {
      light: '#F0F0F0',
      dark: '#2A2A2A',
    },
    overlay: {
      light: 'rgba(0, 0, 0, 0.4)',
      dark: 'rgba(0, 0, 0, 0.6)',
    },
  },

  // Text colors
  text: {
    light: '#11181C',
    dark: '#ECEDEE',
    secondary: {
      light: '#666666',
      dark: '#9BA1A6',
    },
    tertiary: {
      light: '#495057',
      dark: '#687076',
    },
    inverse: {
      light: '#FFFFFF',
      dark: '#11181C',
    },
  },

  // Semantic colors
  success: {
    light: '#4CAF50',
    dark: '#66BB6A',
  },

  warning: {
    light: '#FF9800',
    dark: '#FFB74D',
  },

  error: {
    light: '#F44336',
    dark: '#EF5350',
  },

  info: {
    light: '#2196F3',
    dark: '#42A5F5',
  },

  // Category colors for events
  categories: {
    fitness: {
      light: '#FF6B6B',
      dark: '#FF8A80',
    },
    social: {
      light: '#4ECDC4',
      dark: '#80CBC4',
    },
    creative: {
      light: '#45B7D1',
      dark: '#81C784',
    },
    technology: {
      light: '#96CEB4',
      dark: '#A5D6A7',
    },
    education: {
      light: '#FFEAA7',
      dark: '#FFF59D',
    },
    food: {
      light: '#DDA0DD',
      dark: '#E1BEE7',
    },
    music: {
      light: '#98D8C8',
      dark: '#B2DFDB',
    },
    outdoors: {
      light: '#F7DC6F',
      dark: '#FFEB3B',
    },
    business: {
      light: '#BB8FCE',
      dark: '#CE93D8',
    },
    other: {
      light: '#85C1E9',
      dark: '#90CAF9',
    },
  },

  // Border and divider colors
  border: {
    light: '#E1E5E9',
    dark: '#2A2A2A',
  },

  // Shadow colors
  shadow: {
    light: 'rgba(0, 0, 0, 0.08)',
    dark: 'rgba(0, 0, 0, 0.3)',
  },

  // Gradient colors
  gradients: {
    primary: {
      light: ['#0a7ea4', '#4ECDC4'],
      dark: ['#4ECDC4', '#0a7ea4'],
    },
    fallback: {
      light: ['#667eea', '#764ba2'],
      dark: ['#764ba2', '#667eea'],
    },
  },
};

// Helper function to get color based on theme
export function getColor(colorPath: string, theme: 'light' | 'dark' = 'light'): string {
  const path = colorPath.split('.');
  let current: any = colors;

  // Traverse the path step-by-step
  for (const key of path) {
    if (!(key in current)) {
      // Invalid path – fallback to brand primary
      return colors.primary.light;
    }
    current = current[key];
  }

  // At the end of traversal, determine the correct value
  if (typeof current === 'object' && 'light' in current && 'dark' in current) {
    return current[theme];
  }

  if (typeof current === 'string') {
    return current;
  }

  // Final safeguard – fallback to brand primary
  return colors.primary.light;
}

// Main Colors export for backward compatibility
export const Colors = {
  light: {
    text: colors.text.light,
    background: colors.background.light,
    tint: colors.primary.light,
    icon: colors.secondary.light,
    tabIconDefault: colors.secondary.light,
    tabIconSelected: colors.primary.light,
  },
  dark: {
    text: colors.text.dark,
    background: colors.background.dark,
    tint: colors.primary.dark,
    icon: colors.secondary.dark,
    tabIconDefault: colors.secondary.dark,
    tabIconSelected: colors.primary.dark,
  },
};

// Export the full color system
export { colors };
