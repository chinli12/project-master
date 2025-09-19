import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  Alert, 
  ScrollView,
  Dimensions,
  ActivityIndicator,
  TextInput
} from 'react-native';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Users, 
  Globe, 
  Lock, 
  Bell,
  Settings,
  TrendingUp,
  MapPin,
  Clock,
  Filter
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

interface Group {
  id: string;
  name: string;
  description: string;
  created_by: string;
  image_url: string;
  location?: any;
  member_count?: number;
  privacy?: 'public' | 'private';
  category?: string;
  last_activity?: string;
}

const mockGroups: Group[] = [
  {
    id: '1',
    name: 'Local Heritage Explorers',
    description: 'Discovering hidden gems in our city',
    created_by: 'user1',
    image_url: 'https://images.pexels.photos/3280130/pexels-photo-3280130.jpeg',
    member_count: 1247,
    privacy: 'public',
    category: 'Travel & Places',
    last_activity: '2 hours ago'
  },
  {
    id: '2',
    name: 'Photography Enthusiasts',
    description: 'Share your best shots of historic places',
    created_by: 'user2',
    image_url: 'https://images.pexels.photos/1264210/pexels-photo-1264210.jpeg',
    member_count: 856,
    privacy: 'public',
    category: 'Arts & Photography',
    last_activity: '4 hours ago'
  },
  {
    id: '3',
    name: 'Weekend Warriors',
    description: 'Private group for serious explorers',
    created_by: 'user3',
    image_url: 'https://images.pexels.photos/1659438/pexels-photo-1659438.jpeg',
    member_count: 234,
    privacy: 'private',
    category: 'Adventure',
    last_activity: '1 day ago'
  }
];

export default function GroupsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [activeTab, setActiveTab] = useState<'your' | 'discover'>('your');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'popular' | 'recent' | 'nearby'>('all');

  useEffect(() => {
    const fetchGroups = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('groups').select('*');
        if (data) {
          const groupsWithDetails = await Promise.all(
            data.map(async (group) => {
              const { data: memberCount, error: memberError } = await supabase.rpc('get_group_member_count', { group_id_param: group.id });
              const { data: lastActivity, error: activityError } = await supabase.rpc('get_group_last_activity', { group_id_param: group.id });

              return {
                ...group,
                member_count: memberError ? 0 : memberCount,
                last_activity: activityError ? 'No recent activity' : new Date(lastActivity).toLocaleDateString(),
              };
            })
          );
          setGroups(groupsWithDetails);
          setFilteredGroups(groupsWithDetails);
        } else {
          // Use mock data if no groups from database
          setGroups(mockGroups);
          setFilteredGroups(mockGroups);
        }
      } catch (error) {
        setGroups(mockGroups);
        setFilteredGroups(mockGroups);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  useEffect(() => {
    console.log('Filter effect triggered:', { activeFilter, activeTab, groupsCount: groups.length, searchQuery });
    let baseGroups = groups;
    
    // Filter by tab first
    if (activeTab === 'your' && user) {
      // Show only groups created by the current user
      baseGroups = groups.filter(group => group.created_by === user.id);
      console.log('Filtered by user groups:', baseGroups.length);
    } else if (activeTab === 'discover') {
      // Show all groups for discovery
      baseGroups = groups;
      console.log('Showing all groups for discovery:', baseGroups.length);
    }
    
    // Apply filter sorting
    if (activeFilter === 'popular') {
      console.log('Applying popular filter');
      baseGroups = [...baseGroups].sort((a, b) => (b.member_count || 0) - (a.member_count || 0));
    } else if (activeFilter === 'recent') {
      console.log('Applying recent filter');
      baseGroups = [...baseGroups].sort((a, b) => {
        const dateA = a.last_activity ? new Date(a.last_activity).getTime() : 0;
        const dateB = b.last_activity ? new Date(b.last_activity).getTime() : 0;
        return dateB - dateA;
      });
    } else if (activeFilter === 'nearby') {
      console.log('Applying nearby filter');
      // For now, just show all groups (location filtering would require user location)
      baseGroups = [...baseGroups];
    } else {
      console.log('No filter applied (all)');
    }
    
    // Then apply search filter
    if (searchQuery.trim() === '') {
      setFilteredGroups(baseGroups);
      console.log('Final filtered groups (no search):', baseGroups.length);
    } else {
      const filtered = baseGroups.filter(group => 
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredGroups(filtered);
      console.log('Final filtered groups (with search):', filtered.length);
    }
  }, [searchQuery, groups, activeTab, user, activeFilter]);

  const renderGroupCard = ({ item }: { item: Group }) => (
    <TouchableOpacity 
      style={styles.groupCard} 
      onPress={() => router.push({ 
        pathname: '/group-details', 
        params: { group: JSON.stringify(item) } 
      })}
    >
      <Image
        source={{ uri: item.image_url || `https://picsum.photos/seed/${item.id}/300/200` }}
        style={styles.groupImage}
      />
      <View style={styles.groupInfo}>
        <View style={styles.groupHeader}>
          <Text style={styles.groupName} numberOfLines={2}>{item.name}</Text>
          <TouchableOpacity style={styles.moreButton}>
            <MoreHorizontal size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.groupMeta}>
          <View style={styles.metaRow}>
            {item.privacy === 'private' ? (
              <Lock size={12} color="#9CA3AF" />
            ) : (
              <Globe size={12} color="#9CA3AF" />
            )}
            <Text style={styles.privacyText}>
              {item.privacy === 'private' ? 'Private group' : 'Public group'}
            </Text>
          </View>
          
          <View style={styles.metaRow}>
            <Users size={12} color="#9CA3AF" />
            <Text style={styles.memberCount}>
              {item.member_count?.toLocaleString() || '0'} members
            </Text>
          </View>
        </View>

        <Text style={styles.lastActivity}>
          Last activity: {item.last_activity || 'No recent activity'}
        </Text>

        <View style={styles.groupActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Bell size={16} color="#A78BFA" />
            <Text style={styles.actionText}>Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Settings size={16} color="#A78BFA" />
            <Text style={styles.actionText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSearchAndFilters = () => (
    <View style={styles.modernSearchContainer}>
      <View style={styles.modernSearchBar}>
        <Search size={18} color="#9CA3AF" />
        <TextInput
          style={styles.modernSearchInput}
          placeholder="Find groups, communities, interests..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.modernClearButton}>
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.modernQuickFilters}
        contentContainerStyle={styles.modernQuickFiltersContent}
      >
        <TouchableOpacity 
          style={[styles.modernFilterChip, activeFilter === 'popular' && { backgroundColor: '#8B5CF6' }]}
          onPress={() => {
            console.log('Popular filter clicked, current filter:', activeFilter);
            setActiveFilter(activeFilter === 'popular' ? 'all' : 'popular');
          }}
        >
          <TrendingUp size={16} color={activeFilter === 'popular' ? '#FFFFFF' : '#8B5CF6'} />
          <Text style={[styles.modernFilterText, activeFilter === 'popular' && { color: '#FFFFFF' }]}>Popular</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.modernFilterChip, activeFilter === 'recent' && { backgroundColor: '#8B5CF6' }]}
          onPress={() => {
            console.log('Recent filter clicked, current filter:', activeFilter);
            setActiveFilter(activeFilter === 'recent' ? 'all' : 'recent');
          }}
        >
          <Clock size={16} color={activeFilter === 'recent' ? '#FFFFFF' : '#8B5CF6'} />
          <Text style={[styles.modernFilterText, activeFilter === 'recent' && { color: '#FFFFFF' }]}>Recent</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.modernFilterChip, activeFilter === 'nearby' && { backgroundColor: '#8B5CF6' }]}
          onPress={() => {
            console.log('Nearby filter clicked, current filter:', activeFilter);
            setActiveFilter(activeFilter === 'nearby' ? 'all' : 'nearby');
          }}
        >
          <MapPin size={16} color={activeFilter === 'nearby' ? '#FFFFFF' : '#8B5CF6'} />
          <Text style={[styles.modernFilterText, activeFilter === 'nearby' && { color: '#FFFFFF' }]}>Nearby</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.modernFilterChip, activeFilter === 'all' && { backgroundColor: '#8B5CF6' }]}
          onPress={() => {
            console.log('All Categories filter clicked, current filter:', activeFilter);
            setActiveFilter('all');
          }}
        >
          <Filter size={16} color={activeFilter === 'all' ? '#FFFFFF' : '#8B5CF6'} />
          <Text style={[styles.modernFilterText, activeFilter === 'all' && { color: '#FFFFFF' }]}>All Categories</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderTrendingGroups = () => {
    // Sort groups by member count to determine trending
    const trendingGroups = [...filteredGroups]
      .sort((a, b) => (b.member_count || 0) - (a.member_count || 0))
      .slice(0, 3);

    if (trendingGroups.length === 0) {
      return null;
    }

    return (
      <View style={styles.trendingSection}>
        <View style={styles.trendingHeader}>
          <TrendingUp size={20} color="#8B5CF6" />
          <Text style={styles.trendingTitle}>Trending Groups</Text>
          <View style={styles.trendingBadge}>
            <Text style={styles.trendingBadgeText}>🔥 Hot</Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.trendingScroll}>
          {trendingGroups.map((group, index) => (
            <TouchableOpacity 
              key={`trending-${group.id}`} 
              style={styles.trendingCard}
              onPress={() => router.push({ 
                pathname: '/group-details', 
                params: { group: JSON.stringify(group) } 
              })}
            >
              <Image
                source={{ uri: group.image_url || `https://picsum.photos/seed/${group.id}/300/200` }}
                style={styles.trendingImage}
              />
              <View style={styles.trendingOverlay}>
                <Text style={styles.trendingGroupName} numberOfLines={2}>{group.name}</Text>
                <View style={styles.trendingStats}>
                  <Users size={12} color="#FFFFFF" />
                  <Text style={styles.trendingStatText}>{group.member_count?.toLocaleString()}</Text>
                </View>
              </View>
              {index === 0 && (
                <View style={styles.trendingRank}>
                  <Text style={styles.trendingRankText}>#1</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderTabButtons = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity 
        style={[styles.tabButton, activeTab === 'your' && styles.activeTab]}
        onPress={() => setActiveTab('your')}
      >
        <Text style={[styles.tabText, activeTab === 'your' && styles.activeTabText]}>
          Your groups
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.tabButton, activeTab === 'discover' && styles.activeTab]}
        onPress={() => setActiveTab('discover')}
      >
        <Text style={[styles.tabText, activeTab === 'discover' && styles.activeTabText]}>
          Discover
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderTabButtons()}
      
      <FlatList
        data={loading ? [] : filteredGroups}
        renderItem={renderGroupCard}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={
          <View>
            {renderSearchAndFilters()}
            {!loading && activeTab === 'discover' && renderTrendingGroups()}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {activeTab === 'your' ? 'Your Groups' : 'All Groups'}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {loading ? 'Loading...' : `${filteredGroups.length} groups`}
              </Text>
            </View>
            {loading && (
              <View style={styles.contentLoadingContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={styles.loadingText}>Finding amazing groups...</Text>
              </View>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#3B82F6',
  },
  listContainer: {
    paddingBottom: 20,
    marginTop: 20,
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  groupImage: {
    width: '100%',
    height: 140,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  groupInfo: {
    padding: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  moreButton: {
    padding: 4,
  },
  groupMeta: {
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  privacyText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 6,
  },
  memberCount: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 6,
  },
  lastActivity: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  groupActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  actionText: {
    fontSize: 14,
    color: '#3B82F6',
    marginLeft: 6,
    fontWeight: '600',
  },
  floatingActionButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  // Search and Discovery styles
  searchContainer: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.08)',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
    letterSpacing: 0.2,
  },
  clearButton: {
    fontSize: 18,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  quickFilters: {
    flexDirection: 'row',
    gap: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  filterText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#8B5CF6',
    letterSpacing: 0.2,
  },
  // Modern Search and Discovery styles
  modernSearchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: 'transparent',
    minHeight: 100,
  },
  modernSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.08)',
    gap: 10,
  },
  modernSearchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#1F2937',
    letterSpacing: 0.1,
  },
  modernClearButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
  },
  clearButtonText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  modernQuickFilters: {
    paddingVertical: 4,
  },
  modernQuickFiltersContent: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingRight: 32,
  },
  modernFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  modernFilterText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#8B5CF6',
    letterSpacing: 0.1,
  },
  activeFilterChip: {
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  activeFilterText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
  },
  // Trending groups styles
  trendingSection: {
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  trendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  trendingTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#1F2937',
    letterSpacing: 0.3,
  },
  trendingBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  trendingBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
    letterSpacing: 0.2,
  },
  trendingScroll: {
    paddingLeft: 0,
  },
  trendingCard: {
    width: 180,
    height: 240,
    borderRadius: 20,
    marginRight: 16,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    position: 'relative',
  },
  trendingImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  trendingOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 16,
    flexDirection: 'column',
    gap: 8,
  },
  trendingGroupName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  trendingStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendingStatText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  trendingRank: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  trendingRankText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
  },
  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    color: '#1F2937',
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  // Content loading styles
  contentLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
});
