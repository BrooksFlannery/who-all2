declare module 'react-native-parallax-scroll-view' {
    import { ComponentType } from 'react';
    import { ViewStyle } from 'react-native';

    interface ParallaxScrollViewProps {
        parallaxHeaderHeight: number;
        renderForeground: () => React.ReactElement;
        renderBackground?: () => React.ReactElement;
        contentContainerStyle?: ViewStyle;
        showsVerticalScrollIndicator?: boolean;
        scrollEventThrottle?: number;
        children?: React.ReactNode;
        onScroll?: (event: any) => void;
        style?: ViewStyle;
    }

    const ParallaxScrollView: ComponentType<ParallaxScrollViewProps>;
    export default ParallaxScrollView;
} 