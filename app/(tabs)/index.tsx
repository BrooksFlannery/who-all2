import { useAuth } from '@/components/AuthProvider';
import { EventList } from '@/components/EventList';
import { getAuthHeaders } from '@/lib/auth-client';
import { Event, EventCategory } from '@/lib/db/types';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Event categories for filtering
const categories = ['Recommended', 'All', 'Fitness', 'Social', 'Creative', 'Technology', 'Education', 'Food', 'Music', 'Outdoors', 'Business', 'Sports', 'Other'] as const;
type CategoryFilter = typeof categories[number];

export default function EventsScreen() {
  const { user, signOut } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('Recommended');
  const [events, setEvents] = useState<Event[]>([]);
  const [recommendedEvents, setRecommendedEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRecommended, setIsLoadingRecommended] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        console.log('Loaded', data.events?.length || 0, 'recommended events');
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
      console.log("=== Loading events from database ===");
      try {
        const authHeaders = await getAuthHeaders();
        console.log("Auth headers for events request:", authHeaders);

        const response = await fetch('/api/events', {
          headers: authHeaders
        });
        console.log("Events response status:", response.status);

        if (response.ok) {
          const data = await response.json();
          console.log("Events response data:", data);
          if (data.events) {
            setEvents(data.events);
            console.log('Loaded', data.events.length, 'events from database');
          } else {
            console.log('No events found in database');
            setEvents([]);
          }
        } else {
          console.log("Events request failed with status:", response.status);
          const errorText = await response.text();
          console.log("Events error response:", errorText);
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

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

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
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => window.location.reload()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Events</Text>
        <Text style={styles.headerSubtitle}>Discover what's happening around you</Text>
      </View>

      {/* Category Bar */}
      <View style={styles.categoryBar}>
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
                selectedCategory === category && styles.selectedCategory
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[
                styles.categoryButtonText,
                selectedCategory === category && styles.selectedCategoryText
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateEmoji}>🎉</Text>
          <Text style={styles.emptyStateText}>
            {selectedCategory === 'Recommended'
              ? 'No recommended events found'
              : selectedCategory === 'All'
                ? 'No events found'
                : `No ${selectedCategory} events found`
            }
          </Text>
          <Text style={styles.emptyStateSubtext}>
            {selectedCategory === 'Recommended'
              ? 'Try chatting with the AI to get personalized recommendations!'
              : 'Check back later for new events!'
            }
          </Text>
        </View>
      ) : (
        <EventList
          events={filteredEvents}
          onEventPress={(event: Event) => {
            // TODO: Navigate to event detail view
            console.log('Event pressed:', event.id);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '400',
  },
  categoryBar: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
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
    backgroundColor: 'transparent',
  },
  selectedCategory: {
    borderBottomColor: '#007AFF',
    backgroundColor: 'transparent',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C757D',
  },
  selectedCategoryText: {
    color: '#007AFF',
    fontWeight: '700',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#495057',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#DC3545',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
    color: '#495057',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
  },
});
