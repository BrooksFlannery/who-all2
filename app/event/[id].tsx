import { EventPage } from '@/components/event/EventPage';
import { Stack } from 'expo-router';
import React from 'react';

export default function EventPageScreen() {
    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: false,
                    presentation: 'modal'
                }}
            />
            <EventPage />
        </>
    );
} 