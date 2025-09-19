import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ChevronLeft, Search, MapPin, Clock, TrendingUp, Star, Filter, RefreshCw, Sparkles } from 'lucide-react-native';
import * as Location from 'expo-location';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// Default fallback hikes if AI generation fails
const defaultHikingRoutes: HikeRoute[] = [
  { 
    id: 'default-1', 
    name: 'Local Urban Trail', 
    distance: '3 km', 
    difficulty: 'Easy' as const,
    duration: '45 min',
    rating: 4.2,
    elevation: '50m',
    description: 'A scenic walk through local landmarks and streets.',
    tags: ['Urban', 'Local', 'Easy']
  },
  { 
    id: 'default-2', 
    name: 'Neighborhood Nature Walk', 
    distance: '4 km', 
    difficulty: 'Easy' as const,
    duration: '1 hr',
    rating: 4.0,
    elevation: '30m',
    description: 'Explore nearby parks and natural areas.',
    tags: ['Nature', 'Parks', 'Relaxing']
  },
  { 
    id: 'default-3', 
    name: 'City Park Loop', 
    distance: '5 km', 
    difficulty: 'Medium' as const,
    duration: '1.5 hrs',
    rating: 4.3,
    elevation: '80m',
    description: 'A moderate walk through local parks and green spaces.',
    tags: ['Parks', 'Nature', 'Moderate']
  },
  { 
    id: 'default-4', 
    name: 'Scenic Viewpoint Trail', 
    distance: '6 km', 
    difficulty: 'Medium' as const,
    duration: '2 hrs',
    rating: 4.5,
    elevation: '150m',
    description: 'Rewarding hike to local scenic overlooks.',
    tags: ['Scenic', 'Views', 'Moderate']
  },
  { 
    id: 'default-5', 
    name: 'Challenge Summit', 
    distance: '8 km', 
    difficulty: 'Hard' as const,
    duration: '3 hrs',
    rating: 4.7,
    elevation: '300m',
    description: 'Demanding trail for experienced hikers.',
    tags: ['Challenging', 'Summit', 'Advanced']
  },
  { 
    id: 'default-6', 
    name: 'Explorer\'s Path', 
    distance: '7 km', 
    difficulty: 'Hard' as const,
    duration: '2.5 hrs',
    rating: 4.6,
    elevation: '250m',
    description: 'Adventurous route through diverse terrain.',
    tags: ['Adventure', 'Diverse', 'Challenging']
  }
];

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

// Type for the AI-generated hike route before validation
interface AIHikeRoute {
  name: string;
  distance: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  duration: string;
  rating: number;
  elevation: string;
  description: string;
  tags: string[];
}

interface HikeRoute {
  id: string;
  name: string;
  distance: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  duration: string;
  rating: number;
  elevation: string;
  description: string;
  tags: string[];
}

const difficultyColors = {
  Easy: '#4CAF50',
  Medium: '#FF9800',
  Hard: '#F44336'
};

const HikingScreen = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [hikingRoutes, setHikingRoutes] = useState<HikeRoute[]>(defaultHikingRoutes);
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    generateAIHikes();
  }, []);

  const generateAIHikes = async () => {
    setIsLoading(true);
    try {
      // Get user location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Permission', 'Location access is needed to generate personalized hikes near you.');
        setIsLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setUserLocation(location);

      // Get location name
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      const locationName = reverseGeocode[0] ? 
        `${reverseGeocode[0].city || reverseGeocode[0].district}, ${reverseGeocode[0].region}, ${reverseGeocode[0].country}` :
        `Location ${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`;

      // Generate AI hikes
      const aiHikes = await generateHikesWithAI(locationName, location.coords);
      if (aiHikes && aiHikes.length > 0) {
        setHikingRoutes(aiHikes);
      }
    } catch (error) {
      console.error('Error generating AI hikes:', error);
      Alert.alert('Error', 'Failed to generate personalized hikes. Showing default trails.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateHikesWithAI = async (locationName: string, coords: { latitude: number; longitude: number }): Promise<HikeRoute[]> => {
    if (!GEMINI_API_KEY) {
      console.warn('Gemini API key not found');
      return defaultHikingRoutes;
    }

    try {
      const prompt = `Generate 6 unique hiking trails near ${locationName} (latitude: ${coords.latitude}, longitude: ${coords.longitude}). 
      
      For each trail, provide:
      - name: Creative, appealing trail name
      - distance: Realistic distance (1-15 km)
      - difficulty: Easy, Medium, or Hard
      - duration: Realistic time estimate
      - rating: 3.5-5.0 rating
      - elevation: Elevation gain in meters
      - description: Engaging 1-2 sentence description
      - tags: 2-4 relevant tags
      
      Mix difficulties (2 Easy, 2 Medium, 2 Hard). Consider local geography, landmarks, nature areas, parks, and scenic routes.
      
      Return ONLY a JSON array with this exact structure:
      [
        {
          "name": "Trail Name",
          "distance": "5 km",
          "difficulty": "Medium",
          "duration": "1.5 hrs", 
          "rating": 4.3,
          "elevation": "120m",
          "description": "Trail description here.",
          "tags": ["Nature", "Scenic", "Moderate"]
        }
      ]`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-06-17:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt,
            }],
          }],
        }),
      });

      const data = (await response.json()) as GeminiResponse;
      
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        let responseText = data.candidates[0].content.parts[0].text;
        
        // Clean up the response
        responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        try {
          const trails = JSON.parse(responseText) as AIHikeRoute[];
          
          // Add IDs and validate structure
          const validatedTrails: HikeRoute[] = trails.map((trail: AIHikeRoute, index: number) => ({
            id: `ai-${Date.now()}-${index}`,
            name: trail.name || `Trail ${index + 1}`,
            distance: trail.distance || '3 km',
            difficulty: ['Easy', 'Medium', 'Hard'].includes(trail.difficulty) ? trail.difficulty : 'Easy',
            duration: trail.duration || '1 hr',
            rating: typeof trail.rating === 'number' ? Math.min(5, Math.max(3, trail.rating)) : 4.0,
            elevation: trail.elevation || '50m',
            description: trail.description || 'A scenic hiking trail.',
            tags: Array.isArray(trail.tags) ? trail.tags.slice(0, 4) : ['Hiking', 'Nature']
          }));

          return validatedTrails.length === 6 ? validatedTrails : defaultHikingRoutes;
        } catch (parseError) {
          console.error('Failed to parse AI response:', parseError);
          return defaultHikingRoutes;
        }
      }
      
      return defaultHikingRoutes;
    } catch (error) {
      console.error('AI generation error:', error);
      return defaultHikingRoutes;
    }
  };

  const filteredRoutes = hikingRoutes.filter((route: HikeRoute) => {
    const matchesSearch = route.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         route.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDifficulty = !selectedDifficulty || route.difficulty === selectedDifficulty;
    return matchesSearch && matchesDifficulty;
  });

  const renderItem = ({ item }: { item: HikeRoute }) => (
    <TouchableOpacity 
      onPress={() => router.push({
        pathname: '/hike-details',
        params: { 
          hikeId: item.id,
          name: item.name,
          distance: item.distance,
          difficulty: item.difficulty,
          duration: item.duration,
          rating: item.rating.toString(),
          elevation: item.elevation,
          description: item.description,
          tags: JSON.stringify(item.tags),
          userLat: userLocation?.coords.latitude?.toString() || '',
          userLng: userLocation?.coords.longitude?.toString() || ''
        }
      })}
      style={styles.itemContainer}
    >
      <BlurView intensity={80} tint="dark" style={styles.item}>
        <View style={styles.itemHeader}>
          <View style={styles.itemTitleRow}>
            <Text style={styles.name}>{item.name}</Text>
            <View style={styles.ratingContainer}>
              <Star size={14} color="#FFD700" fill="#FFD700" />
              <Text style={styles.rating}>{item.rating}</Text>
            </View>
          </View>
          <View style={[styles.difficultyBadge, { backgroundColor: difficultyColors[item.difficulty as keyof typeof difficultyColors] }]}>
            <Text style={styles.difficultyText}>{item.difficulty}</Text>
          </View>
        </View>

        <Text style={styles.description}>{item.description}</Text>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <MapPin size={16} color="#FFFFFF" />
            <Text style={styles.statText}>{item.distance}</Text>
          </View>
          <View style={styles.statItem}>
            <Clock size={16} color="#FFFFFF" />
            <Text style={styles.statText}>{item.duration}</Text>
          </View>
          <View style={styles.statItem}>
            <TrendingUp size={16} color="#FFFFFF" />
            <Text style={styles.statText}>{item.elevation}</Text>
          </View>
        </View>

        <View style={styles.tagsContainer}>
          {item.tags.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  const renderDifficultyFilter = (difficulty: string) => (
    <TouchableOpacity
      key={difficulty}
      onPress={() => setSelectedDifficulty(selectedDifficulty === difficulty ? null : difficulty)}
      style={[
        styles.filterChip,
        { 
          backgroundColor: selectedDifficulty === difficulty ? difficultyColors[difficulty as keyof typeof difficultyColors] : 'rgba(255, 255, 255, 0.1)',
          borderColor: difficultyColors[difficulty as keyof typeof difficultyColors]
        }
      ]}
    >
      <Text style={[
        styles.filterChipText,
        { color: selectedDifficulty === difficulty ? '#FFFFFF' : difficultyColors[difficulty as keyof typeof difficultyColors] }
      ]}>
        {difficulty}
      </Text>
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={['#8B5CF6', '#7C3AED', '#6366F1']} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>AI Hiking Trails</Text>
          <TouchableOpacity onPress={generateAIHikes} style={styles.refreshButton} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <RefreshCw size={24} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        {/* AI Generation Status */}
        {isLoading && (
          <BlurView intensity={80} tint="dark" style={styles.statusContainer}>
            <Sparkles size={20} color="#A78BFA" />
            <Text style={styles.statusText}>AI is generating personalized hikes for your location...</Text>
          </BlurView>
        )}

        {userLocation && !isLoading && (
          <BlurView intensity={80} tint="dark" style={styles.locationContainer}>
            <MapPin size={16} color="#A78BFA" />
            <Text style={styles.locationText}>
              Showing trails near your location
            </Text>
          </BlurView>
        )}

        <View style={styles.searchContainer}>
          <BlurView intensity={80} tint="dark" style={styles.searchInputContainer}>
            <Search size={20} color="rgba(255, 255, 255, 0.7)" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search trails or tags..."
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </BlurView>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {['Easy', 'Medium', 'Hard'].map(renderDifficultyFilter)}
        </ScrollView>

        <FlatList
          data={filteredRoutes}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  filterButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
    maxHeight: 40,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  itemContainer: {
    marginBottom: 16,
  },
  item: {
    padding: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemTitleRow: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFD700',
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  tagText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  refreshButton: {
    padding: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  locationText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 8,
  },
});

export default HikingScreen;
