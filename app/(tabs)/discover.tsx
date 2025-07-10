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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Star, Clock, Bookmark, Mountain, Camera } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const GOOGLE_PLACES_API_KEY = 'AIzaSyArQQgKA4uz4bwoz4l2THPNVCOlususLFc';

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
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);

  const fetchPlaces = async (lat: number, lng: number, category: string, query: string) => {
    try {
      let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=1500&key=${GOOGLE_PLACES_API_KEY}`;
      if (category !== 'All') {
        url += `&type=${category.toLowerCase()}`;
      }
      if (query) {
        url += `&keyword=${query}`;
      }
      
      const response = await fetch(url);
      const json = await response.json();
      const places = json.results.map((place: any) => ({
        id: place.place_id,
        title: place.name,
        description: place.vicinity,
        image: place.photos ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${GOOGLE_PLACES_API_KEY}` : 'https://images.pexels.com/photos/161841/prague-cathedral-architecture-building-161841.jpeg',
        location: place.vicinity,
        rating: place.rating,
        category: place.types[0],
        distance: 'N/A',
        estimatedTime: 'N/A',
        isBookmarked: false,
      }));
      setDiscoverItems(places);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch places.');
    }
  };

  useEffect(() => {
    const initialize = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required.');
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

  const toggleBookmark = (id: string) => {
    setDiscoverItems(items =>
      items.map(item =>
        item.id === id ? { ...item, isBookmarked: !item.isBookmarked } : item
      )
    );
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
            <Text style={styles.title}>Discover</Text>
            <Text style={styles.subtitle}>Explore stories near you</Text>
          </View>
          
          <View style={styles.searchContainer}>
            <TouchableOpacity style={styles.filterButton} onPress={() => router.push('/hiking')}>
              <Mountain size={20} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterButton} onPress={() => router.push('/scavenger')}>
              <Camera size={20} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>

        <View>
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

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>
            Recommended for you
          </Text>
          
          {discoverItems.map((item) => (
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
          ))}
          
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
  },
  headerContent: {
    marginBottom: 20,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
  },
  filterButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  categoriesContainer: {
    flexGrow: 0,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  categoryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  categoryButtonActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  categoryButtonTextActive: {
    color: '#4F46E5',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  cardWrapper: {
    marginBottom: 24,
  },
  discoverCard: {
    backgroundColor: '#1F2937',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  cardImage: {
    width: '100%',
    height: 220,
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
    padding: 20,
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
    color: '#F9FAFB',
    flex: 1,
    marginRight: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rating: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#FBBF24',
  },
  cardDescription: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    lineHeight: 22,
    marginBottom: 16,
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
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  distance: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#D1D5DB',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  categoryTag: {
    backgroundColor: '#374151',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryTagText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#A78BFA',
  },
  bottomPadding: {
    height: 120,
  },
});
