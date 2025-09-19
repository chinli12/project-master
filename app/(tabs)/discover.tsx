import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Star, Clock, Bookmark, Mountain, Camera, Search, TrendingUp, Compass, Filter } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

interface Place {
  place_id: string;
  name: string;
  vicinity: string;
  photos?: { photo_reference: string }[];
  rating?: number;
  types: string[];
}

interface PlacesResponse {
  results: Place[];
}

interface DiscoverItem {
  id: string;
  title: string;
  description: string;
  image: string;
  location: string;
  rating: number;
  category: string;
  distance: string;
  estimatedTime: string;
  isBookmarked: boolean;
}

const categories = ['All', 'Historical', 'Cultural', 'Nature', 'Architecture', 'Modern'];

export default function DiscoverScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [discoverItems, setDiscoverItems] = useState<DiscoverItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<DiscoverItem[]>([]);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPlaces = async (lat: number, lng: number, category: string, query: string) => {
    try {
      setLoading(true);
      let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=1500&key=${GOOGLE_PLACES_API_KEY}`;
      if (category !== 'All') {
        url += `&type=${category.toLowerCase()}`;
      }
      if (query) {
        url += `&keyword=${query}`;
      }
      
      const response = await fetch(url);
      const json = await response.json() as PlacesResponse;
      const places = json.results.map((place: Place) => ({
        id: place.place_id,
        title: place.name,
        description: place.vicinity,
        image: place.photos ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${GOOGLE_PLACES_API_KEY}` : 'https://images.pexels.com/photos/161841/prague-cathedral-architecture-building-161841.jpeg',
        location: place.vicinity,
        rating: place.rating || 4.2,
        category: place.types[0],
        distance: `${(Math.random() * 5 + 0.5).toFixed(1)} km`,
        estimatedTime: `${Math.floor(Math.random() * 30 + 10)} min`,
        isBookmarked: false,
      }));
      setDiscoverItems(places);
      setFilteredItems(places);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch places.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required.');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setUserLocation(location);
      fetchPlaces(location.coords.latitude, location.coords.longitude, selectedCategory, '');
    };

    initialize();
  }, []);

  useEffect(() => {
    if (userLocation) {
      fetchPlaces(userLocation.coords.latitude, userLocation.coords.longitude, selectedCategory, '');
    }
  }, [selectedCategory, userLocation]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredItems(discoverItems);
    } else {
      const filtered = discoverItems.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredItems(filtered);
    }
  }, [searchQuery, discoverItems]);

  const toggleBookmark = (id: string) => {
    setDiscoverItems(items =>
      items.map(item =>
        item.id === id ? { ...item, isBookmarked: !item.isBookmarked } : item
      )
    );
    setFilteredItems(items =>
      items.map(item =>
        item.id === id ? { ...item, isBookmarked: !item.isBookmarked } : item
      )
    );
  };

  const renderSearchBar = () => (
    <View style={styles.searchSection}>
      <View style={styles.searchBar}>
        <Search size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Discover places, experiences..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearButton}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionChip} onPress={() => router.push('/hiking')}>
          <Mountain size={16} color="#8B5CF6" />
          <Text style={styles.actionText}>Hiking</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionChip} onPress={() => router.push('/scavenger')}>
          <Camera size={16} color="#8B5CF6" />
          <Text style={styles.actionText}>Photo Hunt</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTrendingPlaces = () => {
    // Sort by rating for trending
    const trendingPlaces = [...filteredItems]
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 3);

    if (trendingPlaces.length === 0) {
      return null;
    }

    return (
      <View style={styles.trendingSection}>
        <View style={styles.trendingHeader}>
          <TrendingUp size={20} color="#8B5CF6" />
          <Text style={styles.trendingTitle}>Trending Discoveries</Text>
          <View style={styles.trendingBadge}>
            <Text style={styles.trendingBadgeText}>🔥 Popular</Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.trendingScroll}>
          {trendingPlaces.map((item, index) => (
            <TouchableOpacity 
              key={`trending-${item.id}`} 
              style={styles.trendingCard}
              onPress={() => router.push({ pathname: `/place/[id]`, params: { id: item.id, item: JSON.stringify(item) } })}
            >
              <Image source={{ uri: item.image }} style={styles.trendingImage} />
              <View style={styles.trendingOverlay}>
                <Text style={styles.trendingPlaceName} numberOfLines={2}>{item.title}</Text>
                <View style={styles.trendingStats}>
                  <Star size={12} color="#FBBF24" fill="#FBBF24" />
                  <Text style={styles.trendingStatText}>{item.rating}</Text>
                </View>
              </View>
              {index === 0 && (
                <View style={styles.trendingRank}>
                  <Text style={styles.trendingRankText}>#1</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
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
            <Text style={styles.title}>Discover</Text>
            <Text style={styles.subtitle}>Explore amazing places around you</Text>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderSearchBar()}
          {renderTrendingPlaces()}

          <View style={styles.categoriesSection}>
            <Text style={styles.categoriesTitle}>Categories</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.categoriesContainer}
              contentContainerStyle={styles.categoriesContent}
            >
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category && styles.categoryButtonActive
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    selectedCategory === category && styles.categoryButtonTextActive
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.placesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {selectedCategory === 'All' ? 'All Places' : selectedCategory}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {filteredItems.length} places
              </Text>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={styles.loadingText}>Finding amazing places...</Text>
              </View>
            ) : (
              filteredItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => router.push({ pathname: `/place/[id]`, params: { id: item.id, item: JSON.stringify(item) } })}
                  style={styles.cardWrapper}
                >
                  <View style={styles.discoverCard}>
                    <Image source={{ uri: item.image }} style={styles.cardImage} />
                    <TouchableOpacity
                      style={styles.bookmarkButton}
                      onPress={() => toggleBookmark(item.id)}
                    >
                      <Bookmark
                        size={20}
                        color={item.isBookmarked ? '#FBBF24' : '#FFFFFF'}
                        fill={item.isBookmarked ? '#FBBF24' : 'transparent'}
                        strokeWidth={2.5}
                      />
                    </TouchableOpacity>
                    
                    <View style={styles.cardContent}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <View style={styles.ratingContainer}>
                          <Star size={16} color="#FBBF24" fill="#FBBF24" strokeWidth={2} />
                          <Text style={styles.rating}>{item.rating}</Text>
                        </View>
                      </View>
                      
                      <Text style={styles.cardDescription}>{item.description}</Text>
                      
                      <View style={styles.cardMeta}>
                        <View style={styles.locationContainer}>
                          <MapPin size={14} color="#9CA3AF" strokeWidth={2} />
                          <Text style={styles.locationText}>{item.location}</Text>
                        </View>
                        <Text style={styles.distance}>{item.distance}</Text>
                      </View>
                      
                      <View style={styles.cardFooter}>
                        <View style={styles.timeContainer}>
                          <Clock size={14} color="#9CA3AF" strokeWidth={2} />
                          <Text style={styles.timeText}>{item.estimatedTime}</Text>
                        </View>
                        <View style={styles.categoryTag}>
                          <Text style={styles.categoryTagText}>{item.category}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
          
          <View style={styles.bottomPadding} />
        </ScrollView>
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
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.3,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  // Search section styles
  searchSection: {
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
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  actionText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#8B5CF6',
    letterSpacing: 0.2,
  },
  // Trending section styles
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
    backgroundColor: '#E5E7EB',
    position: 'relative',
  },
  trendingImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  trendingOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendingPlaceName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    flex: 1,
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
  // Categories section styles
  categoriesSection: {
    marginBottom: 32,
  },
  categoriesTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#1F2937',
    letterSpacing: 0.3,
    marginBottom: 16,
  },
  categoriesContainer: {
    flexGrow: 0,
  },
  categoriesContent: {
    paddingLeft: 0,
    gap: 12,
  },
  categoryButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  categoryButtonActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#8B5CF6',
    letterSpacing: 0.2,
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
  },
  // Places section styles
  placesSection: {
    marginBottom: 32,
  },
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
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 12,
  },
  cardWrapper: {
    marginBottom: 28,
  },
  discoverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.08)',
  },
  cardImage: {
    width: '100%',
    height: 240,
    resizeMode: 'cover',
  },
  bookmarkButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 24,
    padding: 10,
  },
  cardContent: {
    padding: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#1F2937',
    flex: 1,
    marginRight: 12,
    letterSpacing: 0.3,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rating: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FBBF24',
  },
  cardDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  distance: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#8B5CF6',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 92, 246, 0.1)',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  categoryTag: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryTagText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#8B5CF6',
    letterSpacing: 0.2,
  },
  bottomPadding: {
    height: 160,
  },
});
