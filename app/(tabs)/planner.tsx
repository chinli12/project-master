import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, MapPin, Clock, Route, Calendar, Star, Trash2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface TripLocation {
  id: string;
  name: string;
  address: string;
  estimatedTime: string;
  type: string;
}

// Types for Gemini API Response
interface GeminiPart {
  text: string;
}

interface GeminiContent {
  parts: GeminiPart[];
}

interface GeminiCandidate {
  content: GeminiContent;
}

interface GeminiResponse {
  candidates: GeminiCandidate[];
}

interface TripPlanFromGemini {
  title: string;
  date: string;
  duration: string;
  totalDistance: string;
  difficulty: 'Easy' | 'Moderate' | 'Advanced';
  locations: TripLocation[];
}

interface TripPlan {
  id: string;
  title: string;
  date: string;
  duration: string;
  locations: TripLocation[];
  totalDistance: string;
  difficulty: 'Easy' | 'Moderate' | 'Advanced';
}

export default function PlannerScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [tripPlans, setTripPlans] = useState<TripPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTripTitle, setNewTripTitle] = useState('');
  const [creatingTrip, setCreatingTrip] = useState(false);
  const [creationProgress, setCreationProgress] = useState('');

  useEffect(() => {
    if (user) {
      fetchTripPlans();
    }
  }, [user]);

  const fetchTripPlans = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('trip_plans')
      .select('*, trip_locations(*)')
      .eq('user_id', user.id);

    if (data) {
      setTripPlans(data as TripPlan[]);
    }
    setLoading(false);
  };

  const deleteTripPlan = async (id: string) => {
    Alert.alert(
      'Delete Trip Plan',
      'Are you sure you want to delete this trip plan?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('trip_plans').delete().eq('id', id);
            if (error) {
              Alert.alert('Error', 'Failed to delete trip plan.');
            } else {
              fetchTripPlans();
            }
          },
        },
      ]
    );
  };

  const createNewTrip = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a trip plan.');
      return;
    }
    if (!newTripTitle.trim()) {
      Alert.alert('Error', 'Please enter a trip title');
      return;
    }

    planTripWithGemini(newTripTitle);
  };

  const getUserLocation = async () => {
    try {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return null;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({});
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
    } catch (error) {
      console.log('Error getting location:', error);
      return null;
    }
  };

  const planTripWithGemini = async (title: string) => {
    setCreatingTrip(true);
    setCreationProgress('Initializing AI trip planner...');
    
    try {
      if (!user) {
        Alert.alert('Error', 'You must be logged in to create a trip plan.');
        return;
      }

      if (!process.env.EXPO_PUBLIC_GEMINI_API_KEY) {
        Alert.alert('Error', 'Gemini API key not configured.');
        return;
      }

      console.log('Creating trip with AI for:', title);

      // Get user location
      setCreationProgress('Getting your location...');
      const userLocation = await getUserLocation();
      
      // Generate future dates (next week to next month)
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const futureDate = nextWeek.toISOString().split('T')[0];

      // Location context for AI
      let locationContext = "";
      if (userLocation) {
        locationContext = `The user is located at latitude ${userLocation.latitude}, longitude ${userLocation.longitude}. `;
      }

      setCreationProgress('Sending request to AI...');
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.EXPO_PUBLIC_GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Create a detailed trip plan for "${title}". ${locationContext}Plan locations that are accessible from the user's location or popular destinations for this type of trip.

IMPORTANT REQUIREMENTS:
- Date must be FUTURE date (after ${today.toISOString().split('T')[0]})
- Calculate realistic distance based on trip locations
- Use real, specific location names and addresses
- Include proper estimated travel times

Return ONLY a valid JSON object with this exact structure (no extra text, no markdown, just JSON):

{
  "title": "${title}",
  "date": "${futureDate}",
  "duration": "2 days",
  "totalDistance": "120 km",
  "difficulty": "Moderate",
  "locations": [
    {
      "id": "1",
      "name": "Specific Location Name",
      "address": "Full street address with city",
      "estimatedTime": "3 hours",
      "type": "Tourist Attraction"
    },
    {
      "id": "2", 
      "name": "Restaurant Name", 
      "address": "Restaurant address with city",
      "estimatedTime": "1.5 hours",
      "type": "Dining"
    },
    {
      "id": "3",
      "name": "Activity Location",
      "address": "Activity address with city", 
      "estimatedTime": "2 hours",
      "type": "Activity"
    }
  ]
}

Guidelines:
- Date: Must be between ${futureDate} and ${nextMonth.toISOString().split('T')[0]}
- Distance: Calculate based on location proximity (30-200km is realistic)
- Locations: 3-5 real places with specific addresses
- Types: Tourist Attraction, Dining, Shopping, Activity, Cultural, Nature, Accommodation
- Make it geographically coherent and realistic`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        })
      });

      setCreationProgress('Processing AI response...');
      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as GeminiResponse;
      console.log('API Response:', JSON.stringify(data, null, 2));

      if (!data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.error('Invalid response structure:', data);
        throw new Error('Invalid API response structure');
      }

      const responseText = data.candidates[0].content.parts[0].text.trim();
      console.log('Raw response text:', responseText);

      setCreationProgress('Parsing trip data...');
      // Clean the response text to extract JSON
      let cleanedText = responseText;
      
      // Remove markdown code blocks if present
      cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Extract JSON object
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in response:', cleanedText);
        throw new Error('No valid JSON found in API response');
      }

      const plan = JSON.parse(jsonMatch[0]) as TripPlanFromGemini;
      console.log('Parsed plan:', plan);

      // Validate the plan structure
      if (!plan.title || !plan.locations || !Array.isArray(plan.locations) || plan.locations.length === 0) {
        console.error('Invalid plan structure:', plan);
        throw new Error('Invalid plan structure received from AI');
      }

      setCreationProgress('Saving to database...');
      // Insert trip plan into database
      const { data: tripPlan, error } = await supabase
        .from('trip_plans')
        .insert({
          user_id: user.id,
          title: plan.title,
          date: plan.date || new Date().toISOString().split('T')[0],
          duration: plan.duration || "1 day",
          total_distance: plan.totalDistance || "Unknown",
          difficulty: plan.difficulty || "Easy",
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Trip plan created:', tripPlan);

      setCreationProgress('Adding locations...');
      // Insert locations
      const locations = plan.locations.map((location: TripLocation, index: number) => ({
        trip_plan_id: tripPlan.id,
        name: location.name,
        address: location.address,
        estimated_time: location.estimatedTime,
        type: location.type,
        order_index: index,
      }));

      const { error: locationsError } = await supabase.from('trip_locations').insert(locations);
      if (locationsError) {
        console.error('Locations insert error:', locationsError);
        throw locationsError;
      }

      console.log('Locations inserted successfully');

      setCreationProgress('Finalizing...');
      setTimeout(() => {
        Alert.alert('Success', 'AI-generated trip plan created successfully!');
        setNewTripTitle('');
        setShowCreateForm(false);
        fetchTripPlans();
      }, 500);

    } catch (error: any) {
      console.error('Trip creation error:', error);
      Alert.alert('Error', `Failed to create AI trip plan: ${error.message}`);
    } finally {
      setCreatingTrip(false);
      setCreationProgress('');
    }
  };

  const createBasicTripPlan = (title: string) => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Generate basic locations based on trip title
    const locations = generateBasicLocations(title);
    
    return {
      title: title,
      date: nextWeek.toISOString().split('T')[0],
      duration: "1 day",
      totalDistance: "25 km",
      difficulty: "Easy",
      locations: locations
    };
  };

  const generateBasicLocations = (title: string) => {
    const lowerTitle = title.toLowerCase();
    
    // Predefined location templates based on common trip types
    if (lowerTitle.includes('beach') || lowerTitle.includes('coast')) {
      return [
        { id: "1", name: "Beach Resort", address: "Coastal Area", estimatedTime: "3 hours", type: "Recreation" },
        { id: "2", name: "Seaside Restaurant", address: "Beachfront", estimatedTime: "1 hour", type: "Dining" },
        { id: "3", name: "Water Sports Center", address: "Marina", estimatedTime: "2 hours", type: "Activity" }
      ];
    } else if (lowerTitle.includes('mountain') || lowerTitle.includes('hiking')) {
      return [
        { id: "1", name: "Mountain Trail", address: "National Park", estimatedTime: "4 hours", type: "Hiking" },
        { id: "2", name: "Scenic Viewpoint", address: "Mountain Peak", estimatedTime: "1 hour", type: "Sightseeing" },
        { id: "3", name: "Mountain Lodge", address: "Base Camp", estimatedTime: "2 hours", type: "Accommodation" }
      ];
    } else if (lowerTitle.includes('city') || lowerTitle.includes('urban')) {
      return [
        { id: "1", name: "City Center", address: "Downtown", estimatedTime: "2 hours", type: "Urban Exploration" },
        { id: "2", name: "Local Museum", address: "Cultural District", estimatedTime: "2 hours", type: "Cultural" },
        { id: "3", name: "Popular Restaurant", address: "Food District", estimatedTime: "1 hour", type: "Dining" }
      ];
    } else {
      // Generic locations
      return [
        { id: "1", name: "Main Attraction", address: "City Center", estimatedTime: "2 hours", type: "Tourist Attraction" },
        { id: "2", name: "Local Restaurant", address: "Near Main Attraction", estimatedTime: "1 hour", type: "Dining" },
        { id: "3", name: "Scenic Spot", address: "Nearby Area", estimatedTime: "1.5 hours", type: "Sightseeing" }
      ];
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return '#34D399';
      case 'Moderate': return '#FBBF24';
      case 'Advanced': return '#F87171';
      default: return '#9CA3AF';
    }
  };

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
          <View style={styles.headerContent}>
            <Text style={styles.title}>Trip Planner</Text>
            <Text style={styles.subtitle}>AI-powered itineraries</Text>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateForm(true)}
          >
            <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {showCreateForm && (
          <View style={styles.createForm}>
            <Text style={styles.formTitle}>Create New Trip</Text>
            <TextInput
              style={styles.titleInput}
              placeholder="Enter trip title..."
              value={newTripTitle}
              onChangeText={setNewTripTitle}
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.formButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowCreateForm(false);
                  setNewTripTitle('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createTripButton} onPress={createNewTrip}>
                <Text style={styles.createTripButtonText}>Create Trip</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Progress Overlay */}
        {creatingTrip && (
          <View style={styles.progressOverlay}>
            <View style={styles.progressModal}>
              <ActivityIndicator size="large" color="#8B5CF6" style={styles.progressSpinner} />
              <Text style={styles.progressTitle}>Creating Your Trip</Text>
              <Text style={styles.progressText}>{creationProgress}</Text>
              <View style={styles.progressBar}>
                <View style={styles.progressBarFill} />
              </View>
            </View>
          </View>
        )}

        {loading ? (
          <ActivityIndicator style={{ marginTop: 50 }} size="large" color="#FFFFFF" />
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Trip Plans</Text>
              <Text style={styles.sectionSubtitle}>
                {tripPlans.length} trip{tripPlans.length !== 1 ? 's' : ''} planned
              </Text>
            </View>

            {tripPlans.map((trip) => (
              <View key={trip.id} style={styles.tripCard}>
                <View style={styles.tripHeader}>
                  <View style={styles.tripTitleRow}>
                    <Text style={styles.tripTitle}>{trip.title}</Text>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteTripPlan(trip.id)}
                    >
                      <Trash2 size={16} color="#F87171" strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.tripMeta}>
                    <View style={styles.metaItem}>
                      <Calendar size={14} color="#9CA3AF" strokeWidth={2} />
                      <Text style={styles.metaText}>{trip.date || 'N/A'}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Clock size={14} color="#9CA3AF" strokeWidth={2} />
                      <Text style={styles.metaText}>{trip.duration || 'N/A'}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Route size={14} color="#9CA3AF" strokeWidth={2} />
                      <Text style={styles.metaText}>{trip.totalDistance || 'N/A'}</Text>
                    </View>
                  </View>

                  <View style={styles.difficultyContainer}>
                    <View style={[
                      styles.difficultyBadge,
                      { backgroundColor: getDifficultyColor(trip.difficulty) + '20' }
                    ]}>
                      <Text style={[
                        styles.difficultyText,
                        { color: getDifficultyColor(trip.difficulty) }
                      ]}>
                        {trip.difficulty || 'N/A'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.locationsContainer}>
                  <Text style={styles.locationsTitle}>Stops ({trip.locations ? trip.locations.length : 0})</Text>
                  {trip.locations && trip.locations.map((location, index) => (
                    <View key={location.id} style={styles.locationItem}>
                      <View style={styles.locationNumber}>
                        <Text style={styles.locationNumberText}>{index + 1}</Text>
                      </View>
                      <View style={styles.locationDetails}>
                        <Text style={styles.locationName}>{location.name}</Text>
                        <Text style={styles.locationAddress}>{location.address}</Text>
                        <View style={styles.locationMeta}>
                          <View style={styles.locationTime}>
                            <Clock size={12} color="#9CA3AF" strokeWidth={2} />
                            <Text style={styles.locationTimeText}>{location.estimatedTime}</Text>
                          </View>
                          <View style={styles.locationType}>
                            <Text style={styles.locationTypeText}>{location.type}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>

                <TouchableOpacity style={styles.startTripButton} onPress={() => router.push({ pathname: '/trip-details', params: { trip: JSON.stringify(trip) } })}>
                  <MapPin size={16} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.startTripButtonText}>View Trip</Text>
                </TouchableOpacity>
              </View>
            ))}

            {tripPlans.length === 0 && (
              <View style={styles.emptyState}>
                <Route size={48} color="#A78BFA" strokeWidth={2} />
                <Text style={styles.emptyTitle}>No trip plans yet</Text>
                <Text style={styles.emptySubtitle}>
                  Create your first AI-powered itinerary to start exploring
                </Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => setShowCreateForm(true)}
                >
                  <Text style={styles.emptyButtonText}>Create Trip Plan</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.bottomPadding} />
          </ScrollView>
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
    height: 320,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 36,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.3,
  },
  createButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  createForm: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 24,
    padding: 28,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
    elevation: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  formTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-SemiBold',
    color: '#1F2937',
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  titleInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 17,
    fontFamily: 'Inter-Regular',
    marginBottom: 24,
    color: '#1F2937',
    letterSpacing: 0.2,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    letterSpacing: 0.3,
  },
  createTripButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  createTripButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  sectionHeader: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-SemiBold',
    color: '#F9FAFB',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  tripCard: {
    backgroundColor: '#1F2937',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  tripHeader: {
    marginBottom: 20,
  },
  tripTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  tripTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#F9FAFB',
    flex: 1,
    marginRight: 12,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#374151',
  },
  tripMeta: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  difficultyContainer: {
    alignItems: 'flex-start',
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  difficultyText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
  },
  locationsContainer: {
    marginBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 20,
  },
  locationsTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#F9FAFB',
    marginBottom: 16,
  },
  locationItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  locationNumber: {
    backgroundColor: '#4F46E5',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 2,
  },
  locationNumberText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  locationDetails: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
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
    gap: 6,
  },
  locationTimeText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  locationType: {
    backgroundColor: '#374151',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  locationTypeText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#A78BFA',
  },
  startTripButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#4F46E5',
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
  emptyState: {
    backgroundColor: '#1F2937',
    alignItems: 'center',
    padding: 32,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-SemiBold',
    color: '#F9FAFB',
    marginTop: 16,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  bottomPadding: {
    height: 120,
  },
  progressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  progressModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 16,
    minWidth: 280,
  },
  progressSpinner: {
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 2,
    width: '100%',
  },
});
