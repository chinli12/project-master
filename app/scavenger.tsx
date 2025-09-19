import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ImageBackground, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Compass, MapPin, Camera, Sparkles } from 'lucide-react-native';
import * as Location from 'expo-location';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

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

// Type for a single scavenger hunt
interface ScavengerHunt {
  id: string;
  name: string;
  description: string;
  icon: 'Compass' | 'Camera' | 'MapPin';
  image: string;
}

const ScavengerScreen = () => {
  const router = useRouter();
  const [scavengerHunts, setScavengerHunts] = useState<ScavengerHunt[]>([]);
  const [generating, setGenerating] = useState(true);

  useEffect(() => {
    const generateHunts = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to generate a hunt.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      const addressResponse = await Location.reverseGeocodeAsync({ latitude, longitude });
      const address = addressResponse[0];
      const locationName = `${address.street}, ${address.city}, ${address.country}`;

      const prompt = `Create an array of 5 unique and fun scavenger hunts based on the location: ${locationName}. Each hunt in the array should be a JSON object with keys "id", "name", "description", "icon", and "image". For the "icon" key, choose from 'Compass', 'Camera', or 'MapPin'. For the "image" key, provide a URL to a relevant image from Pexels or a similar free stock photo site. The entire response should be a single JSON array.`;

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

      const json = (await response.json()) as GeminiResponse;

      if (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts && json.candidates[0].content.parts[0]) {
        let generatedText = json.candidates[0].content.parts[0].text;
        generatedText = generatedText.replace(/```json/g, '').replace(/```/g, '').trim();
        try {
          const newHunts = JSON.parse(generatedText) as ScavengerHunt[];
          setScavengerHunts(newHunts);
        } catch (e) {
          console.error("Failed to parse JSON:", e);
          console.error("Raw response text:", generatedText);
          Alert.alert('Error', 'Failed to parse the scavenger hunt data from the AI.');
        }
      } else {
        console.error("Invalid response structure from Gemini API:", json);
        Alert.alert('Error', 'Failed to generate scavenger hunts due to an invalid response from the AI.');
      }

    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to generate scavenger hunts.');
    } finally {
      setGenerating(false);
    }
    };

    generateHunts();
  }, []);

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Compass':
        return <Compass size={24} color="#FFFFFF" />;
      case 'Camera':
        return <Camera size={24} color="#FFFFFF" />;
      case 'MapPin':
        return <MapPin size={24} color="#FFFFFF" />;
      default:
        return null;
    }
  };

  const renderItem = ({ item }: { item: ScavengerHunt }) => (
    <TouchableOpacity onPress={() => router.push({ pathname: '/scavenger-details', params: { hunt: JSON.stringify(item) } })}>
      <ImageBackground 
        source={{ uri: item.image }}
        style={styles.itemContainer}
        imageStyle={styles.itemImage}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.1)']}
          style={styles.itemOverlay}
        >
          <View style={styles.itemIcon}>{renderIcon(item.icon)}</View>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6D28D9', '#4F46E5']} style={styles.background} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Scavenger Hunts</Text>
        </View>
        <Text style={styles.subtitle}>Select a challenge and start exploring!</Text>
        
        {generating && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#FFFFFF" size="large" />
            <Text style={styles.loadingText}>Generating hunts for your location...</Text>
          </View>
        )}

        <FlatList
          data={scavengerHunts}
          renderItem={renderItem}
          keyExtractor={(item: ScavengerHunt) => item.id}
          contentContainerStyle={styles.list}
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 300,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1,
    marginRight: 44, // Balance the back button
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 40,
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 10,
    fontFamily: 'Inter-Regular',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  itemContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    height: 150,
    justifyContent: 'flex-end',
  },
  itemImage: {
    borderRadius: 20,
  },
  itemOverlay: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-end',
  },
  itemIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 16,
  },
  name: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
});

export default ScavengerScreen;
