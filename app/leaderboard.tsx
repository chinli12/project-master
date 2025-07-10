import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

const leaderboardData = [
  { id: '1', name: 'Alex', score: 5000, avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d' },
  { id: '2', name: 'Maria', score: 4500, avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704e' },
  { id: '3', name: 'John', score: 4000, avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704f' },
  { id: '4', name: 'Sara', score: 3500, avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704a' },
  { id: '5', name: 'Chris', score: 3000, avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704b' },
];

type LeaderboardItem = {
  id: string;
  name: string;
  score: number;
  avatar: string;
};

const LeaderboardScreen = () => {
  const router = useRouter();

  const renderItem = ({ item, index }: { item: LeaderboardItem, index: number }) => (
    <BlurView intensity={80} tint="dark" style={styles.item}>
      <Text style={styles.rank}>{index + 1}</Text>
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.score}>{item.score} XP</Text>
    </BlurView>
  );

  return (
    <LinearGradient colors={['#2c3e50', '#3498db']} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={46} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Leaderboard</Text>
        </View>
        <FlatList
          data={leaderboardData}
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
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  rank: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    marginRight: 15,
    width: 30,
    textAlign: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  name: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  score: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#FFD700',
  },
});

export default LeaderboardScreen;
