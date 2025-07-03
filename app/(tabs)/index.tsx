import { useAuth } from '@/components/AuthProvider';
import { getAuthHeaders } from '@/lib/auth-client';
import { Event, EventCategory } from '@/lib/db/types';
import React, { useEffect, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Event categories for filtering
const categories = ['Recommended', 'All', 'Fitness', 'Social', 'Creative', 'Technology', 'Education', 'Food', 'Music', 'Outdoors', 'Business', 'Other'] as const;
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

  const formatDate = (date: Date | string) => {
    const eventDate = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (eventDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (eventDate.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return eventDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        weekday: 'short'
      });
    }
  };

  const formatTime = (date: Date | string) => {
    const eventDate = typeof date === 'string' ? new Date(date) : date;
    return eventDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      fitness: '#FF6B6B',
      social: '#4ECDC4',
      creative: '#45B7D1',
      technology: '#96CEB4',
      education: '#FFEAA7',
      food: '#DDA0DD',
      music: '#98D8C8',
      outdoors: '#F7DC6F',
      business: '#BB8FCE',
      other: '#85C1E9'
    };
    return colors[category as keyof typeof colors] || '#85C1E9';
  };

  const renderEventCard = ({ item }: { item: Event }) => (
    <TouchableOpacity style={styles.eventCard} activeOpacity={0.7}>
      <View style={styles.eventHeader}>
        <View style={styles.dateTimeContainer}>
          <Text style={styles.eventDate}>{formatDate(item.date)}</Text>
          <Text style={styles.eventTime}>{formatTime(item.date)}</Text>
        </View>
        <View style={styles.categoriesContainer}>
          {item.categories.map((category, index) => (
            <View
              key={index}
              style={[
                styles.categoryBadge,
                { backgroundColor: getCategoryColor(category) }
              ]}
            >
              <Text style={styles.categoryText}>{category}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.eventTitle}>{item.title}</Text>
      <Text style={styles.eventDescription}>{item.description}</Text>

      <View style={styles.eventFooter}>
        <View style={styles.locationContainer}>
          <Text style={styles.locationText}>
            📍 {(item.location as any)?.neighborhood || 'San Francisco'}
          </Text>
        </View>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{item.attendeesCount}</Text>
            <Text style={styles.statLabel}>Going</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{item.interestedCount}</Text>
            <Text style={styles.statLabel}>Interested</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

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
        <FlatList
          data={filteredEvents}
          renderItem={renderEventCard}
          keyExtractor={(item) => item.id}
          style={styles.eventsList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.eventsListContent}
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
  eventsList: {
    flex: 1,
  },
  eventsListContent: {
    padding: 20,
    gap: 16,
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  dateTimeContainer: {
    flexShrink: 0,
  },
  eventDate: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  categoriesContainer: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    flex: 1,
    marginLeft: 12,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    lineHeight: 26,
  },
  eventDescription: {
    fontSize: 15,
    color: '#495057',
    lineHeight: 22,
    marginBottom: 16,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationContainer: {
    flex: 1,
  },
  locationText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
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
