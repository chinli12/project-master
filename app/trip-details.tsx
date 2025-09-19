import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, MapPin, Clock, Calendar, Route, Star } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';

interface TripLocation {
  id: string;
  name: string;
  address: string;
  estimated_time: string;
  type: string;
  order_index: number;
}

interface TripPlan {
  id: string;
  title: string;
  date: string;
  duration: string;
  total_distance: string;
  difficulty: string;
  trip_locations?: TripLocation[];
}

export default function TripDetailsScreen() {
  const { trip: tripString } = useLocalSearchParams();
  const router = useRouter();
  const [tripData, setTripData] = useState<TripPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTripData = async () => {
      try {
        if (tripString) {
          const parsedTrip = JSON.parse(tripString as string);
          console.log('Parsed trip data:', parsedTrip);
          
          // If we have locations already, use them
          if (parsedTrip.trip_locations && parsedTrip.trip_locations.length > 0) {
            setTripData(parsedTrip);
          } else {
            // Fetch locations from database
            const { data: locations, error } = await supabase
              .from('trip_locations')
              .select('*')
              .eq('trip_plan_id', parsedTrip.id)
              .order('order_index', { ascending: true });
            
            if (error) {
              console.error('Error fetching locations:', error);
            } else {
              setTripData({ ...parsedTrip, trip_locations: locations });
            }
          }
        }
      } catch (error) {
        console.error('Error parsing trip data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTripData();
  }, [tripString]);

  const openMap = (address: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    Linking.openURL(url);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return '#34D399';
      case 'Moderate': return '#FBBF24';
      case 'Advanced': return '#F87171';
      default: return '#9CA3AF';
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading trip details...</Text>
      </View>
    );
  }

  if (!tripData) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.errorText}>Failed to load trip details</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backToPlanner}>
          <Text style={styles.backToPlannerText}>Back to Planner</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const locations = tripData.trip_locations || [];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#8B5CF6', '#7C3AED', '#6366F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={28} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.title}>{tripData.title}</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Trip Overview Card */}
          <View style={styles.overviewCard}>
            <Text style={styles.cardTitle}>Trip Overview</Text>
            
            <View style={styles.tripMeta}>
              <View style={styles.metaItem}>
                <Calendar size={16} color="#8B5CF6" strokeWidth={2} />
                <Text style={styles.metaText}>{tripData.date || 'Date not set'}</Text>
              </View>
              <View style={styles.metaItem}>
                <Clock size={16} color="#8B5CF6" strokeWidth={2} />
                <Text style={styles.metaText}>{tripData.duration || 'Duration not set'}</Text>
              </View>
              <View style={styles.metaItem}>
                <Route size={16} color="#8B5CF6" strokeWidth={2} />
                <Text style={styles.metaText}>{tripData.total_distance || 'Distance not set'}</Text>
              </View>
            </View>

            <View style={styles.difficultyContainer}>
              <View style={[
                styles.difficultyBadge,
                { backgroundColor: getDifficultyColor(tripData.difficulty) + '20' }
              ]}>
                <Star size={14} color={getDifficultyColor(tripData.difficulty)} />
                <Text style={[
                  styles.difficultyText,
                  { color: getDifficultyColor(tripData.difficulty) }
                ]}>
                  {tripData.difficulty || 'Easy'} Difficulty
                </Text>
              </View>
            </View>
          </View>

          {/* Locations List */}
          <View style={styles.locationsCard}>
            <Text style={styles.cardTitle}>Trip Itinerary ({locations.length} stops)</Text>
            
            {locations.length > 0 ? (
              locations.map((location: TripLocation, index: number) => (
                <TouchableOpacity 
                  key={location.id || index} 
                  onPress={() => openMap(location.address)}
                  style={styles.locationItem}
                >
                  <View style={styles.locationNumber}>
                    <Text style={styles.locationNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.locationDetails}>
                    <Text style={styles.locationName}>{location.name}</Text>
                    <Text style={styles.locationAddress}>{location.address}</Text>
                    <View style={styles.locationMeta}>
                      <View style={styles.locationTime}>
                        <Clock size={12} color="#9CA3AF" strokeWidth={2} />
                        <Text style={styles.locationTimeText}>{location.estimated_time}</Text>
                      </View>
                      <View style={styles.locationType}>
                        <Text style={styles.locationTypeText}>{location.type}</Text>
                      </View>
                    </View>
                  </View>
                  <MapPin size={20} color="#8B5CF6" strokeWidth={2} />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noLocations}>
                <Text style={styles.noLocationsText}>No locations found for this trip</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Start Navigation Button */}
        {locations.length > 0 && (
          <TouchableOpacity 
            style={styles.startTripButton} 
            onPress={() => openMap(locations[0].address)}
          >
            <MapPin size={20} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.startTripButtonText}>Start Navigation</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'transparent',
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 12,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    marginLeft: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 0.3,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 16,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  backToPlanner: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  backToPlannerText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.08)',
  },
  locationsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.08)',
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#1F2937',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  tripMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  metaText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  difficultyContainer: {
    alignItems: 'flex-start',
  },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  difficultyText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  locationNumber: {
    backgroundColor: '#8B5CF6',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 2,
  },
  locationNumberText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  locationDetails: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 8,
  },
  locationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationTimeText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  locationType: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  locationTypeText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  noLocations: {
    alignItems: 'center',
    padding: 32,
  },
  noLocationsText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  startTripButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 16,
    margin: 24,
    gap: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startTripButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
