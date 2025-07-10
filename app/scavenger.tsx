import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ChevronLeft } from 'lucide-react-native';

const scavengerHunts = [
  { id: '1', name: 'City Center Hunt', description: 'Find 5 landmarks in the city center.' },
  { id: '2', name: 'Park Explorer', description: 'Take pictures of 3 different types of trees in the park.' },
  { id: '3', name: 'Museum Mystery', description: 'Find the oldest artifact in the museum.' },
];

const ScavengerScreen = () => {
  const router = useRouter();

  const renderItem = ({ item }: { item: { id: string, name: string, description: string } }) => (
    <TouchableOpacity onPress={() => router.push('/scavenger-details')}>
      <BlurView intensity={80} tint="dark" style={styles.item}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </BlurView>
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={['#2c3e50', '#3498db']} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={46} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Scavenger Hunts</Text>
        </View>
        <FlatList
          data={scavengerHunts}
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
    padding: 20,
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
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

export default ScavengerScreen;
