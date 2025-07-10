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
  ActivityIndicator
} from 'react-native';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Users, 
  Globe, 
  Lock, 
  Bell,
  Settings
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

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
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeTab, setActiveTab] = useState<'your' | 'discover'>('your');
  const [loading, setLoading] = useState(false);

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
        } else {
          // Use mock data if no groups from database
          setGroups(mockGroups);
        }
      } catch (error) {
        setGroups(mockGroups);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

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
      
      {loading && activeTab === 'discover' ? (
        <ActivityIndicator style={{ marginTop: 20 }} size="large" color="#A78BFA" />
      ) : (
        <FlatList
          data={groups}
          renderItem={renderGroupCard}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
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
    borderBottomColor: '#A78BFA',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  activeTabText: {
    color: '#A78BFA',
  },
  listContainer: {
    paddingBottom: 20,
    marginTop: 20,
  },
  groupCard: {
    backgroundColor: '#1F2937',
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
    color: '#F9FAFB',
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
    color: '#D1D5DB',
    marginLeft: 6,
  },
  memberCount: {
    fontSize: 13,
    color: '#D1D5DB',
    marginLeft: 6,
  },
  lastActivity: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  groupActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  actionText: {
    fontSize: 14,
    color: '#A78BFA',
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
    backgroundColor: '#4F46E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
});
