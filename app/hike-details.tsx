import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { 
  ChevronLeft, 
  MapPin, 
  Clock, 
  TrendingUp, 
  Star, 
  Navigation, 
  Heart,
  Share2,
  Users,
  Camera,
  Info,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  Target,
  Award,
  Trophy
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

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

interface AICheckpoint {
  name: string;
  description: string;
}

interface HikeData {
  id: string;
  name: string;
  distance: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  duration: string;
  rating: number;
  elevation: string;
  description: string;
  longDescription?: string;
  tags: string[];
  highlights?: string[];
  tips?: string[];
  warnings?: string[];
  trailheadParking?: string;
  petFriendly?: boolean;
  accessibility?: string;
}

// Generate dynamic hike data based on the hike info
const generateHikeDetails = (hikeInfo: any): HikeData => {
  // Extract difficulty-based features
  const difficultyFeatures: Record<'Easy' | 'Medium' | 'Hard', {
    highlights: string[];
    tips: string[];
    warnings: string[];
    accessibility: string;
    petFriendly: boolean;
  }> = {
    Easy: {
      highlights: [
        'Well-maintained pathways',
        'Scenic rest areas',
        'Educational signage',
        'Family-friendly stops',
        'Photo opportunities'
      ],
      tips: [
        'Perfect for beginners and families',
        'Bring water and snacks',
        'Wear comfortable walking shoes',
        'Best enjoyed in the morning'
      ],
      warnings: [
        'Watch for other walkers',
        'Stay on marked paths'
      ],
      accessibility: 'Wheelchair accessible',
      petFriendly: true
    },
    Medium: {
      highlights: [
        'Scenic viewpoints',
        'Natural rock formations',
        'Wildlife viewing areas',
        'Historical markers',
        'Diverse terrain'
      ],
      tips: [
        'Bring plenty of water',
        'Wear proper hiking boots',
        'Check weather conditions',
        'Start early to avoid crowds'
      ],
      warnings: [
        'Moderate elevation changes',
        'Some uneven terrain',
        'Weather can change quickly'
      ],
      accessibility: 'Partially accessible',
      petFriendly: true
    },
    Hard: {
      highlights: [
        'Breathtaking summit views',
        'Challenging terrain',
        'Remote wilderness',
        'Alpine features',
        'Advanced trail systems'
      ],
      tips: [
        'Bring map and compass',
        'Pack emergency supplies',
        'Inform someone of your plans',
        'Start very early',
        'Bring extra food and water'
      ],
      warnings: [
        'Steep and challenging terrain',
        'Weather conditions can be severe',
        'Requires good physical fitness',
        'Emergency services may be far'
      ],
      accessibility: 'Not wheelchair accessible',
      petFriendly: false
    }
  };

  const features = difficultyFeatures[hikeInfo.difficulty as 'Easy' | 'Medium' | 'Hard'] || difficultyFeatures.Easy;
  
  return {
    id: hikeInfo.id,
    name: hikeInfo.name,
    distance: hikeInfo.distance,
    difficulty: hikeInfo.difficulty,
    duration: hikeInfo.duration,
    rating: hikeInfo.rating,
    elevation: hikeInfo.elevation,
    description: hikeInfo.description,
    longDescription: `${hikeInfo.description} This ${hikeInfo.difficulty.toLowerCase()} trail offers a ${hikeInfo.duration} hiking experience with ${hikeInfo.elevation} of elevation gain. Perfect for those seeking a ${hikeInfo.difficulty.toLowerCase()}-level outdoor adventure.`,
    tags: hikeInfo.tags || ['Hiking', 'Nature'],
    highlights: features.highlights,
    tips: features.tips,
    warnings: features.warnings,
    trailheadParking: 'Available',
    petFriendly: features.petFriendly,
    accessibility: features.accessibility
  };
};

// Default fallback hike data
const defaultHike: HikeData = {
  id: 'default',
  name: 'Local Trail',
  distance: '3 km',
  difficulty: 'Easy',
  duration: '1 hr',
  rating: 4.0,
  elevation: '50m',
  description: 'A scenic local trail perfect for outdoor exploration.',
  longDescription: 'This local trail offers a peaceful outdoor experience with beautiful natural scenery and well-maintained paths.',
  tags: ['Local', 'Scenic', 'Easy'],
  highlights: [
    'Beautiful natural scenery',
    'Well-maintained paths',
    'Peaceful environment',
    'Great for beginners'
  ],
  tips: [
    'Bring water and snacks',
    'Wear comfortable shoes',
    'Enjoy the scenery'
  ],
  warnings: [
    'Stay on marked paths',
    'Be aware of weather conditions'
  ],
  trailheadParking: 'Available',
  petFriendly: true,
  accessibility: 'Wheelchair accessible'
};

const difficultyColors = {
  Easy: '#4CAF50',
  Medium: '#FF9800',
  Hard: '#F44336'
};

const HikeDetailsScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { hikeId, ...hikeParams } = useLocalSearchParams();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [questProgress, setQuestProgress] = useState(0);
  const [distanceTraveled, setDistanceTraveled] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [checkpoints, setCheckpoints] = useState<number[]>([]);
  const [hikeStartTime, setHikeStartTime] = useState<Date | null>(null);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [completedQuests, setCompletedQuests] = useState<string[]>([]);
  
  // Get hike data from route params or generate from passed data
  const getHikeData = (): HikeData => {
    if (hikeParams.name && hikeParams.difficulty) {
      // Create hike object from params
      const hikeInfo = {
        id: hikeId as string,
        name: hikeParams.name as string,
        distance: hikeParams.distance as string,
        difficulty: hikeParams.difficulty as 'Easy' | 'Medium' | 'Hard',
        duration: hikeParams.duration as string,
        rating: parseFloat(hikeParams.rating as string) || 4.0,
        elevation: hikeParams.elevation as string,
        description: hikeParams.description as string,
        tags: hikeParams.tags ? JSON.parse(hikeParams.tags as string) : ['Hiking', 'Nature']
      };
      return generateHikeDetails(hikeInfo);
    }
    
    // Fallback to default hike
    return defaultHike;
  };

  const hike = getHikeData();

  // Generate AI-powered dynamic quest checkpoints
  const generateQuestCheckpoints = async () => {
    // Try to get location from route params first, then from current location
    let baseLat, baseLng, locationName = 'Unknown Location';
    
    if (hikeParams.userLat && hikeParams.userLng) {
      baseLat = parseFloat(hikeParams.userLat as string);
      baseLng = parseFloat(hikeParams.userLng as string);
      
      // Try to get location name for context
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: baseLat,
          longitude: baseLng,
        });
        
        if (reverseGeocode[0]) {
          locationName = `${reverseGeocode[0].city || reverseGeocode[0].district}, ${reverseGeocode[0].region}, ${reverseGeocode[0].country}`;
        }
      } catch (error) {
        console.log('Could not get location name:', error);
      }
    } else if (userLocation) {
      baseLat = userLocation.coords.latitude;
      baseLng = userLocation.coords.longitude;
    } else {
      // Fallback to default coordinates if no user location
      return [
        { id: 1, name: 'Trailhead Start', lat: 34.0522, lng: -118.2437, completed: false },
        { id: 2, name: 'Scenic Viewpoint', lat: 34.0523, lng: -118.2438, completed: false },
        { id: 3, name: 'Rest Area', lat: 34.0524, lng: -118.2439, completed: false },
        { id: 4, name: 'Photo Point', lat: 34.0525, lng: -118.2440, completed: false },
        { id: 5, name: 'Trail End', lat: 34.0526, lng: -118.2441, completed: false },
      ];
    }

    // Generate AI checkpoints if we have API key
    const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (GEMINI_API_KEY) {
      try {
        const aiCheckpoints = await generateAICheckpoints(locationName, hike, baseLat, baseLng);
        if (aiCheckpoints && aiCheckpoints.length === 5) {
          return aiCheckpoints;
        }
      } catch (error) {
        console.error('AI checkpoint generation failed:', error);
      }
    }

    // Fallback to algorithmic generation
    return generateFallbackCheckpoints(baseLat, baseLng);
  };

  // AI-powered checkpoint generation
  const generateAICheckpoints = async (locationName: string, hikeData: HikeData, baseLat: number, baseLng: number) => {
    const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (!GEMINI_API_KEY) return null;

    try {
      const prompt = `Generate 5 realistic hiking checkpoints for the trail "${hikeData.name}" near ${locationName} (${baseLat}, ${baseLng}).

Trail details:
- Distance: ${hikeData.distance}
- Difficulty: ${hikeData.difficulty}
- Duration: ${hikeData.duration}
- Description: ${hikeData.description}

For each checkpoint, provide:
- name: Realistic, location-specific checkpoint name (consider local geography, landmarks, terrain features)
- description: Brief description of what hikers will find there

Checkpoints should progress logically from start to finish for a ${hikeData.difficulty} ${hikeData.distance} trail.
Consider local geography like hills, valleys, parks, landmarks, water features, viewpoints.

Return ONLY a JSON array:
[
  {
    "name": "Checkpoint Name",
    "description": "What hikers will find here"
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
        responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const aiCheckpoints = JSON.parse(responseText) as AICheckpoint[];
        
        // Calculate distance and spread for positioning
        const distance = parseFloat(hikeData.distance.replace(/[^\d.]/g, '')) || 3;
        const difficultyMultiplier = {
          'Easy': 0.3,
          'Medium': 0.5,
          'Hard': 0.8
        }[hikeData.difficulty] || 0.3;
        
        const maxSpread = distance * difficultyMultiplier * 0.01;
        
        // Create checkpoint objects with AI names and calculated positions
        return aiCheckpoints.map((checkpoint: AICheckpoint, index: number) => {
          const progress = index / 4; // 0 to 1
          const angle = (Math.random() - 0.5) * Math.PI * 0.5;
          const currentSpread = maxSpread * progress;
          
          const lat = baseLat + (Math.cos(angle) * currentSpread);
          const lng = baseLng + (Math.sin(angle) * currentSpread);
          
          return {
            id: index + 1,
            name: checkpoint.name || `Checkpoint ${index + 1}`,
            description: checkpoint.description || 'A point of interest along the trail',
            lat: parseFloat(lat.toFixed(6)),
            lng: parseFloat(lng.toFixed(6)),
            completed: false
          };
        });
      }
    } catch (error) {
      console.error('AI checkpoint generation error:', error);
    }
    
    return null;
  };

  // Fallback algorithmic checkpoint generation
  const generateFallbackCheckpoints = (baseLat: number, baseLng: number) => {
    const distance = parseFloat(hike.distance.replace(/[^\d.]/g, '')) || 3;
    const difficultyMultiplier = {
      'Easy': 0.3,
      'Medium': 0.5,
      'Hard': 0.8
    }[hike.difficulty] || 0.3;
    
    const maxSpread = distance * difficultyMultiplier * 0.01;
    
    const checkpointNames = {
      'Easy': [
        'Trail Start',
        'Information Board',
        'Rest Bench',
        'Scenic Spot',
        'Trail End'
      ],
      'Medium': [
        'Trailhead',
        'First Viewpoint',
        'Creek Crossing',
        'Summit Approach',
        'Trail Completion'
      ],
      'Hard': [
        'Base Camp',
        'Steep Ascent Point',
        'Ridge Line',
        'Summit Views',
        'Descent Marker'
      ]
    };

    const names = checkpointNames[hike.difficulty] || checkpointNames['Easy'];
    
    return names.map((name, index) => {
      const progress = index / 4;
      const angle = (Math.random() - 0.5) * Math.PI * 0.5;
      const currentSpread = maxSpread * progress;
      
      const lat = baseLat + (Math.cos(angle) * currentSpread);
      const lng = baseLng + (Math.sin(angle) * currentSpread);
      
      return {
        id: index + 1,
        name,
        lat: parseFloat(lat.toFixed(6)),
        lng: parseFloat(lng.toFixed(6)),
        completed: false
      };
    });
  };

  const [questCheckpoints, setQuestCheckpoints] = useState<any[]>([]);

  // Initialize checkpoints only once
  useEffect(() => {
    const initializeCheckpoints = async () => {
      const checkpoints = await generateQuestCheckpoints();
      setQuestCheckpoints(checkpoints);
    };
    initializeCheckpoints();
  }, [hike.id]); // Only re-run if the hike ID changes

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTracking && hikeStartTime) {
      interval = setInterval(() => {
        setTimeElapsed(Date.now() - hikeStartTime.getTime());
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, hikeStartTime]);

  useEffect(() => {
    if (isTracking) {
      const watchLocation = async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission denied', 'Location permission is required for quest tracking.');
          return;
        }

        Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (location) => {
            setUserLocation(location);
            checkQuestProgress(location);
          }
        );
      };
      watchLocation();
    }
  }, [isTracking]);

  const checkQuestProgress = (currentLocation: Location.LocationObject) => {
    const { latitude, longitude } = currentLocation.coords;
    
    questCheckpoints.forEach((checkpoint, index) => {
      if (!checkpoints.includes(checkpoint.id)) {
        const distance = getDistanceFromLatLonInKm(
          latitude,
          longitude,
          checkpoint.lat,
          checkpoint.lng
        );
        
        // If within 50 meters of checkpoint
        if (distance < 0.05) {
          const newCheckpoints = [...checkpoints, checkpoint.id];
          setCheckpoints(newCheckpoints);
          setQuestProgress((newCheckpoints.length / questCheckpoints.length) * 100);
          
          Alert.alert(
            '🎯 Checkpoint Reached!',
            `You've reached ${checkpoint.name}!`,
            [{ text: 'Continue', style: 'default' }]
          );

          // Check if quest is completed
          if (newCheckpoints.length === questCheckpoints.length) {
            completeQuest();
          }
        }
      }
    });
  };

  const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d;
  };

  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
  };

  const startQuest = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to start quest tracking.');
      return;
    }

    setIsTracking(true);
    setHikeStartTime(new Date());
    setQuestProgress(0);
    setCheckpoints([]);
    setDistanceTraveled(0);
    
    Alert.alert(
      '🚀 Quest Started!',
      `Your ${hike.name} quest has begun. Visit all checkpoints to earn rewards!`,
      [{ text: 'Let\'s Go!', style: 'default' }]
    );
  };

  const pauseQuest = () => {
    setIsTracking(false);
    Alert.alert('Quest Paused', 'Your quest tracking has been paused.');
  };

  const completeQuest = async () => {
    setIsTracking(false);
    
    if (!user) return;

    try {
      // Save quest completion to database
      const { error } = await supabase
        .from('quest_completions')
        .insert({
          user_id: user.id,
          hike_id: hike.id,
          completion_time: timeElapsed,
          checkpoints_completed: checkpoints.length,
          difficulty: hike.difficulty,
          completed_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving quest completion:', error);
      }

      // Award badges based on completion
      await awardBadges();
      
      Alert.alert(
        '🏆 Quest Completed!',
        `Congratulations! You've completed the ${hike.name} quest and earned rewards!`,
        [
          { text: 'View Badges', onPress: () => router.push('/badges') },
          { text: 'Great!', style: 'default' }
        ]
      );
    } catch (error) {
      console.error('Error completing quest:', error);
    }
  };

  const awardBadges = async () => {
    if (!user) return;

    const badges = [];
    
    // First hike badge
    if (completedQuests.length === 0) {
      badges.push({
        user_id: user.id,
        badge_type: 'first_hike',
        badge_name: 'First Steps',
        badge_description: 'Completed your first hiking quest',
        earned_at: new Date().toISOString()
      });
    }

    // Difficulty-based badges
    if (hike.difficulty === 'Easy') {
      badges.push({
        user_id: user.id,
        badge_type: 'easy_explorer',
        badge_name: 'Easy Explorer',
        badge_description: 'Completed an easy trail',
        earned_at: new Date().toISOString()
      });
    } else if (hike.difficulty === 'Medium') {
      badges.push({
        user_id: user.id,
        badge_type: 'moderate_trekker',
        badge_name: 'Moderate Trekker',
        badge_description: 'Conquered a medium difficulty trail',
        earned_at: new Date().toISOString()
      });
    } else if (hike.difficulty === 'Hard') {
      badges.push({
        user_id: user.id,
        badge_type: 'mountain_master',
        badge_name: 'Mountain Master',
        badge_description: 'Conquered a challenging trail',
        earned_at: new Date().toISOString()
      });
    }

    // Speed badges (if completed under expected time)
    const expectedTime = parseInt(hike.duration) * 60 * 1000; // Convert to milliseconds
    if (timeElapsed < expectedTime * 0.8) {
      badges.push({
        user_id: user.id,
        badge_type: 'speed_demon',
        badge_name: 'Speed Demon',
        badge_description: 'Completed trail 20% faster than expected',
        earned_at: new Date().toISOString()
      });
    }

    // Save badges to database
    if (badges.length > 0) {
      const { error } = await supabase
        .from('user_badges')
        .insert(badges);

      if (error) {
        console.error('Error saving badges:', error);
      }
    }
  };

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const handleStartHike = () => {
    router.push('/directions');
  };

  const toggleFavorite = () => {
    setIsFavorited(!isFavorited);
  };

  const handleShare = () => {
    console.log('Share hike details');
  };

  return (
    <LinearGradient colors={['#8B5CF6', '#7C3AED', '#6366F1']} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Trail Details</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
              <Share2 size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleFavorite} style={styles.actionButton}>
              <Heart 
                size={20} 
                color={isFavorited ? "#FF6B6B" : "#FFFFFF"} 
                fill={isFavorited ? "#FF6B6B" : "transparent"} 
              />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Hero Section */}
          <BlurView intensity={80} tint="dark" style={styles.heroSection}>
            <View style={styles.heroHeader}>
              <View style={styles.heroTitleContainer}>
                <Text style={styles.hikeName}>{hike.name}</Text>
                <View style={styles.ratingContainer}>
                  <Star size={16} color="#FFD700" fill="#FFD700" />
                  <Text style={styles.rating}>{hike.rating}</Text>
                  <Text style={styles.ratingCount}>(127 reviews)</Text>
                </View>
              </View>
              <View style={[styles.difficultyBadge, { backgroundColor: difficultyColors[hike.difficulty as keyof typeof difficultyColors] }]}>
                <Text style={styles.difficultyText}>{hike.difficulty}</Text>
              </View>
            </View>

            <Text style={styles.description}>{hike.description}</Text>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <MapPin size={20} color="#A78BFA" />
                <Text style={styles.statLabel}>Distance</Text>
                <Text style={styles.statValue}>{hike.distance}</Text>
              </View>
              <View style={styles.statCard}>
                <Clock size={20} color="#A78BFA" />
                <Text style={styles.statLabel}>Duration</Text>
                <Text style={styles.statValue}>{hike.duration}</Text>
              </View>
              <View style={styles.statCard}>
                <TrendingUp size={20} color="#A78BFA" />
                <Text style={styles.statLabel}>Elevation</Text>
                <Text style={styles.statValue}>{hike.elevation}</Text>
              </View>
            </View>
          </BlurView>

          {/* Quick Info */}
          <BlurView intensity={80} tint="dark" style={styles.section}>
            <View style={styles.sectionHeader}>
              <Info size={20} color="#FFFFFF" />
              <Text style={styles.sectionTitle}>Quick Info</Text>
            </View>
            <View style={styles.quickInfoGrid}>
              <View style={styles.quickInfoItem}>
                <Users size={16} color="rgba(255, 255, 255, 0.7)" />
                <Text style={styles.quickInfoText}>Family Friendly</Text>
              </View>
              <View style={styles.quickInfoItem}>
                <CheckCircle size={16} color="#4CAF50" />
                <Text style={styles.quickInfoText}>{hike.accessibility}</Text>
              </View>
              <View style={styles.quickInfoItem}>
                <Camera size={16} color="rgba(255, 255, 255, 0.7)" />
                <Text style={styles.quickInfoText}>Pet Friendly</Text>
              </View>
            </View>
          </BlurView>

          {/* Description */}
          <BlurView intensity={80} tint="dark" style={styles.section}>
            <Text style={styles.sectionTitle}>About This Trail</Text>
            <Text style={styles.longDescription}>{hike.longDescription}</Text>
          </BlurView>

          {/* Highlights */}
          <BlurView intensity={80} tint="dark" style={styles.section}>
            <Text style={styles.sectionTitle}>Trail Highlights</Text>
            {(hike.highlights || []).map((highlight: string, index: number) => (
              <View key={index} style={styles.highlightItem}>
                <View style={styles.highlightBullet} />
                <Text style={styles.highlightText}>{highlight}</Text>
              </View>
            ))}
          </BlurView>

          {/* Tips */}
          <BlurView intensity={80} tint="dark" style={styles.section}>
            <Text style={styles.sectionTitle}>Helpful Tips</Text>
            {(hike.tips || []).map((tip: string, index: number) => (
              <View key={index} style={styles.tipItem}>
                <CheckCircle size={16} color="#4CAF50" />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </BlurView>

          {/* Warnings */}
          <BlurView intensity={80} tint="dark" style={styles.section}>
            <View style={styles.sectionHeader}>
              <AlertTriangle size={20} color="#FF9800" />
              <Text style={styles.sectionTitle}>Important Notes</Text>
            </View>
            {(hike.warnings || []).map((warning: string, index: number) => (
              <View key={index} style={styles.warningItem}>
                <AlertTriangle size={16} color="#FF9800" />
                <Text style={styles.warningText}>{warning}</Text>
              </View>
            ))}
          </BlurView>

          {/* Quest Tracking Section */}
          <BlurView intensity={80} tint="dark" style={styles.section}>
            <View style={styles.sectionHeader}>
              <Target size={20} color="#A78BFA" />
              <Text style={styles.sectionTitle}>Quest Tracking</Text>
            </View>
            
            {isTracking ? (
              <View style={styles.questTrackingActive}>
                <View style={styles.questStats}>
                  <View style={styles.questStatItem}>
                    <Clock size={16} color="#A78BFA" />
                    <Text style={styles.questStatLabel}>Time</Text>
                    <Text style={styles.questStatValue}>{formatTime(timeElapsed)}</Text>
                  </View>
                  <View style={styles.questStatItem}>
                    <Target size={16} color="#A78BFA" />
                    <Text style={styles.questStatLabel}>Progress</Text>
                    <Text style={styles.questStatValue}>{Math.round(questProgress)}%</Text>
                  </View>
                  <View style={styles.questStatItem}>
                    <CheckCircle size={16} color="#4CAF50" />
                    <Text style={styles.questStatLabel}>Checkpoints</Text>
                    <Text style={styles.questStatValue}>{checkpoints.length}/{questCheckpoints.length}</Text>
                  </View>
                </View>
                
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${questProgress}%` }]} />
                  </View>
                  <Text style={styles.progressText}>Quest Progress: {Math.round(questProgress)}%</Text>
                </View>

                <TouchableOpacity style={styles.pauseButton} onPress={pauseQuest}>
                  <Pause size={20} color="#FFFFFF" />
                  <Text style={styles.pauseButtonText}>Pause Quest</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.questTrackingInactive}>
                <View style={styles.questInfo}>
                  <Trophy size={24} color="#FFD700" />
                  <Text style={styles.questInfoTitle}>Start Your Quest!</Text>
                  <Text style={styles.questInfoDesc}>
                    Visit all {questCheckpoints.length} checkpoints to complete this hiking quest and earn exclusive badges!
                  </Text>
                </View>
                
                <View style={styles.rewardsPreview}>
                  <Text style={styles.rewardsTitle}>🏆 Potential Rewards:</Text>
                  <View style={styles.rewardsList}>
                    <View style={styles.rewardItem}>
                      <Award size={16} color="#A78BFA" />
                      <Text style={styles.rewardText}>Trail Completion Badge</Text>
                    </View>
                    <View style={styles.rewardItem}>
                      <Award size={16} color="#4CAF50" />
                      <Text style={styles.rewardText}>{hike.difficulty} Explorer Badge</Text>
                    </View>
                    <View style={styles.rewardItem}>
                      <Award size={16} color="#FF9800" />
                      <Text style={styles.rewardText}>Speed Bonus (if fast enough)</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity style={styles.startQuestButton} onPress={startQuest}>
                  <Play size={20} color="#FFFFFF" />
                  <Text style={styles.startQuestButtonText}>Start Quest</Text>
                </TouchableOpacity>
              </View>
            )}
          </BlurView>

          {/* Checkpoints List */}
          <BlurView intensity={80} tint="dark" style={styles.section}>
            <Text style={styles.sectionTitle}>Quest Checkpoints</Text>
            {questCheckpoints.map((checkpoint, index) => (
              <View key={checkpoint.id} style={styles.checkpointItem}>
                <View style={[
                  styles.checkpointIcon,
                  { backgroundColor: checkpoints.includes(checkpoint.id) ? '#4CAF50' : 'rgba(255, 255, 255, 0.2)' }
                ]}>
                  {checkpoints.includes(checkpoint.id) ? (
                    <CheckCircle size={16} color="#FFFFFF" />
                  ) : (
                    <Text style={styles.checkpointNumber}>{index + 1}</Text>
                  )}
                </View>
                <View style={styles.checkpointInfo}>
                  <Text style={[
                    styles.checkpointName,
                    { color: checkpoints.includes(checkpoint.id) ? '#4CAF50' : 'rgba(255, 255, 255, 0.9)' }
                  ]}>
                    {checkpoint.name}
                  </Text>
                  <Text style={styles.checkpointStatus}>
                    {checkpoints.includes(checkpoint.id) ? '✅ Completed' : '⏳ Pending'}
                  </Text>
                </View>
              </View>
            ))}
          </BlurView>

          {/* Tags */}
          <View style={styles.tagsContainer}>
            {hike.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Start Hike Button */}
        <BlurView intensity={80} tint="dark" style={styles.actionContainer}>
          <TouchableOpacity style={styles.startButton} onPress={handleStartHike}>
            <Navigation size={20} color="#FFFFFF" />
            <Text style={styles.startButtonText}>Start Navigation</Text>
          </TouchableOpacity>
        </BlurView>
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
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  heroSection: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  heroTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  hikeName: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFD700',
  },
  ratingCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 4,
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
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  section: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  longDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 24,
  },
  quickInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  quickInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: '45%',
  },
  quickInfoText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  highlightBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#A78BFA',
    marginRight: 12,
  },
  highlightText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    flex: 1,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  warningText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  tagText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  actionContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  startButtonText: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  // Quest Tracking Styles
  questTrackingActive: {
    alignItems: 'center',
  },
  questTrackingInactive: {
    alignItems: 'center',
  },
  questStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  questStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  questStatLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
    marginBottom: 2,
  },
  questStatValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#A78BFA',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  pauseButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  questInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  questInfoTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
    marginVertical: 12,
  },
  questInfoDesc: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 20,
  },
  rewardsPreview: {
    width: '100%',
    marginBottom: 20,
  },
  rewardsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  rewardsList: {
    gap: 8,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rewardText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  startQuestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    gap: 8,
  },
  startQuestButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  checkpointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkpointIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  checkpointNumber: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  checkpointInfo: {
    flex: 1,
  },
  checkpointName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  checkpointStatus: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
  },
});

export default HikeDetailsScreen;
