import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ChevronLeft, Trophy, Medal, Award, Crown, Star, TrendingUp, MapPin, Users } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const leaderboardData: LeaderboardItem[] = [
  { 
    id: '1', 
    name: 'Alex Thompson', 
    username: '@alexplorer',
    score: 5000, 
    avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
    placesVisited: 45,
    storiesShared: 28,
    level: 12,
    trend: 'up' as const
  },
  { 
    id: '2', 
    name: 'Maria Garcia', 
    username: '@maria_wanderer',
    score: 4500, 
    avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704e',
    placesVisited: 38,
    storiesShared: 35,
    level: 11,
    trend: 'up' as const
  },
  { 
    id: '3', 
    name: 'John Smith', 
    username: '@johnexplores',
    score: 4000, 
    avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704f',
    placesVisited: 32,
    storiesShared: 22,
    level: 10,
    trend: 'down' as const
  },
  { 
    id: '4', 
    name: 'Sara Wilson', 
    username: '@sara_stories',
    score: 3500, 
    avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704a',
    placesVisited: 28,
    storiesShared: 31,
    level: 9,
    trend: 'up' as const
  },
  { 
    id: '5', 
    name: 'Chris Brown', 
    username: '@chris_adventurer',
    score: 3000, 
    avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704b',
    placesVisited: 25,
    storiesShared: 18,
    level: 8,
    trend: 'stable' as const
  },
  { 
    id: '6', 
    name: 'Emma Davis', 
    username: '@emma_explorer',
    score: 2800, 
    avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704c',
    placesVisited: 22,
    storiesShared: 24,
    level: 8,
    trend: 'up' as const
  },
  { 
    id: '7', 
    name: 'David Johnson', 
    username: '@david_travels',
    score: 2500, 
    avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704g',
    placesVisited: 20,
    storiesShared: 15,
    level: 7,
    trend: 'stable' as const
  },
];

type LeaderboardItem = {
  id: string;
  name: string;
  username: string;
  score: number;
  avatar: string;
  placesVisited: number;
  storiesShared: number;
  level: number;
  trend: 'up' | 'down' | 'stable';
};

type TimeFilter = 'weekly' | 'monthly' | 'allTime';

const LeaderboardScreen = () => {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState<TimeFilter>('weekly');

  const timePeriods = [
    { id: 'weekly' as TimeFilter, name: 'This Week', icon: TrendingUp },
    { id: 'monthly' as TimeFilter, name: 'This Month', icon: Trophy },
    { id: 'allTime' as TimeFilter, name: 'All Time', icon: Crown },
  ];

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1: return <Crown size={24} color="#F59E0B" strokeWidth={2.5} />;
      case 2: return <Medal size={24} color="#E5E7EB" strokeWidth={2.5} />;
      case 3: return <Award size={24} color="#CD7C2F" strokeWidth={2.5} />;
      default: return null;
    }
  };

  const getRankBackground = (position: number): [string, string] => {
    switch (position) {
      case 1: return ['#F59E0B', '#F97316'];
      case 2: return ['#E5E7EB', '#D1D5DB'];
      case 3: return ['#CD7C2F', '#B45309'];
      default: return ['#8B5CF6', '#7C3AED'];
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp size={16} color="#10B981" strokeWidth={2} />;
      case 'down': return <TrendingUp size={16} color="#EF4444" strokeWidth={2} style={{ transform: [{ rotate: '180deg' }] }} />;
      default: return <TrendingUp size={16} color="#6B7280" strokeWidth={2} style={{ transform: [{ rotate: '90deg' }] }} />;
    }
  };

  const renderTopThree = () => {
    const topThree = leaderboardData.slice(0, 3);
    
    return (
      <View style={styles.podiumContainer}>
        {/* Second Place */}
        <View style={[styles.podiumItem, styles.secondPlace]}>
          <LinearGradient
            colors={getRankBackground(2)}
            style={styles.podiumAvatar}
          >
            <Image source={{ uri: topThree[1]?.avatar }} style={styles.podiumAvatarImage} />
          </LinearGradient>
          <View style={styles.podiumRank}>
            {getRankIcon(2)}
          </View>
          <Text style={styles.podiumName}>{topThree[1]?.name.split(' ')[0]}</Text>
          <Text style={styles.podiumScore}>{topThree[1]?.score.toLocaleString()}</Text>
        </View>

        {/* First Place */}
        <View style={[styles.podiumItem, styles.firstPlace]}>
          <LinearGradient
            colors={getRankBackground(1)}
            style={[styles.podiumAvatar, styles.firstPlaceAvatar]}
          >
            <Image source={{ uri: topThree[0]?.avatar }} style={styles.podiumAvatarImage} />
          </LinearGradient>
          <View style={styles.podiumRank}>
            {getRankIcon(1)}
          </View>
          <Text style={[styles.podiumName, styles.firstPlaceName]}>{topThree[0]?.name.split(' ')[0]}</Text>
          <Text style={[styles.podiumScore, styles.firstPlaceScore]}>{topThree[0]?.score.toLocaleString()}</Text>
        </View>

        {/* Third Place */}
        <View style={[styles.podiumItem, styles.thirdPlace]}>
          <LinearGradient
            colors={getRankBackground(3)}
            style={styles.podiumAvatar}
          >
            <Image source={{ uri: topThree[2]?.avatar }} style={styles.podiumAvatarImage} />
          </LinearGradient>
          <View style={styles.podiumRank}>
            {getRankIcon(3)}
          </View>
          <Text style={styles.podiumName}>{topThree[2]?.name.split(' ')[0]}</Text>
          <Text style={styles.podiumScore}>{topThree[2]?.score.toLocaleString()}</Text>
        </View>
      </View>
    );
  };

  const renderLeaderboardItem = ({ item, index }: { item: LeaderboardItem, index: number }) => {
    if (index < 3) return null; // Top 3 are shown in podium

    return (
      <TouchableOpacity style={styles.leaderboardItem}>
        <View style={styles.rankContainer}>
          <Text style={styles.rankNumber}>{index + 1}</Text>
        </View>

        <View style={styles.avatarContainer}>
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{item.level}</Text>
          </View>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userHandle}>{item.username}</Text>
          <View style={styles.userStats}>
            <View style={styles.statItem}>
              <MapPin size={12} color="#6B7280" strokeWidth={2} />
              <Text style={styles.statText}>{item.placesVisited}</Text>
            </View>
            <View style={styles.statItem}>
              <Star size={12} color="#6B7280" strokeWidth={2} />
              <Text style={styles.statText}>{item.storiesShared}</Text>
            </View>
          </View>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={styles.scoreValue}>{item.score.toLocaleString()}</Text>
          <View style={styles.trendContainer}>
            {getTrendIcon(item.trend as 'up' | 'down' | 'stable')}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#8B5CF6', '#7C3AED', '#6366F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <SafeAreaView>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <ChevronLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <Trophy size={28} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.headerTitle}>Leaderboard</Text>
            </View>
          </View>

          <View style={styles.periodSelector}>
            {timePeriods.map(period => {
              const IconComponent = period.icon;
              return (
                <TouchableOpacity
                  key={period.id}
                  style={[
                    styles.periodButton,
                    selectedPeriod === period.id && styles.selectedPeriodButton
                  ]}
                  onPress={() => setSelectedPeriod(period.id)}
                >
                  <IconComponent 
                    size={16} 
                    color={selectedPeriod === period.id ? '#8B5CF6' : 'rgba(255, 255, 255, 0.7)'} 
                    strokeWidth={2}
                  />
                  <Text style={[
                    styles.periodText,
                    selectedPeriod === period.id && styles.selectedPeriodText
                  ]}>
                    {period.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderTopThree()}

        <View style={styles.leaderboardContainer}>
          <Text style={styles.sectionTitle}>Complete Rankings</Text>
          <FlatList
            data={leaderboardData}
            renderItem={renderLeaderboardItem}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 12,
  },
  periodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    gap: 6,
  },
  selectedPeriodButton: {
    backgroundColor: '#FFFFFF',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  selectedPeriodText: {
    color: '#8B5CF6',
  },
  content: {
    flex: 1,
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 16,
  },
  podiumItem: {
    alignItems: 'center',
    flex: 1,
  },
  firstPlace: {
    marginBottom: 20,
  },
  secondPlace: {
    marginBottom: 10,
  },
  thirdPlace: {
    marginBottom: 0,
  },
  podiumAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  firstPlaceAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  podiumAvatarImage: {
    width: '90%',
    height: '90%',
    borderRadius: 40,
  },
  podiumRank: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  podiumName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  firstPlaceName: {
    fontSize: 18,
    color: '#F59E0B',
  },
  podiumScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  firstPlaceScore: {
    fontSize: 16,
    color: '#F59E0B',
  },
  leaderboardContainer: {
    backgroundColor: '#FFFFFF',
    margin: 24,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  levelBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  levelText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  userHandle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  userStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginBottom: 2,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 106,
  },
});

export default LeaderboardScreen;
