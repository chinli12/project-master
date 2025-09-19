import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Dimensions, Animated, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Award, Star, MapPin, Camera, Users, Trophy, Medal, Crown, Zap } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const { width } = Dimensions.get('window');

interface Badge {
  id: string;
  name: string;
  description: string;
  icon_url: string;
  earned: boolean;
  earned_at?: string;
  category?: 'exploration' | 'social' | 'achievement' | 'special';
  progress?: number;
  maxProgress?: number;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  color?: string;
}

// Default badge icon mapping for fallback
const defaultBadgeIcons: { [key: string]: any } = {
  'scavenger-master': Trophy,
  'first-steps': MapPin,
  'explorer': Award,
  'adventurer': Star,
  'storyteller': Camera,
  'social-butterfly': Users,
  'historian': Medal,
  'early-adopter': Crown,
  'speed-demon': Zap,
};

// Default colors for badge categories
const categoryColors: { [key: string]: string } = {
  exploration: '#10B981',
  social: '#EF4444',
  achievement: '#8B5CF6',
  special: '#F59E0B',
  default: '#6B7280',
};

export default function BadgesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBadges();
  }, [user]);

  const fetchBadges = async () => {
    try {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      // Fetch all available badges
      const { data: allBadges, error: badgesError } = await supabase
        .from('badges')
        .select('*');

      if (badgesError) {
        console.error('Error fetching badges:', badgesError.message);
        setLoading(false);
        return;
      }

      // Fetch user's earned badges
      const { data: userBadges, error: userBadgesError } = await supabase
        .from('user_badges')
        .select('badge_id, created_at')
        .eq('user_id', user.id);

      if (userBadgesError) {
        console.error('Error fetching user badges:', userBadgesError.message);
      }

      // Combine badges with earned status
      const badgesWithStatus: Badge[] = (allBadges || []).map(badge => {
        const userBadge = userBadges?.find(ub => ub.badge_id === badge.id);
        return {
          ...badge,
          earned: !!userBadge,
          earned_at: userBadge?.created_at,
          category: inferCategory(badge.id),
          rarity: inferRarity(badge.id),
          color: categoryColors[inferCategory(badge.id)] || categoryColors.default,
        };
      });

      setBadges(badgesWithStatus);
    } catch (error: any) {
      console.error('Error in fetchBadges:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const inferCategory = (badgeId: string): 'exploration' | 'social' | 'achievement' | 'special' => {
    if (badgeId.includes('scavenger') || badgeId.includes('explorer') || badgeId.includes('adventurer')) {
      return 'exploration';
    }
    if (badgeId.includes('social') || badgeId.includes('storyteller')) {
      return 'social';
    }
    if (badgeId.includes('historian') || badgeId.includes('art')) {
      return 'achievement';
    }
    return 'special';
  };

  const inferRarity = (badgeId: string): 'common' | 'rare' | 'epic' | 'legendary' => {
    if (badgeId.includes('master') || badgeId.includes('legend')) return 'legendary';
    if (badgeId.includes('epic') || badgeId.includes('globe')) return 'epic';
    if (badgeId.includes('rare') || badgeId.includes('historian')) return 'rare';
    return 'common';
  };

  const categories = [
    { id: 'all', name: 'All', count: badges.length },
    { id: 'exploration', name: 'Explorer', count: badges.filter(b => b.category === 'exploration').length },
    { id: 'social', name: 'Social', count: badges.filter(b => b.category === 'social').length },
    { id: 'achievement', name: 'Achievement', count: badges.filter(b => b.category === 'achievement').length },
    { id: 'special', name: 'Special', count: badges.filter(b => b.category === 'special').length },
  ];

  const filteredBadges = selectedCategory === 'all' 
    ? badges 
    : badges.filter(badge => badge.category === selectedCategory);

  const earnedCount = badges.filter(badge => badge.earned).length;

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return '#10B981';
      case 'rare': return '#3B82F6';
      case 'epic': return '#8B5CF6';
      case 'legendary': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getRarityGlow = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return '#F59E0B';
      case 'epic': return '#8B5CF6';
      case 'rare': return '#3B82F6';
      default: return 'transparent';
    }
  };

  const renderBadge = (badge: Badge) => {
    const IconComponent = defaultBadgeIcons[badge.id] || Award;
    const progressPercentage = badge.progress && badge.maxProgress 
      ? (badge.progress / badge.maxProgress) * 100 
      : 0;

    return (
      <TouchableOpacity key={badge.id} style={[
        styles.badgeCard,
        badge.earned && styles.earnedBadgeCard,
        badge.rarity === 'legendary' && styles.legendaryGlow,
        badge.rarity === 'epic' && styles.epicGlow,
      ]}>
        <View style={[
          styles.badgeIconContainer,
          { backgroundColor: badge.earned ? (badge.color || categoryColors.default) : '#6B7280' },
          badge.earned && badge.rarity === 'legendary' && styles.legendaryIcon,
          badge.earned && badge.rarity === 'epic' && styles.epicIcon,
        ]}>
          {badge.icon_url ? (
            <Image 
              source={{ uri: badge.icon_url }} 
              style={styles.badgeImage}
              defaultSource={require('@/assets/images/icon.png')}
            />
          ) : (
            <IconComponent 
              size={32} 
              color="#FFFFFF" 
              strokeWidth={2.5}
            />
          )}
          {badge.rarity === 'legendary' && badge.earned && (
            <View style={styles.crownIndicator}>
              <Crown size={16} color="#F59E0B" strokeWidth={3} />
            </View>
          )}
        </View>

        <View style={styles.badgeContent}>
          <View style={styles.badgeHeader}>
            <Text style={[
              styles.badgeName,
              !badge.earned && styles.unearnedText
            ]}>
              {badge.name}
            </Text>
            <View style={[
              styles.rarityBadge,
              { backgroundColor: getRarityColor(badge.rarity || 'common') }
            ]}>
              <Text style={styles.rarityText}>
                {t(`badges.rarity.${badge.rarity || 'common'}`, (badge.rarity || 'common').toUpperCase())}
              </Text>
            </View>
          </View>

          <Text style={[
            styles.badgeDescription,
            !badge.earned && styles.unearnedDescription
          ]}>
            {badge.description}
          </Text>

          {badge.progress !== undefined && badge.maxProgress && !badge.earned && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { 
                      width: `${progressPercentage}%`,
                      backgroundColor: badge.color
                    }
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {badge.progress}/{badge.maxProgress}
              </Text>
            </View>
          )}

          {badge.earned && (
            <View style={styles.earnedIndicator}>
              <Award size={16} color="#10B981" strokeWidth={2.5} />
              <Text style={styles.earnedText}>{t('badges.earnedOn', 'Earned')}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
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
                <Text style={styles.headerTitle}>Badges</Text>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

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
              <Text style={styles.headerTitle}>{t('badges.title')}</Text>
            </View>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{earnedCount}</Text>
              <Text style={styles.statLabel}>{t('badges.earnedBadges')}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{badges.length - earnedCount}</Text>
              <Text style={styles.statLabel}>{t('badges.availableBadges')}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{Math.round((earnedCount / badges.length) * 100)}%</Text>
              <Text style={styles.statLabel}>{t('common.complete', 'Complete')}</Text>
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
        {filteredBadges.map(renderBadge)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 16,
    marginTop: 16,
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
  languageSwitcherContainer: {
    marginLeft: 'auto',
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
  badgeCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    opacity: 0.6,
  },
  earnedBadgeCard: {
    opacity: 1,
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  legendaryGlow: {
    shadowColor: '#F59E0B',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  epicGlow: {
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  badgeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badgeImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  legendaryIcon: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  epicIcon: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  crownIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 2,
  },
  badgeContent: {
    flex: 1,
  },
  badgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  unearnedText: {
    color: '#9CA3AF',
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  badgeDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  unearnedDescription: {
    color: '#9CA3AF',
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
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
  earnedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  earnedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
});
