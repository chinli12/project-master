import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ImageBackground, Alert, TextInput, ScrollView } from 'react-native';
import { Plus, Clock, Search, TrendingUp, MapPin, Calendar, Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

interface Event {
  id: string;
  name: string;
  description: string;
  date: string;
  time: string;
  location: string;
  image_url: string;
  created_by: string;
  created_at?: string;
  attendees_count?: number;
}

// Mock events for trending functionality
const mockEvents: Event[] = [
  {
    id: '1',
    name: 'Heritage Walking Tour',
    description: 'Explore the historic downtown district',
    date: '2024-01-15',
    time: '10:00 AM',
    location: 'Downtown Heritage District',
    image_url: 'https://images.pexels.com/photos/1707310/pexels-photo-1707310.jpeg',
    created_by: 'user1',
    attendees_count: 156
  },
  {
    id: '2',
    name: 'Photography Workshop',
    description: 'Learn to capture historic architecture',
    date: '2024-01-18',
    time: '2:00 PM',
    location: 'Cathedral Square',
    image_url: 'https://images.pexels.com/photos/606539/pexels-photo-606539.jpeg',
    created_by: 'user2',
    attendees_count: 89
  },
  {
    id: '3',
    name: 'Local Stories Meetup',
    description: 'Share and hear stories from the past',
    date: '2024-01-20',
    time: '7:00 PM',
    location: 'Community Center',
    image_url: 'https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg',
    created_by: 'user3',
    attendees_count: 234
  }
];

export default function EventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'popular' | 'recent' | 'thisweek' | 'today'>('all');

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase.from('events').select('*');
      if (error) {
        console.error('Error fetching events:', error);
        // Use mock data as fallback if there's an error
        setEvents(mockEvents);
        setFilteredEvents(mockEvents);
        return;
      }

      if (data && data.length > 0) {
        // For real events from database, get actual attendee counts
        const eventsWithCounts = await Promise.all(
          data.map(async (event) => {
            const { data: attendeesData, error: attendeesError } = await supabase
              .from('event_attendees')
              .select('*', { count: 'exact', head: true })
              .eq('event_id', event.id);

            return {
              ...event,
              attendees_count: attendeesError ? 0 : (attendeesData || 0)
            };
          })
        );
        setEvents(eventsWithCounts);
        setFilteredEvents(eventsWithCounts);
      } else {
        // Use mock data if no events in database
        setEvents(mockEvents);
        setFilteredEvents(mockEvents);
      }
    };

    fetchEvents();
  }, []);

  useEffect(() => {
    console.log('Filter effect triggered:', { activeFilter, searchQuery, eventsCount: events.length });
    
    let filtered = [...events];
    
    // Apply search filter first
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(event => 
        event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply active filter
    switch (activeFilter) {
      case 'popular':
        console.log('Applying popular filter');
        filtered.sort((a, b) => (b.attendees_count || 0) - (a.attendees_count || 0));
        break;
      case 'recent':
        console.log('Applying recent filter');
        filtered.sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());
        break;
      case 'thisweek':
        console.log('Applying this week filter');
        const oneWeekFromNow = new Date();
        oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
        const today = new Date();
        filtered = filtered.filter(event => {
          const eventDate = new Date(event.date);
          return eventDate >= today && eventDate <= oneWeekFromNow;
        });
        break;
      case 'today':
        console.log('Applying today filter');
        const todayStr = new Date().toISOString().split('T')[0];
        filtered = filtered.filter(event => event.date === todayStr);
        break;
      default:
        console.log('No filter applied (all)');
        break;
    }
    
    console.log('Final filtered events:', filtered.length);
    setFilteredEvents(filtered);
  }, [searchQuery, events, activeFilter]);

  const renderSearchAndFilters = () => (
    <View style={styles.modernSearchContainer}>
      <View style={styles.modernSearchBar}>
        <Search size={18} color="#9CA3AF" />
        <TextInput
          style={styles.modernSearchInput}
          placeholder="Discover events, workshops, meetups..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.modernClearButton}>
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.modernQuickFilters}
        contentContainerStyle={styles.modernQuickFiltersContent}
      >
        <TouchableOpacity 
          style={[
            styles.modernFilterChip,
            activeFilter === 'popular' && {
              backgroundColor: '#8B5CF6',
              borderColor: '#8B5CF6',
            }
          ]}
          onPress={() => {
            console.log('Popular filter clicked, current filter:', activeFilter);
            setActiveFilter(activeFilter === 'popular' ? 'all' : 'popular');
          }}
        >
          <TrendingUp size={16} color={activeFilter === 'popular' ? '#FFFFFF' : '#8B5CF6'} />
          <Text style={[
            styles.modernFilterText,
            activeFilter === 'popular' && { color: '#FFFFFF' }
          ]}>Popular</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.modernFilterChip,
            activeFilter === 'thisweek' && {
              backgroundColor: '#8B5CF6',
              borderColor: '#8B5CF6',
            }
          ]}
          onPress={() => {
            console.log('This Week filter clicked, current filter:', activeFilter);
            setActiveFilter(activeFilter === 'thisweek' ? 'all' : 'thisweek');
          }}
        >
          <Calendar size={16} color={activeFilter === 'thisweek' ? '#FFFFFF' : '#8B5CF6'} />
          <Text style={[
            styles.modernFilterText,
            activeFilter === 'thisweek' && { color: '#FFFFFF' }
          ]}>This Week</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.modernFilterChip,
            activeFilter === 'recent' && {
              backgroundColor: '#8B5CF6',
              borderColor: '#8B5CF6',
            }
          ]}
          onPress={() => {
            console.log('Recent filter clicked, current filter:', activeFilter);
            setActiveFilter(activeFilter === 'recent' ? 'all' : 'recent');
          }}
        >
          <MapPin size={16} color={activeFilter === 'recent' ? '#FFFFFF' : '#8B5CF6'} />
          <Text style={[
            styles.modernFilterText,
            activeFilter === 'recent' && { color: '#FFFFFF' }
          ]}>Recent</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.modernFilterChip,
            activeFilter === 'today' && {
              backgroundColor: '#8B5CF6',
              borderColor: '#8B5CF6',
            }
          ]}
          onPress={() => {
            console.log('Today filter clicked, current filter:', activeFilter);
            setActiveFilter(activeFilter === 'today' ? 'all' : 'today');
          }}
        >
          <Clock size={16} color={activeFilter === 'today' ? '#FFFFFF' : '#8B5CF6'} />
          <Text style={[
            styles.modernFilterText,
            activeFilter === 'today' && { color: '#FFFFFF' }
          ]}>Today</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderTrendingEvents = () => {
    // Sort events by attendees count to determine trending
    const trendingEvents = [...filteredEvents]
      .sort((a, b) => (b.attendees_count || 0) - (a.attendees_count || 0))
      .slice(0, 3);

    if (trendingEvents.length === 0) {
      return null;
    }

    return (
      <View style={styles.trendingSection}>
        <View style={styles.trendingHeader}>
          <TrendingUp size={20} color="#8B5CF6" />
          <Text style={styles.trendingTitle}>Trending Events</Text>
          <View style={styles.trendingBadge}>
            <Text style={styles.trendingBadgeText}>🔥 Hot</Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.trendingScroll}>
          {trendingEvents.map((event, index) => (
            <TouchableOpacity 
              key={`trending-${event.id}`} 
              style={styles.trendingCard}
              onPress={() => router.push({ pathname: '/event-details', params: { event: JSON.stringify(event) } })}
            >
              <ImageBackground
                source={{ uri: event.image_url || `https://picsum.photos/seed/${event.id}/400/200` }}
                style={styles.trendingImage}
                imageStyle={{ borderRadius: 20 }}
              >
                <View style={styles.trendingOverlay}>
                  <Text style={styles.trendingEventName} numberOfLines={2}>{event.name}</Text>
                  <View style={styles.trendingStats}>
                    <Users size={12} color="#FFFFFF" />
                    <Text style={styles.trendingStatText}>{String(event.attendees_count || 0)} attending</Text>
                  </View>
                </View>
                {index === 0 && (
                  <View style={styles.trendingRank}>
                    <Text style={styles.trendingRankText}>#1</Text>
                  </View>
                )}
              </ImageBackground>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderItem = ({ item }: { item: Event }) => (
    <TouchableOpacity style={styles.eventCard} onPress={() => router.push({ pathname: '/event-details', params: { event: JSON.stringify(item) } })}>
      <ImageBackground
        source={{ uri: item.image_url || `https://picsum.photos/seed/${item.id}/400/200` }}
        style={styles.eventImage}
        imageStyle={{ borderRadius: 12 }}
      >
        <View style={styles.overlay}>
          <View style={styles.dateContainer}>
            <Text style={styles.eventDate}>{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
          </View>
          <View style={styles.eventInfo}>
            <Text style={styles.eventName}>{item.name}</Text>
            <View style={styles.timeContainer}>
              <Clock size={14} color="rgba(255, 255, 255, 0.8)" />
              <Text style={styles.eventTime}>{item.time}</Text>
            </View>
            <View style={styles.locationContainer}>
              <MapPin size={14} color="rgba(255, 255, 255, 0.8)" />
              <Text style={styles.eventLocation}>{item.location}</Text>
            </View>
            {(item.attendees_count !== undefined && item.attendees_count !== null) && (
              <View style={styles.attendeesContainer}>
                <Users size={14} color="rgba(255, 255, 255, 0.8)" />
                <Text style={styles.attendeesText}>{String(item.attendees_count || 0)} attending</Text>
              </View>
            )}
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredEvents}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {renderSearchAndFilters()}
            {renderTrendingEvents()}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>All Events</Text>
              <Text style={styles.sectionSubtitle}>{filteredEvents.length} events</Text>
            </View>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingBottom: 100, // Add bottom padding to prevent navbar blocking
    paddingTop: 16,
  },
  createEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  createEventButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  eventCard: {
    height: 200,
    marginBottom: 16,
  },
  eventImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
    alignItems: 'center',
  },
  eventDate: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventTime: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  eventLocation: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  attendeesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  attendeesText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  // Search and Discovery styles
  searchContainer: {
    marginBottom: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.08)',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
    letterSpacing: 0.2,
  },
  clearButton: {
    fontSize: 18,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  quickFilters: {
    flexDirection: 'row',
    gap: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  filterText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#8B5CF6',
    letterSpacing: 0.2,
  },
  // Modern Search and Discovery styles
  modernSearchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: 'transparent',
    minHeight: 100,
  },
  modernSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.08)',
    gap: 10,
  },
  modernSearchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#1F2937',
    letterSpacing: 0.1,
  },
  modernClearButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
  },
  clearButtonText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  modernQuickFilters: {
    paddingVertical: 4,
  },
  modernQuickFiltersContent: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingRight: 32,
  },
  modernFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  modernFilterText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#8B5CF6',
    letterSpacing: 0.1,
  },
  // Trending events styles
  trendingSection: {
    marginBottom: 32,
  },
  trendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  trendingTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#1F2937',
    letterSpacing: 0.3,
  },
  trendingBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  trendingBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
    letterSpacing: 0.2,
  },
  trendingScroll: {
    paddingLeft: 0,
  },
  trendingCard: {
    width: 180,
    height: 240,
    borderRadius: 20,
    marginRight: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  trendingImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  trendingOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 16,
    flexDirection: 'column',
    gap: 8,
  },
  trendingEventName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  trendingStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendingStatText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  trendingRank: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  trendingRankText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
  },
  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    color: '#1F2937',
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  // Floating Action Button
  floatingActionButton: {
    position: 'absolute',
    bottom: 120,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
});
