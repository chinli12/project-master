import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, MapPin, Clock, Route, Calendar, Star, Trash2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface TripPlan {
  id: string;
  title: string;
  date: string;
  duration: string;
  locations: Array<{
    id: string;
    name: string;
    address: string;
    estimatedTime: string;
    type: string;
  }>;
  totalDistance: string;
  difficulty: 'Easy' | 'Moderate' | 'Advanced';
}

const mockTripPlans: TripPlan[] = [
  {
    id: '1',
    title: 'Historic Downtown Walking Tour',
    date: 'Today',
    duration: '3 hours',
    totalDistance: '2.5 km',
    difficulty: 'Easy',
    locations: [
      {
        id: '1',
        name: 'Cathedral Square',
        address: '123 Main St',
        estimatedTime: '45 min',
        type: 'Historical',
      },
      {
        id: '2',
        name: 'Old Market',
        address: '456 Market St',
        estimatedTime: '30 min',
        type: 'Cultural',
      },
      {
        id: '3',
        name: 'Heritage Museum',
        address: '789 Heritage Ave',
        estimatedTime: '60 min',
        type: 'Museum',
      },
    ],
  },
  {
    id: '2',
    title: 'Riverside Nature & History',
    date: 'Tomorrow',
    duration: '2.5 hours',
    totalDistance: '3.8 km',
    difficulty: 'Moderate',
    locations: [
      {
        id: '4',
        name: 'Riverside Memorial',
        address: '321 River Rd',
        estimatedTime: '25 min',
        type: 'Memorial',
      },
      {
        id: '5',
        name: 'Historic Bridge',
        address: 'Bridge St',
        estimatedTime: '20 min',
        type: 'Architecture',
      },
    ],
  },
];

export default function PlannerScreen() {
  const [tripPlans, setTripPlans] = useState<TripPlan[]>(mockTripPlans);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTripTitle, setNewTripTitle] = useState('');

  const deleteTripPlan = (id: string) => {
    Alert.alert(
      'Delete Trip Plan',
      'Are you sure you want to delete this trip plan?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setTripPlans(plans => plans.filter(plan => plan.id !== id));
          },
        },
      ]
    );
  };

  const createNewTrip = () => {
    if (!newTripTitle.trim()) {
      Alert.alert('Error', 'Please enter a trip title');
      return;
    }

    Alert.alert('AI Trip Planner', 'AI will suggest locations based on your preferences. This feature is coming soon!');
    setNewTripTitle('');
    setShowCreateForm(false);
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
        colors={['#7C3AED', '#4F46E5']}
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
            <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
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
                    <Text style={styles.metaText}>{trip.date}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Clock size={14} color="#9CA3AF" strokeWidth={2} />
                    <Text style={styles.metaText}>{trip.duration}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Route size={14} color="#9CA3AF" strokeWidth={2} />
                    <Text style={styles.metaText}>{trip.totalDistance}</Text>
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
                      {trip.difficulty}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.locationsContainer}>
                <Text style={styles.locationsTitle}>Stops ({trip.locations.length})</Text>
                {trip.locations.map((location, index) => (
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

              <TouchableOpacity style={styles.startTripButton}>
                <MapPin size={16} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.startTripButtonText}>Start Trip</Text>
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
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 17,
    fontFamily: 'Inter-Light',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  createButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  createForm: {
    backgroundColor: '#1F2937',
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#F9FAFB',
    marginBottom: 20,
    textAlign: 'center',
  },
  titleInput: {
    backgroundColor: '#374151',
    borderWidth: 2,
    borderColor: '#4B5563',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginBottom: 20,
    color: '#F9FAFB',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#374151',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#9CA3AF',
  },
  createTripButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createTripButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
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
});
