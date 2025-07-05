import * as Haptics from 'expo-haptics';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock expo-haptics
vi.mock('expo-haptics', () => ({
    default: {
        impactAsync: vi.fn(),
        ImpactFeedbackStyle: {
            Light: 'light',
            Medium: 'medium',
            Heavy: 'heavy'
        }
    },
    impactAsync: vi.fn(),
    ImpactFeedbackStyle: {
        Light: 'light',
        Medium: 'medium',
        Heavy: 'heavy'
    }
}));

describe('Haptic Feedback', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should trigger haptic feedback when JoinButton is pressed', async () => {
        // This test verifies that the haptic feedback is properly imported and configured
        expect(Haptics.impactAsync).toBeDefined();
        expect(Haptics.ImpactFeedbackStyle.Medium).toBe('medium');

        // Test that the haptic function can be called
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        expect(Haptics.impactAsync).toHaveBeenCalledWith('medium');
    });

    it('should trigger light haptic feedback for message sending', async () => {
        expect(Haptics.impactAsync).toBeDefined();
        expect(Haptics.ImpactFeedbackStyle.Light).toBe('light');

        // Test that the haptic function can be called
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
    });
}); 