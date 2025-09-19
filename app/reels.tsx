import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Alert, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { supabase } from '../lib/supabase';
import VideoPost from '../components/VideoPost';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';

const { height } = Dimensions.get('window');

interface Post {
  id: string;
  content: string;
  media_url?: string;
  media_type?: 'image' | 'video';
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string;
  };
}

export default function ReelsScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: any[] }) => {
    if (viewableItems.length > 0 && viewableItems[0]?.item?.id) {
      setActivePostId(viewableItems[0].item.id);
    }
  }, []);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
    minimumViewTime: 100,
    waitForInteraction: false,
  }).current;

  useEffect(() => {
    const fetchVideoPosts = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles(username, avatar_url)')
        .eq('media_type', 'video')
        .order('created_at', { ascending: false });

      if (error) {
        Alert.alert('Error', 'Failed to fetch video posts.');
      } else {
        setPosts(data as Post[]);
      }
      setLoading(false);
    };

    fetchVideoPosts();
  }, []);

  // Move useCallback hook before any conditional returns
  const memoizedOnViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: any[] }) => {
    onViewableItemsChanged({ viewableItems });
  }, [onViewableItemsChanged]);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#A78BFA" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.videoContainer}>
            <VideoPost
              post={item}
              isPlaying={activePostId === item.id}
            />
          </View>
        )}
        pagingEnabled={true}
        snapToAlignment="start"
        snapToInterval={height}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        bounces={false}
        scrollEventThrottle={16}
        onViewableItemsChanged={memoizedOnViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScrollToIndexFailed={info => {
          const wait = new Promise(resolve => setTimeout(resolve, 500));
          wait.then(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
          });
        }}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
        removeClippedSubviews={false}
        getItemLayout={(data, index) => ({
          length: height,
          offset: height * index,
          index,
        })}
      />
      <SafeAreaView style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    backgroundColor: '#000',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 50,
    paddingHorizontal: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
