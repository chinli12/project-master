import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Trophy, 
  Star, 
  Shield, 
  ChevronLeft, 
  Award,
  MapPin,
  Camera,
  Users,
  Target,
  Zap,
  Crown,
  Medal,
  Calendar,
  CheckCircle,
  Circle,
  Lock
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: 'exploration' | 'social' | 'special' | 'milestone';
  difficulty: 'bronze' | 'silver' | 'gold' | 'platinum';
  progress: number;
  maxProgress: number;
  completed: boolean;
  points: number;
  unlockedDate?: string;
  requirements?: string[];
}

const achievements: Achievement[] = [
  // Exploration Achievements
  {
    id: '1',
    name: 'First Steps',
    description: 'Complete your first exploration quest',
    icon: MapPin,
    category: 'exploration',
    difficulty: 'bronze',
    progress: 1,
    maxProgress: 1,
    completed: true,
    points: 100,
    unlockedDate: '2025-01-15',
    requirements: ['Visit your first location']
  },
  {
    id: '2',
    name: 'Urban Explorer',
    description: 'Visit 10 different locations',
    icon: Award,
    category: 'exploration',
    difficulty: 'silver',
    progress: 7,
    maxProgress: 10,
    completed: false,
    points: 250,
    requirements: ['Visit 10 unique locations']
  },
  {
    id: '3',
    name: 'Globe Trotter',
    description: 'Visit locations in 5 different cities',
    icon: Trophy,
    category: 'exploration',
    difficulty: 'gold',
    progress: 3,
    maxProgress: 5,
    completed: false,
    points: 500,
    requirements: ['Visit locations in 5 different cities']
  },
  {
    id: '4',
    name: 'World Wanderer',
    description: 'Visit 100 unique locations',
    icon: Crown,
    category: 'exploration',
    difficulty: 'platinum',
    progress: 45,
    maxProgress: 100,
    completed: false,
    points: 1000,
    requirements: ['Visit 100 unique locations worldwide']
  },

  // Social Achievements
  {
    id: '5',
    name: 'Storyteller',
    description: 'Share your first story',
    icon: Camera,
    category: 'social',
    difficulty: 'bronze',
    progress: 1,
    maxProgress: 1,
    completed: true,
    points: 150,
    unlockedDate: '2025-01-20',
    requirements: ['Share your first location story']
  },
  {
    id: '6',
    name: 'Social Butterfly',
    description: 'Make 5 new friends',
    icon: Users,
    category: 'social',
    difficulty: 'silver',
    progress: 3,
    maxProgress: 5,
    completed: false,
    points: 300,
    requirements: ['Connect with 5 new users']
  },
  {
    id: '7',
    name: 'Community Leader',
    description: 'Get 100 likes on your stories',
    icon: Star,
    category: 'social',
    difficulty: 'gold',
    progress: 68,
    maxProgress: 100,
    completed: false,
    points: 750,
    requirements: ['Receive 100 total likes on your stories']
  },

  // Special Achievements
  {
    id: '8',
    name: 'Speed Runner',
    description: 'Visit 5 locations in one day',
    icon: Zap,
    category: 'special',
    difficulty: 'silver',
    progress: 0,
    maxProgress: 5,
    completed: false,
    points: 400,
    requirements: ['Visit 5 locations within 24 hours']
  },
  {
    id: '9',
    name: 'Night Owl',
    description: 'Visit a location after midnight',
    icon: Target,
    category: 'special',
    difficulty: 'bronze',
    progress: 0,
    maxProgress: 1,
    completed: false,
    points: 200,
    requirements: ['Visit any location between 12:00 AM - 6:00 AM']
  },

  // Milestone Achievements
  {
    id: '10',
    name: 'Veteran Explorer',
    description: 'Use GeoTeller for 30 days',
    icon: Calendar,
    category: 'milestone',
    difficulty: 'gold',
    progress: 18,
    maxProgress: 30,
    completed: false,
    points: 600,
    requirements: ['Active usage for 30 consecutive days']
  }
];

const AchievementsScreen = () => {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', name: 'All', count: achievements.length },
    { id: 'exploration', name: 'Explorer', count: achievements.filter(a => a.category === 'exploration').length },
    { id: 'social', name: 'Social', count: achievements.filter(a => a.category === 'social').length },
    { id: 'special', name: 'Special', count: achievements.filter(a => a.category === 'special').length },
    { id: 'milestone', name: 'Milestone', count: achievements.filter(a => a.category === 'milestone').length },
  ];

  const filteredAchievements = selectedCategory === 'all' 
    ? achievements 
    : achievements.filter(achievement => achievement.category === selectedCategory);

  const completedCount = achievements.filter(achievement => achievement.completed).length;
  const totalPoints = achievements
    .filter(achievement => achievement.completed)
    .reduce((sum, achievement) => sum + achievement.points, 0);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'bronze': return '#CD7F32';
      case 'silver': return '#C0C0C0';
      case 'gold': return '#FFD700';
      case 'platinum': return '#E5E4E2';
      default: return '#6B7280';
    }
  };

  const getDifficultyGradient = (difficulty: string): [string, string] => {
    switch (difficulty) {
      case 'bronze': return ['#CD7F32', '#A0522D'];
      case 'silver': return ['#C0C0C0', '#A8A8A8'];
      case 'gold': return ['#FFD700', '#FFA500'];
      case 'platinum': return ['#E5E4E2', '#D3D3D3'];
      default: return ['#6B7280', '#4B5563'];
    }
  };

  const renderAchievement = (achievement: Achievement) => {
    const IconComponent = achievement.icon;
    const progressPercentage = (achievement.progress / achievement.maxProgress) * 100;
    const difficultyColors = getDifficultyGradient(achievement.difficulty);

    return (
      <TouchableOpacity 
        key={achievement.id} 
        style={[
          styles.achievementCard,
          achievement.completed && styles.completedCard
        ]}
      >
        <View style={styles.achievementHeader}>
          <LinearGradient
            colors={achievement.completed ? difficultyColors : ['#6B7280', '#4B5563']}
            style={[
              styles.iconContainer,
              achievement.completed && styles.completedIconContainer
            ]}
          >
            <IconComponent 
              size={32} 
              color="#FFFFFF" 
              strokeWidth={2}
            />
          </LinearGradient>

          <View style={styles.achievementInfo}>
            <View style={styles.achievementTitleRow}>
              <Text style={[
                styles.achievementName,
                !achievement.completed && styles.uncompletedText
              ]}>
                {achievement.name}
              </Text>
              <View style={[
                styles.difficultyBadge,
                { backgroundColor: getDifficultyColor(achievement.difficulty) }
              ]}>
                <Text style={styles.difficultyText}>
                  {achievement.difficulty.toUpperCase()}
                </Text>
              </View>
            </View>

            <Text style={[
              styles.achievementDescription,
              !achievement.completed && styles.uncompletedDescription
            ]}>
              {achievement.description}
            </Text>

            <View style={styles.achievementMeta}>
              <View style={styles.pointsContainer}>
                <Trophy size={16} color="#F59E0B" strokeWidth={2} />
                <Text style={styles.pointsText}>{achievement.points} pts</Text>
              </View>

              {achievement.completed ? (
                <View style={styles.completedContainer}>
                  <CheckCircle size={16} color="#10B981" strokeWidth={2} />
                  <Text style={styles.completedText}>
                    {achievement.unlockedDate && `Unlocked ${achievement.unlockedDate}`}
                  </Text>
                </View>
              ) : (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill,
                        { 
                          width: `${progressPercentage}%`,
                          backgroundColor: '#8B5CF6'
                        }
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {achievement.progress}/{achievement.maxProgress}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {achievement.requirements && (
          <View style={styles.requirementsContainer}>
            <Text style={styles.requirementsTitle}>Requirements:</Text>
            {achievement.requirements.map((req, index) => (
              <Text key={index} style={styles.requirementItem}>
                • {req}
              </Text>
            ))}
          </View>
        )}
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
              <Award size={28} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.headerTitle}>Achievements</Text>
            </View>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{completedCount}</Text>
              <Text style={styles.statLabel}>Unlocked</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{achievements.length - completedCount}</Text>
              <Text style={styles.statLabel}>Remaining</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalPoints.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.categoriesContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
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
              <Text style={[
                styles.categoryText,
                selectedCategory === category.id && styles.selectedCategoryText
              ]}>
                {category.name}
              </Text>
              <View style={[
                styles.categoryCount,
                selectedCategory === category.id && styles.selectedCategoryCount
              ]}>
                <Text style={[
                  styles.categoryCountText,
                  selectedCategory === category.id && styles.selectedCategoryCountText
                ]}>
                  {category.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filteredAchievements.map(renderAchievement)}
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  categoriesContainer: {
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoriesContent: {
    paddingHorizontal: 24,
    gap: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    gap: 8,
  },
  selectedCategoryButton: {
    backgroundColor: '#8B5CF6',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  selectedCategoryText: {
    color: '#FFFFFF',
  },
  categoryCount: {
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  selectedCategoryCount: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryCountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  selectedCategoryCountText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 16,
  },
  achievementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    opacity: 0.7,
  },
  completedCard: {
    opacity: 1,
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  completedIconContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  achievementName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  uncompletedText: {
    color: '#9CA3AF',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  achievementDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  uncompletedDescription: {
    color: '#9CA3AF',
  },
  achievementMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pointsText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
  completedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  progressContainer: {
    flex: 1,
    marginLeft: 16,
    alignItems: 'flex-end',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    width: 80,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  requirementsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  requirementItem: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 4,
  },
});

export default AchievementsScreen;
