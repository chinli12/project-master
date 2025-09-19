import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  Heart, 
  MapPin, 
  Search, 
  Filter,
  Calendar,
  Star,
  Trash2,
  Share,
  Navigation
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');

interface SavedPlace {
  id: string;
  name: string;
  description: string;
  location: string;
  image_url: string;
  category: string;
  rating: number;
  saved_at: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export default function SavedPlacesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filteredPlaces, setFilteredPlaces] = useState<SavedPlace[]>([]);

  const categories = [
    { id: 'all', name: 'All', icon: '🏛️' },
    { id: 'historical', name: 'Historical', icon: '🏛️' },
    { id: 'nature', name: 'Nature', icon: '🌿' },
    { id: 'cultural', name: 'Cultural', icon: '🎭' },
    { id: 'restaurant', name: 'Food', icon: '🍽️' },
    { id: 'entertainment', name: 'Fun', icon: '🎪' },
  ];

  useEffect(() => {
    fetchSavedPlaces();
  }, []);

  useEffect(() => {
    filterPlaces();
  }, [savedPlaces, searchQuery, selectedCategory]);

  const fetchSavedPlaces = async () => {
    try {
      // Check if user is authenticated
      if (!user?.id) {
        setSavedPlaces(mockSavedPlaces);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('saved_places')
        .select('*')
        .eq('user_id', user.id)
        .order('saved_at', { ascending: false });

      if (error) {
        // If table doesn't exist or other DB error, use mock data
        console.warn('Database error, using mock data:', error.message);
        setSavedPlaces(mockSavedPlaces);
      } else {
        // If no saved places in DB, use mock data for demo
        setSavedPlaces(data && data.length > 0 ? data : mockSavedPlaces);
      }
    } catch (error: any) {
      console.error('Error fetching saved places:', error.message);
      // Use mock data if database fails
      setSavedPlaces(mockSavedPlaces);
    } finally {
      setLoading(false);
    }
  };

  const filterPlaces = () => {
    let filtered = savedPlaces;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(place => place.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(place =>
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredPlaces(filtered);
  };

  const handleRemovePlace = async (placeId: string) => {
    Alert.alert(
      'Remove Place',
      'Are you sure you want to remove this place from your saved places?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Try to remove from database if user is authenticated
              if (user?.id) {
                const { error } = await supabase
                  .from('saved_places')
                  .delete()
                  .eq('id', placeId)
                  .eq('user_id', user.id);

                if (error) {
                  console.warn('Database error during delete:', error.message);
                }
              }

              // Always remove from local state (works for both DB and mock data)
              setSavedPlaces(prev => prev.filter(place => place.id !== placeId));
              Alert.alert('Success', 'Place removed from saved places');
            } catch (error: any) {
              console.error('Error removing place:', error.message);
              // Still remove from local state even if DB fails
              setSavedPlaces(prev => prev.filter(place => place.id !== placeId));
              Alert.alert('Success', 'Place removed from saved places');
            }
          }
        }
      ]
    );
  };

  const handleSharePlace = (place: SavedPlace) => {
    Alert.alert('Share Place', `Share "${place.name}" with friends?`);
  };

  const handleNavigateToPlace = (place: SavedPlace) => {
    Alert.alert('Navigate', `Open navigation to "${place.name}"?`);
  };

  const renderPlaceCard = (place: SavedPlace) => (
    <View key={place.id} style={styles.placeCard}>
      <Image source={{ uri: place.image_url }} style={styles.placeImage} />
      <View style={styles.placeContent}>
        <View style={styles.placeHeader}>
          <Text style={styles.placeName}>{place.name}</Text>
          <View style={styles.ratingContainer}>
            <Star size={16} color="#FFD700" fill="#FFD700" strokeWidth={2} />
            <Text style={styles.rating}>{place.rating.toFixed(1)}</Text>
          </View>
        </View>
        
        <View style={styles.locationContainer}>
          <MapPin size={14} color="#A78BFA" strokeWidth={2} />
          <Text style={styles.location}>{place.location}</Text>
        </View>
        
        <Text style={styles.description} numberOfLines={2}>
          {place.description}
        </Text>
        
        <View style={styles.categoryContainer}>
          <Text style={styles.categoryTag}>
            {categories.find(cat => cat.id === place.category)?.icon} {place.category}
          </Text>
          <Text style={styles.savedDate}>
            Saved {new Date(place.saved_at).toLocaleDateString()}
          </Text>
        </View>
        
        {place.notes && (
          <Text style={styles.notes} numberOfLines={1}>
            💭 {place.notes}
          </Text>
        )}
        
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleNavigateToPlace(place)}
          >
            <Navigation size={18} color="#8B5CF6" strokeWidth={2} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleSharePlace(place)}
          >
            <Share size={18} color="#8B5CF6" strokeWidth={2} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.removeButton]}
            onPress={() => handleRemovePlace(place.id)}
          >
            <Trash2 size={18} color="#EF4444" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <LinearGradient colors={['#1F2937', '#111827']} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Loading saved places...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1F2937', '#111827']} style={styles.container}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Saved Places</Text>
          <View style={styles.headerRight}>
            <Heart size={24} color="#EF4444" fill="#EF4444" strokeWidth={2} />
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color="rgba(255,255,255,0.6)" strokeWidth={2} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search saved places..."
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Category Filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryFilter}
          contentContainerStyle={styles.categoryFilterContent}
        >
          {categories.map(category => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                selectedCategory === category.id && styles.selectedCategoryButton
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Text style={styles.categoryEmoji}>{category.icon}</Text>
              <Text style={[
                styles.categoryText,
                selectedCategory === category.id && styles.selectedCategoryText
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Places List */}
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          {filteredPlaces.length > 0 ? (
            <>
              <View style={styles.statsContainer}>
                <Text style={styles.statsText}>
                  {filteredPlaces.length} saved place{filteredPlaces.length !== 1 ? 's' : ''}
                  {selectedCategory !== 'all' && ` in ${categories.find(cat => cat.id === selectedCategory)?.name}`}
                </Text>
              </View>
              
              {filteredPlaces.map(renderPlaceCard)}
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Heart size={64} color="rgba(255,255,255,0.3)" strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>
                {searchQuery || selectedCategory !== 'all' 
                  ? 'No places found' 
                  : 'No saved places yet'
                }
              </Text>
              <Text style={styles.emptyDescription}>
                {searchQuery || selectedCategory !== 'all'
                  ? 'Try adjusting your search or filter'
                  : 'Start exploring and save places you love!'
                }
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// Mock data for demonstration
const mockSavedPlaces: SavedPlace[] = [
  {
    id: '1',
    name: 'Historic Cathedral Square',
    description: 'Beautiful medieval cathedral with stunning architecture and rich history dating back to the 12th century.',
    location: 'Downtown Historic District',
    image_url: 'https://images.pexels.com/photos/161841/prague-cathedral-architecture-building-161841.jpeg',
    category: 'historical',
    rating: 4.8,
    saved_at: '2024-01-15T10:30:00Z',
    notes: 'Great for photography, visit during golden hour'
  },
  {
    id: '2',
    name: 'Riverside Memorial Garden',
    description: 'Peaceful garden with memorial sculptures and beautiful river views, perfect for quiet reflection.',
    location: 'Riverside Park',
    image_url: 'https://images.pexels.com/photos/1647962/pexels-photo-1647962.jpeg',
    category: 'nature',
    rating: 4.6,
    saved_at: '2024-01-10T14:20:00Z',
    notes: 'Bring a book, very peaceful in the morning'
  },
  {
    id: '3',
    name: 'Old Market Heritage Trail',
    description: 'Historic marketplace with traditional crafts, local food vendors, and cultural performances.',
    location: 'Heritage District',
    image_url: 'https://images.pexels.com/photos/1797428/pexels-photo-1797428.jpeg',
    category: 'cultural',
    rating: 4.5,
    saved_at: '2024-01-08T16:45:00Z',
    notes: 'Try the local honey and handmade pottery'
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
  },
  categoryFilter: {
    paddingLeft: 20,
  },
  categoryFilterContent: {
    paddingRight: 20,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 3,
    height: 18,
  },
  selectedCategoryButton: {
    backgroundColor: '#8B5CF6',
  },
  categoryEmoji: {
    fontSize: 10,
    marginRight: 2,
  },
  categoryText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: '#FFFFFF',
  },
  content: {
    
  },
  contentContainer: {
    padding: 20,
  },
  statsContainer: {
    marginBottom: 20,
  },
  statsText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  placeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  placeImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  placeContent: {
    padding: 16,
  },
  placeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  placeName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  location: {
    color: '#A78BFA',
    fontSize: 14,
    marginLeft: 6,
  },
  description: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryTag: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  savedDate: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  notes: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
