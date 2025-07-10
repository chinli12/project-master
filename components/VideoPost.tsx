import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Image, Alert } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Play, Pause, Heart, MessageCircle, Share } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import CommentModal from './CommentModal';

const { width, height } = Dimensions.get('window');

interface VideoPostProps {
  post: {
    id: string;
    content: string;
    media_url?: string;
    profiles: {
      username: string;
      avatar_url: string;
    };
  };
  isPlaying: boolean;
}

export default function VideoPost({ post, isPlaying: isPlayingProp }: VideoPostProps) {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(isPlayingProp);
  const [isCommentModalVisible, setCommentModalVisible] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [comments, setComments] = useState(0);
  const [shares, setShares] = useState(0);

  useEffect(() => {
    setIsPlaying(isPlayingProp);
  }, [isPlayingProp]);

  useEffect(() => {
    const fetchPostDetails = async () => {
      const { data: likesData } = await supabase
        .from('likes')
        .select('*', { count: 'exact' })
        .eq('post_id', post.id);
      if (likesData) setLikes(likesData.length);

      const { data: commentsData } = await supabase
        .from('comments')
        .select('*', { count: 'exact' })
        .eq('post_id', post.id);
      if (commentsData) setComments(commentsData.length);

      const { data: sharesData } = await supabase
        .from('shares')
        .select('*', { count: 'exact' })
        .eq('post_id', post.id);
      if (sharesData) setShares(sharesData.length);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userLike } = await supabase
          .from('likes')
          .select('*')
          .eq('post_id', post.id)
          .eq('user_id', user.id)
          .single();
        if (userLike) setIsLiked(true);
      }
    };

    fetchPostDetails();
  }, [post.id]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pauseAsync();
      } else {
        videoRef.current.playAsync();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleLike = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Error', 'You must be logged in to like a post.');
      return;
    }

    if (isLiked) {
      const { error } = await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id);
      if (!error) {
        setIsLiked(false);
        setLikes(likes - 1);
      }
    } else {
      const { error } = await supabase.from('likes').insert({ post_id: post.id, user_id: user.id });
      if (!error) {
        setIsLiked(true);
        setLikes(likes + 1);
      }
    }
  };

  const handleComment = () => {
    setCommentModalVisible(true);
  };

  const handleShare = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Error', 'You must be logged in to share a post.');
      return;
    }
    const { error } = await supabase.from('shares').insert({ post_id: post.id, user_id: user.id });
    if (!error) {
      setShares(shares + 1);
      Alert.alert('Success', 'Post shared!');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePlayPause}
        style={styles.videoContainer}
      >
        <Video
          ref={videoRef}
          source={{ uri: post.media_url! }}
          style={styles.video}
          shouldPlay={isPlaying}
          isLooping
          resizeMode={ResizeMode.COVER}
          onError={(error: any) => console.error('Video Error:', error)}
        />
      </TouchableOpacity>

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.overlay}
      />

      {!isPlaying && (
        <View style={styles.playIconContainer}>
          <Play size={64} color="rgba(255, 255, 255, 0.7)" />
        </View>
      )}

      <View style={styles.sidebar}>
        <TouchableOpacity style={styles.sidebarButton} onPress={handleLike}>
          <Heart size={32} color={isLiked ? '#F472B6' : '#FFFFFF'} fill={isLiked ? '#F472B6' : 'transparent'} />
          <Text style={styles.sidebarText}>{likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sidebarButton} onPress={handleComment}>
          <MessageCircle size={32} color="#FFFFFF" />
          <Text style={styles.sidebarText}>{comments}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sidebarButton} onPress={handleShare}>
          <Share size={32} color="#FFFFFF" />
          <Text style={styles.sidebarText}>{shares}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.userInfo}>
        <Image source={{ uri: post.profiles.avatar_url }} style={styles.avatar} />
        <View>
          <Text style={styles.username}>@{post.profiles.username}</Text>
          <Text style={styles.content}>{post.content}</Text>
        </View>
      </View>
      <CommentModal
        isVisible={isCommentModalVisible}
        onClose={() => setCommentModalVisible(false)}
        postId={post.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: width,
    height: height,
    backgroundColor: '#000',
  },
  videoContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.4,
  },
  playIconContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sidebar: {
    position: 'absolute',
    bottom: 100,
    right: 10,
    alignItems: 'center',
  },
  sidebarButton: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sidebarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    marginTop: 4,
  },
  userInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 80,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginRight: 12,
  },
  username: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
  },
  content: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
});
