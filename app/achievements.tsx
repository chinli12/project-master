import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trophy, Star, Shield, ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';

const achievements = [
  { id: '1', name: 'First Steps', description: 'Complete your first exploration quest.', icon: <Trophy size={32} color="#FFD700" /> },
  { id: '2', name: 'Historian', description: 'Visit 5 historical sites.', icon: <Star size={32} color="#FFD700" /> },
  { id: '3', name: 'Explorer', description: 'Visit all landmarks in a city.', icon: <Shield size={32} color="#FFD700" /> },
  { id: '4', name: 'Trivia Master', description: 'Answer 10 trivia questions correctly.', icon: <Trophy size={32} color="#FFD700" /> },
];

type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
};

const AchievementsScreen = () => {
  const router = useRouter();

  const renderItem = ({ item }: { item: Achievement }) => (
    <BlurView intensity={80} tint="dark" style={styles.item}>
      <View style={styles.iconContainer}>{item.icon}</View>
      <View style={styles.textContainer}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </BlurView>
  );

  return (
    <LinearGradient colors={['#2c3e50', '#3498db']} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={46} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Achievements</Text>
        </View>
        <FlatList
          data={achievements}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          style={styles.list}
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
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    position: 'absolute',
    left: 16,
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
  list: {
    marginHorizontal: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  iconContainer: {
    marginRight: 20,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
});

export default AchievementsScreen;
