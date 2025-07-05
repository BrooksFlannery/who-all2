export default {
    expo: {
        name: "who-all2",
        slug: "who-all2",
        version: "1.0.0",
        orientation: "portrait",
        icon: "./assets/images/icon.png",
        scheme: "whoall2",
        userInterfaceStyle: "automatic",
        newArchEnabled: true,
        ios: {
            supportsTablet: true,
        },
        android: {
            adaptiveIcon: {
                foregroundImage: "./assets/images/adaptive-icon.png",
                backgroundColor: "#ffffff",
            },
            edgeToEdgeEnabled: true,
        },
        web: {
            bundler: "metro",
            output: "server",
            favicon: "./assets/images/favicon.png",
        },
        plugins: [
            "expo-router",
            [
                "expo-splash-screen",
                {
                    image: "./assets/images/splash-icon.png",
                    imageWidth: 200,
                    resizeMode: "contain",
                    backgroundColor: "#ffffff",
                },
            ],
        ],
        experiments: {
            typedRoutes: true,
        },
        extra: {
            EXPO_PUBLIC_DATABASE_URL: process.env.EXPO_PUBLIC_DATABASE_URL || process.env.DATABASE_URL,
            EXPO_PUBLIC_SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_URL || "http://localhost:3001",
            EXPO_PUBLIC_CLIENT_URL: process.env.EXPO_PUBLIC_CLIENT_URL || "http://localhost:8081",
            NODE_ENV: process.env.NODE_ENV || "development",
            LOG_LEVEL: process.env.LOG_LEVEL || "info",
        },
    },
}; 