import { useAuth } from '@/components/AuthProvider';
import { EventList } from '@/components/EventList';
import { ThemedText } from '@/components/ThemedText';
import { useBackgroundColor, useBorderColor, useCardBackgroundColor, useErrorColor, usePrimaryColor, useSecondaryBackgroundColor, useSecondaryTextColor, useTextColor } from '@/hooks/useThemeColor';
import { getAuthHeaders } from '@/lib/auth-client';
import { Event, EventCategory } from '@/lib/db/types';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

// Event categories for filtering
const categories = ['Recommended', 'All', 'Fitness', 'Social', 'Creative', 'Technology', 'Education', 'Food', 'Music', 'Outdoors', 'Business', 'Sports', 'Other'] as const;
type CategoryFilter = typeof categories[number];

export default function EventsScreen() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('Recommended');
  const [events, setEvents] = useState<Event[]>([]);
  const [recommendedEvents, setRecommendedEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRecommended, setIsLoadingRecommended] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Theme colors
  const backgroundColor = useBackgroundColor();
  const secondaryBackgroundColor = useSecondaryBackgroundColor();
  const cardBackgroundColor = useCardBackgroundColor();
  const textColor = useTextColor();
  const secondaryTextColor = useSecondaryTextColor();
  const primaryColor = usePrimaryColor();
  const borderColor = useBorderColor();
  const errorColor = useErrorColor();

  // Load recommended events
  const loadRecommendedEvents = async () => {
    setIsLoadingRecommended(true);
    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/events/recommended', {
        headers: authHeaders
      });

      if (response.ok) {
        const data = await response.json();
        setRecommendedEvents(data.events || []);

      } else {
        console.error('Failed to load recommended events');
        setRecommendedEvents([]);
      }
    } catch (error) {
      console.error('Error loading recommended events:', error);
      setRecommendedEvents([]);
    } finally {
      setIsLoadingRecommended(false);
    }
  };

  // Load events from database
  useEffect(() => {
    const loadEvents = async () => {

      try {
        const authHeaders = await getAuthHeaders();


        const response = await fetch('/api/events', {
          headers: authHeaders
        });


        if (response.ok) {
          const data = await response.json();

          if (data.events) {
            setEvents(data.events);
            // Events loaded successfully
          } else {
            // No events found in database
            setEvents([]);
          }
        } else {
          const errorText = await response.text();
          console.error("Events request failed:", errorText);
          setError(`Failed to load events: ${response.status}`);
        }
      } catch (error) {
        console.error('Error loading events:', error);
        setError('Failed to load events');
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, []);

  // Load recommended events when "Recommended" category is selected
  useEffect(() => {
    if (selectedCategory === 'Recommended') {
      loadRecommendedEvents();
    }
  }, [selectedCategory]);

  // handleSignOut function removed as it's not being used

  const filteredEvents = selectedCategory === 'Recommended'
    ? recommendedEvents
    : selectedCategory === 'All'
      ? events
      : events.filter(event => event.categories.includes(selectedCategory.toLowerCase() as EventCategory));



  const isCurrentlyLoading = selectedCategory === 'Recommended'
    ? isLoadingRecommended
    : isLoading;

  if (isCurrentlyLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: secondaryBackgroundColor }]}>
        <ThemedText style={[styles.loadingText, { color: textColor }]}>Loading events...</ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: secondaryBackgroundColor }]}>
        <ThemedText style={[styles.errorText, { color: errorColor }]}>{error}</ThemedText>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: primaryColor }]}
          onPress={() => window.location.reload()}
        >
          <ThemedText style={[styles.retryButtonText, { color: '#FFFFFF' }]}>Retry</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: secondaryBackgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: cardBackgroundColor }]}>
        <ThemedText style={[styles.headerTitle, { color: textColor }]}>Events</ThemedText>
        <ThemedText style={[styles.headerSubtitle, { color: secondaryTextColor }]}>Discover what&apos;s happening around you</ThemedText>
      </View>

      {/* Category Bar */}
      <View style={[styles.categoryBar, { backgroundColor: cardBackgroundColor, borderBottomColor: borderColor }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryBarContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && [styles.selectedCategory, { borderBottomColor: primaryColor }]
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <ThemedText style={[
                styles.categoryButtonText,
                { color: secondaryTextColor },
                selectedCategory === category && [styles.selectedCategoryText, { color: primaryColor }]
              ]}>
                {category}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: secondaryBackgroundColor }]}>
          <ThemedText style={[styles.emptyStateText, { color: textColor }]}>
            {selectedCategory === 'Recommended'
              ? 'No recommended events found'
              : selectedCategory === 'All'
                ? 'No events found'
                : `No ${selectedCategory} events found`
            }
          </ThemedText>
          <ThemedText style={[styles.emptyStateSubtext, { color: secondaryTextColor }]}>
            {selectedCategory === 'Recommended'
              ? 'Try chatting with the AI to get personalized recommendations!'
              : 'Check back later for new events!'
            }
          </ThemedText>
        </View>
      ) : (
        <EventList
          events={filteredEvents}
          onEventPress={(event: Event) => {
            router.push(`/event/${event.id}` as any);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '400',
  },
  categoryBar: {
    paddingVertical: 0,
    borderBottomWidth: 1,
  },
  categoryBarContent: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  selectedCategory: {
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectedCategoryText: {
    fontWeight: '700',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    textAlign: 'center',
  },
});
