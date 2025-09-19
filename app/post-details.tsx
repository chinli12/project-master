import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  Share,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PanGestureHandler, PanGestureHandlerGestureEvent, PinchGestureHandler, PinchGestureHandlerGestureEvent, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withTiming,
} from 'react-native-reanimated';
import { Heart, MessageCircle, Share as ShareIcon, ChevronLeft, X, MapPin, MoreHorizontal, Flag, UserX, AlertTriangle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { supabase } from '@/lib/supabase';
import { Video } from 'expo-av';
import { useAuth } from '@/contexts/AuthContext';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    id?: string;
    username: string;
    avatar_url: string;
  };
  parent_comment_id?: string;
  likes_count: number;
  is_liked_by_user: boolean;
}

type AnimatedGHContext = {
  startScale: number;
  startX: number;
  startY: number;
};

export default function PostDetailsScreen() {
  const { post: postString } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  if (!postString) {
    return (
      <View style={styles.container}>
        <Text style={{ color: 'white', textAlign: 'center' }}>Post not found.</Text>
      </View>
    );
  }

  const post = JSON.parse(postString as string);

  if (!post.profiles) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#A78BFA" />
      </View>
    );
  }
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [shares, setShares] = useState(0);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [showPostOptionsModal, setShowPostOptionsModal] = useState(false);

  const scale = useSharedValue(1);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const pinchHandler = useAnimatedGestureHandler<PinchGestureHandlerGestureEvent, AnimatedGHContext>({
    onStart: (event, ctx) => {
      ctx.startScale = scale.value;
      ctx.startX = translateX.value;
      ctx.startY = translateY.value;
    },
    onActive: (event, ctx) => {
      scale.value = ctx.startScale * event.scale;
      focalX.value = event.focalX;
      focalY.value = event.focalY;
    },
  });

  const panHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent, AnimatedGHContext>({
    onStart: (_, ctx) => {
      ctx.startX = translateX.value;
      ctx.startY = translateY.value;
    },
    onActive: (event, ctx) => {
      translateX.value = ctx.startX + event.translationX;
      translateY.value = ctx.startY + event.translationY;
    },
  });

  const onModalClose = () => {
    setIsImageModalVisible(false);
    scale.value = withTiming(1);
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    focalX.value = withTiming(0);
    focalY.value = withTiming(0);
  }

  const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { translateX: focalX.value },
        { translateY: focalY.value },
        { translateX: -windowWidth / 2 },
        { translateY: -windowHeight / 2 },
        { scale: scale.value },
        { translateX: -focalX.value },
        { translateY: -focalY.value },
        { translateX: windowWidth / 2 },
        { translateY: windowHeight / 2 },
      ],
    };
  });

  useEffect(() => {
    const fetchPostDetails = async () => {
      // Fetch likes
      const { data: likesData, error: likesError } = await supabase
        .from('likes')
        .select('*', { count: 'exact' })
        .eq('post_id', post.id);
      if (likesData) {
        setLikes(likesData.length);
      }

      // Check if user has liked
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: userLike, error: userLikeError } = await supabase
          .from('likes')
          .select('*')
          .eq('post_id', post.id)
          .eq('user_id', user.id)
          .single();
        if (userLike) {
          setIsLiked(true);
        }
      }

      // Fetch comments
      fetchComments();
    };

    fetchPostDetails();
  }, [post.id]);

  const fetchComments = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: commentsData, error: commentsError } = await supabase
      .from('comments')
      .select('*, profiles(id, username, avatar_url)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });

    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      return;
    }

    if (commentsData) {
      const commentsWithLikes = await Promise.all(
        commentsData.map(async (comment: any) => {
          // Fetch comment likes count
          const { count: likesCount, error: likesCountError } = await supabase
            .from('comment_likes')
            .select('*', { count: 'exact', head: true })
            .eq('comment_id', comment.id);

          if (likesCountError) {
            console.error('Error fetching comment likes count:', likesCountError);
          }

          // Check if current user has liked this comment
          let isLikedByUser = false;
          if (user) {
            const { data: userLike, error: userLikeError } = await supabase
              .from('comment_likes')
              .select('id')
              .eq('comment_id', comment.id)
              .eq('user_id', user.id)
              .single();
            
            if (userLikeError && userLikeError.code !== 'PGRST116') {
              console.error('Error checking user like:', userLikeError);
            }
            
            if (userLike) {
              isLikedByUser = true;
            }
          }

          return {
            ...comment,
            likes_count: likesCount || 0,
            is_liked_by_user: isLikedByUser,
          };
        })
      );
      setComments(commentsWithLikes as Comment[]);
    }
  };

  const handleLike = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to like a post.');
      return;
    }

    if (isLiked) {
      // Unlike
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', user.id);
      if (!error) {
        setIsLiked(false);
        setLikes(likes - 1);
      }
    } else {
      // Like
      const { error } = await supabase
        .from('likes')
        .insert({ post_id: post.id, user_id: user.id });
      if (!error) {
        setIsLiked(true);
        setLikes(likes + 1);
      }
    }
  };

  const handleAddComment = async () => {
    if (comment.trim()) {
      if (!user) {
        Alert.alert('Error', 'You must be logged in to comment.');
        return;
      }

      const { data: newCommentData, error: insertError } = await supabase
        .from('comments')
        .insert({ 
          post_id: post.id, 
          user_id: user.id, 
          content: comment,
          parent_comment_id: replyingTo?.id || null,
        })
        .select('*, profiles(username, avatar_url)')
        .single();

      if (insertError) {
        console.error('Error adding comment:', insertError);
        Alert.alert('Error', 'Failed to add comment.');
        return;
      }

      if (newCommentData) {
        fetchComments();
        setComment('');
        setReplyingTo(null);
      }
    }
  };

  const handleLikeComment = async (commentId: string, isLiked: boolean) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to like a comment.');
      return;
    }

    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
        
        if (error) {
          console.error('Error unliking comment:', error);
          // If the table doesn't exist, show a helpful message
          if (error.code === '42P01') {
            Alert.alert('Database Setup Required', 'The comment likes table needs to be created. Please run the comment_likes_migration.sql file.');
            return;
          }
          throw error;
        }
        
        // Update local state optimistically
        setComments(prevComments => 
          prevComments.map(c => 
            c.id === commentId ? { ...c, likes_count: Math.max(0, c.likes_count - 1), is_liked_by_user: false } : c
          )
        );
      } else {
        // Like
        const { error } = await supabase
          .from('comment_likes')
          .insert({ comment_id: commentId, user_id: user.id });
        
        if (error) {
          console.error('Error liking comment:', error);
          // If the table doesn't exist, show a helpful message
          if (error.code === '42P01') {
            Alert.alert('Database Setup Required', 'The comment likes table needs to be created. Please run the comment_likes_migration.sql file.');
            return;
          }
          throw error;
        }
        
        // Update local state optimistically
        setComments(prevComments => 
          prevComments.map(c => 
            c.id === commentId ? { ...c, likes_count: c.likes_count + 1, is_liked_by_user: true } : c
          )
        );
      }
    } catch (error: any) {
      console.error('Error liking/unliking comment:', error);
      Alert.alert('Error', `Failed to ${isLiked ? 'unlike' : 'like'} comment: ${error.message}`);
    }
  };

  const handleReply = (comment: Comment) => {
    setReplyingTo(comment);
  };

  const handleShare = async () => {
    try {
      const shareMessage = `Check out this post by ${post.profiles.username}: ${post.content}`;
      const result = await Share.share({
        message: shareMessage,
        title: `Post by ${post.profiles.username}`,
        url: post.media_url || undefined,
      });

      // If the share was successful, increment the share count
      if (result.action === Share.sharedAction) {
        setShares(prev => prev + 1);
        
        // You could also track shares in the database here
        // const { data: { user } } = await supabase.auth.getUser();
        // if (user) {
        //   await supabase.from('post_shares').insert({
        //     post_id: post.id,
        //     user_id: user.id
        //   });
        // }
      }
    } catch (error) {
      console.error('Error sharing post:', error);
      Alert.alert('Error', 'Failed to share post');
    }
  };

  const handleReportPost = () => {
    setShowPostOptionsModal(false);
    Alert.alert(
      'Report Post',
      'Why are you reporting this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Spam',
          onPress: () => submitReport('spam')
        },
        {
          text: 'Inappropriate Content',
          onPress: () => submitReport('inappropriate')
        },
        {
          text: 'Harassment',
          onPress: () => submitReport('harassment')
        },
        {
          text: 'False Information',
          onPress: () => submitReport('false_information')
        }
      ]
    );
  };

  const handleBlockUser = () => {
    setShowPostOptionsModal(false);
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${post.profiles.username}? You won't see their posts or be able to interact with them.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => blockUser()
        }
      ]
    );
  };

  const submitReport = async (reason: string) => {
    try {
      if (!user) {
        Alert.alert('Error', 'You must be logged in to report content.');
        return;
      }

      // In a real app, you would create a reports table
      // For now, we'll simulate the report submission
      const { error } = await supabase
        .from('reports')
        .insert({
          post_id: post.id,
          reported_user_id: post.user_id,
          reporter_id: user.id,
          reason: reason,
          content_type: 'post'
        });

      if (error && error.code !== '42P01') { // Ignore table doesn't exist error
        console.error('Report submission error:', error);
      }

      Alert.alert(
        'Report Submitted',
        'Thank you for your report. We will review this content and take appropriate action if necessary.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Success', 'Thank you for your report. We will review this content shortly.');
    }
  };

  const blockUser = async () => {
    try {
      if (!user) {
        Alert.alert('Error', 'You must be logged in to block users.');
        return;
      }

      // In a real app, you would create a blocked_users table
      // For now, we'll simulate the block action
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: user.id,
          blocked_id: post.user_id
        });

      if (error && error.code !== '42P01') { // Ignore table doesn't exist error
        console.error('Block user error:', error);
      }

      Alert.alert(
        'User Blocked',
        `${post.profiles.username} has been blocked. You won't see their content anymore.`,
        [
          {
            text: 'OK',
            onPress: () => router.back() // Go back since user is blocked
          }
        ]
      );
    } catch (error) {
      console.error('Error blocking user:', error);
      Alert.alert('Success', `${post.profiles.username} has been blocked.`);
      router.back();
    }
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={[styles.commentContainer, item.parent_comment_id && styles.replyCommentContainer]}>
      <TouchableOpacity 
        onPress={() => router.push({
          pathname: '/user-profile',
          params: { 
            userId: item.profiles.id || item.user_id,
            user: JSON.stringify({
              id: item.profiles.id || item.user_id,
              full_name: item.profiles.username,
              avatar_url: item.profiles.avatar_url,
              username: item.profiles.username
            })
          }
        })}
      >
        <Image source={{ uri: item.profiles.avatar_url }} style={styles.commentAvatar} />
      </TouchableOpacity>
      <View style={styles.commentBubble}>
        <TouchableOpacity 
          onPress={() => router.push({
            pathname: '/user-profile',
            params: { 
              userId: item.profiles.id || item.user_id,
              user: JSON.stringify({
                id: item.profiles.id || item.user_id,
                full_name: item.profiles.username,
                avatar_url: item.profiles.avatar_url,
                username: item.profiles.username
              })
            }
          })}
        >
          <Text style={styles.commentAuthor}>{item.profiles.username}</Text>
        </TouchableOpacity>
        <Text style={styles.commentText}>{item.content}</Text>
        <View style={styles.commentActions}>
          <TouchableOpacity onPress={() => handleLikeComment(item.id, item.is_liked_by_user)}>
            <Text style={[styles.commentActionText, item.is_liked_by_user && styles.likedText]}>
              Like ({item.likes_count})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleReply(item)}>
            <Text style={styles.commentActionText}>Reply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.facebookPostCard}>
      {/* Post Header */}
      <View style={styles.facebookPostHeader}>
        <TouchableOpacity 
          style={styles.facebookAuthorSection}
          onPress={() => router.push({
            pathname: '/user-profile',
            params: { 
              userId: post.user_id,
              user: JSON.stringify({
                id: post.user_id,
                full_name: post.profiles.username,
                avatar_url: post.profiles.avatar_url,
                bio: post.profiles.bio,
                username: post.profiles.username
              })
            }
          })}
        >
          <Image source={{ uri: post.profiles.avatar_url }} style={styles.facebookAvatar} />
          <View style={styles.facebookAuthorInfo}>
            <Text style={styles.facebookAuthorName}>{post.profiles.username}</Text>
            <View style={styles.facebookMetaRow}>
              <Text style={styles.facebookTimestamp}>
                {new Date(post.created_at).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric'
                })} at {new Date(post.created_at).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Text>
              <Text style={styles.facebookDot}>•</Text>
              <View style={styles.facebookPublicIcon}>
                <Text style={styles.facebookPublicText}>🌍</Text>
              </View>
            </View>
            {post.location && (
              <TouchableOpacity style={styles.facebookLocationContainer}>
                <MapPin size={12} color="#65676B" />
                <Text style={styles.facebookLocationText}>{post.location}</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.facebookMoreButton}
          onPress={() => setShowPostOptionsModal(true)}
        >
          <MoreHorizontal size={20} color="#65676B" />
        </TouchableOpacity>
      </View>

      {/* Post Content */}
      <Text style={styles.facebookPostText}>{post.content}</Text>

      {/* Post Media */}
      {post.media_url && post.media_type === 'image' && (
        <TouchableOpacity onPress={() => setIsImageModalVisible(true)} style={styles.facebookMediaContainer}>
          <Image source={{ uri: post.media_url }} style={styles.facebookPostImage} />
        </TouchableOpacity>
      )}

      {post.media_url && post.media_type === 'video' && (
        <View style={styles.facebookMediaContainer}>
          <Video
            source={{ uri: post.media_url }}
            rate={1.0}
            volume={1.0}
            isMuted={false}
            shouldPlay
            isLooping
            style={styles.facebookPostImage}
          />
        </View>
      )}

      {/* Reactions Bar */}
      <View style={styles.facebookReactionBar}>
        <TouchableOpacity style={styles.facebookReactionSection}>
          <View style={styles.facebookEmojiContainer}>
            <Text style={styles.facebookEmoji}>👍</Text>
            <Text style={styles.facebookEmoji}>❤️</Text>
            <Text style={styles.facebookEmoji}>😊</Text>
          </View>
          <Text style={styles.facebookReactionText}>
            {likes > 0 ? likes : ''}
          </Text>
        </TouchableOpacity>
        <View style={styles.facebookEngagementStats}>
          <Text style={styles.facebookEngagementText}>
            {comments.length} comments
          </Text>
          {shares > 0 && (
            <Text style={styles.facebookEngagementText}>
              {shares} shares
            </Text>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.facebookActionBar}>
        <TouchableOpacity style={styles.facebookActionButton} onPress={handleLike}>
          <Heart
            size={20}
            color={isLiked ? '#E31E24' : '#65676B'}
            fill={isLiked ? '#E31E24' : 'transparent'}
            strokeWidth={2}
          />
          <Text style={[styles.facebookActionText, isLiked && styles.facebookLikedText]}>Like</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.facebookActionButton}>
          <MessageCircle size={20} color="#65676B" strokeWidth={2} />
          <Text style={styles.facebookActionText}>Comment</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.facebookActionButton} onPress={handleShare}>
          <ShareIcon size={20} color="#65676B" strokeWidth={2} />
          <Text style={styles.facebookActionText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#8B5CF6', '#7C3AED', '#6366F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={28} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.title}>{post.profiles.username}'s Post</Text>
        </View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <FlatList
            data={comments}
            renderItem={renderComment}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={renderHeader}
            style={styles.commentsList}
          />
          <View style={styles.commentInputContainer}>
            {replyingTo && (
              <View style={styles.replyingToContainer}>
                <Text style={styles.replyingToText}>Replying to: {replyingTo.profiles.username}</Text>
                <TouchableOpacity onPress={() => setReplyingTo(null)}>
                  <X size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
              <TextInput
                style={styles.commentInput}
                placeholder={replyingTo ? `Replying to ${replyingTo.profiles.username}...` : "Write a comment..."}
                placeholderTextColor="#9CA3AF"
                value={comment}
                onChangeText={setComment}
              />
              <TouchableOpacity onPress={handleAddComment} style={styles.sendButton}>
                <Text style={styles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Post Options Modal */}
      <Modal
        visible={showPostOptionsModal}
        transparent={true}
        animationType="slide"
        presentationStyle="overFullScreen"
        onRequestClose={() => setShowPostOptionsModal(false)}
      >
        <View style={styles.optionsModalOverlay}>
          <TouchableOpacity 
            style={styles.optionsModalBackdrop}
            onPress={() => setShowPostOptionsModal(false)}
            activeOpacity={1}
          />
          
          <View style={styles.optionsModalSheet}>
            {/* Handle Bar */}
            <View style={styles.modalHandle} />
            
            {/* Post Preview */}
            <View style={styles.postPreview}>
              <Image source={{ uri: post.profiles.avatar_url }} style={styles.previewAvatar} />
              <View style={styles.previewContent}>
                <Text style={styles.previewAuthor}>{post.profiles.username}</Text>
                <Text style={styles.previewText} numberOfLines={2}>
                  {post.content}
                </Text>
              </View>
            </View>
            
            {/* Options List */}
            <View style={styles.optionsList}>
              <TouchableOpacity 
                style={styles.optionItem}
                onPress={handleReportPost}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: '#FEF2F2' }]}>
                  <Flag size={22} color="#EF4444" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Report Post</Text>
                  <Text style={styles.optionSubtitle}>Report inappropriate content</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.optionItem}
                onPress={handleBlockUser}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: '#FEF2F2' }]}>
                  <UserX size={22} color="#EF4444" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Block {post.profiles.username}</Text>
                  <Text style={styles.optionSubtitle}>You won't see their posts anymore</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.optionItem}
                onPress={() => setShowPostOptionsModal(false)}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: '#F3F4F6' }]}>
                  <X size={22} color="#6B7280" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={[styles.optionTitle, { color: '#6B7280' }]}>Cancel</Text>
                  <Text style={styles.optionSubtitle}>Close this menu</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isImageModalVisible}
        transparent={true}
        onRequestClose={onModalClose}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={onModalClose}
            >
              <X size={32} color="#FFFFFF" />
            </TouchableOpacity>
            <PanGestureHandler onGestureEvent={panHandler}>
              <Animated.View style={styles.fullscreenImageContainer}>
                <PinchGestureHandler onGestureEvent={pinchHandler}>
                  <Animated.View style={styles.fullscreenImageContainer}>
                    <Animated.Image
                      source={{ uri: post.media_url }}
                      style={[styles.fullscreenImage, animatedStyle]}
                      resizeMode="contain"
                    />
                  </Animated.View>
                </PinchGestureHandler>
              </Animated.View>
            </PanGestureHandler>
          </View>
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    backgroundGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 200,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: 'transparent',
    },
    backButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 20,
        padding: 12,
    },
    title: {
        fontSize: 22,
        fontFamily: 'Poppins-Bold',
        color: '#FFFFFF',
        marginLeft: 16,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
        letterSpacing: 0.3,
    },
    postCard: {
        backgroundColor: '#FFFFFF',
        margin: 24,
        padding: 24,
        borderRadius: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 28,
        elevation: 12,
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.08)',
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 16,
        borderWidth: 2,
        borderColor: 'rgba(139, 92, 246, 0.2)',
    },
    authorInfo: {
        flex: 1,
    },
    authorName: {
        fontSize: 17,
        fontFamily: 'Poppins-SemiBold',
        color: '#1F2937',
        letterSpacing: 0.3,
    },
    timestamp: {
        fontSize: 14,
        fontFamily: 'Inter-Medium',
        color: '#8B5CF6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        overflow: 'hidden',
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    postText: {
        fontSize: 17,
        fontFamily: 'Inter-Regular',
        color: '#374151',
        lineHeight: 26,
        marginBottom: 20,
        letterSpacing: 0.2,
    },
    postImage: {
        width: '100%',
        height: 320,
        borderRadius: 20,
        marginBottom: 20,
    },
    engagementStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(139, 92, 246, 0.1)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(139, 92, 246, 0.1)',
    },
    engagementActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 16,
    },
    engagementButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        backgroundColor: 'rgba(139, 92, 246, 0.05)',
    },
    engagementButtonText: {
        fontSize: 16,
        fontFamily: 'Poppins-SemiBold',
        color: '#1F2937',
        letterSpacing: 0.3,
    },
    engagementText: {
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
        color: '#6B7280',
        letterSpacing: 0.2,
    },
    likedText: {
        color: '#EF4444',
    },
    commentsList: {
        paddingHorizontal: 24,
    },
    commentContainer: {
        flexDirection: 'row',
        marginVertical: 12,
    },
    commentAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 12,
        borderWidth: 2,
        borderColor: 'rgba(139, 92, 246, 0.2)',
    },
    commentBubble: {
        padding: 16,
        borderRadius: 20,
        flex: 1,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.08)',
    },
    commentAuthor: {
        fontSize: 15,
        fontFamily: 'Poppins-SemiBold',
        color: '#1F2937',
        letterSpacing: 0.2,
    },
    commentText: {
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        color: '#374151',
        lineHeight: 22,
        marginTop: 4,
        letterSpacing: 0.1,
    },
    commentActions: {
      flexDirection: 'row',
      marginTop: 12,
      gap: 20,
    },
    commentActionText: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: '#8B5CF6',
      letterSpacing: 0.2,
    },
    replyCommentContainer: {
      marginLeft: 40, // Indent replies
      marginTop: 4,
      marginBottom: 4,
    },
    replyingToContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#E5E7EB',
      padding: 8,
      borderRadius: 8,
      marginBottom: 8,
      width: '100%',
      justifyContent: 'space-between',
    },
    replyingToText: {
      color: '#1F2937',
      fontFamily: 'Inter-Regular',
      fontSize: 14,
    },
    commentInputContainer: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(139, 92, 246, 0.1)',
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 5,
    },
    commentInput: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        color: '#1F2937',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 24,
        marginRight: 16,
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        borderWidth: 2,
        borderColor: '#E5E7EB',
        letterSpacing: 0.2,
    },
    sendButton: {
        backgroundColor: '#8B5CF6',
        paddingVertical: 16,
        paddingHorizontal: 28,
        borderRadius: 24,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    sendButtonText: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 16,
        letterSpacing: 0.3,
    },
    authorSection: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        flex: 1,
    },
    postMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginTop: 2,
    },
    metaSeparator: {
        color: '#9CA3AF',
        marginHorizontal: 4,
        fontSize: 12,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 4,
    },
    locationText: {
        fontSize: 12,
        color: '#A78BFA',
        marginLeft: 2,
        fontWeight: '500',
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E5E7EB',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 6,
        alignSelf: 'flex-start',
    },
    locationDisplayText: {
        fontSize: 13,
        color: '#3B82F6',
        fontWeight: '500',
        marginLeft: 4,
    },
    moreButton: {
        padding: 8,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalCloseButton: {
      position: 'absolute',
      top: 50,
      right: 20,
      zIndex: 1,
    },
    fullscreenImageContainer: {
      flex: 1,
      width: '100%',
      height: '100%',
    },
    fullscreenImage: {
      width: '100%',
      height: '100%',
    },
    optionsModalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    optionsModalBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    optionsModalSheet: {
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 8,
      paddingBottom: 40,
      maxHeight: '80%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 20,
    },
    modalHandle: {
      width: 40,
      height: 4,
      backgroundColor: '#D1D5DB',
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 20,
    },
    postPreview: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingBottom: 20,
      marginBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB',
    },
    previewAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
    },
    previewContent: {
      flex: 1,
    },
    previewAuthor: {
      fontSize: 16,
      fontWeight: '600',
      color: '#1F2937',
      marginBottom: 2,
    },
    previewText: {
      fontSize: 14,
      color: '#6B7280',
      lineHeight: 18,
    },
    optionsList: {
      paddingHorizontal: 20,
    },
    optionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: 16,
      marginBottom: 12,
      backgroundColor: '#F3F4F6',
    },
    optionIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    optionTextContainer: {
      flex: 1,
    },
    optionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#1F2937',
      marginBottom: 2,
    },
    optionSubtitle: {
      fontSize: 14,
      color: '#6B7280',
      lineHeight: 18,
    },
    // Modern Facebook-style meta row styles
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      gap: 8,
    },
    timestampText: {
      fontSize: 13,
      fontFamily: 'Inter-Regular',
      color: '#65676B',
    },
    publicBadge: {
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
    },
    publicText: {
      fontSize: 11,
      fontFamily: 'Inter-Medium',
      color: '#8B5CF6',
    },
    // Modern Facebook-style reaction bar
    reactionBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#E4E6EA',
    },
    reactionEmojis: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    emojiGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F0F2F5',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginRight: 8,
    },
    emoji: {
      fontSize: 16,
      marginHorizontal: -2,
    },
    reactionCount: {
      fontSize: 15,
      fontFamily: 'Inter-Regular',
      color: '#65676B',
    },
    commentCount: {
      fontSize: 15,
      fontFamily: 'Inter-Regular',
      color: '#65676B',
    },
    // Modern Facebook-style action buttons
    actionButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: '#E4E6EA',
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      flex: 1,
      marginHorizontal: 4,
      gap: 8,
    },
    actionButtonText: {
      fontSize: 15,
      fontFamily: 'Inter-SemiBold',
      color: '#65676B',
    },
    likedActionText: {
      color: '#EF4444',
    },
    // Facebook-style post design
    facebookPostCard: {
      backgroundColor: '#FFFFFF',
      margin: 0,
      marginHorizontal: 0,
      marginBottom: 8,
      borderRadius: 0,
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
      borderWidth: 0,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderTopColor: '#E4E6EA',
      borderBottomColor: '#E4E6EA',
    },
    facebookPostHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    facebookAuthorSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    facebookAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
    },
    facebookAuthorInfo: {
      flex: 1,
    },
    facebookAuthorName: {
      fontSize: 15,
      fontFamily: 'Inter-SemiBold',
      color: '#1C1E21',
      fontWeight: '600',
    },
    facebookMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
    },
    facebookTimestamp: {
      fontSize: 13,
      fontFamily: 'Inter-Regular',
      color: '#65676B',
    },
    facebookDot: {
      fontSize: 13,
      color: '#65676B',
      marginHorizontal: 4,
    },
    facebookPublicIcon: {
      marginLeft: 2,
    },
    facebookPublicText: {
      fontSize: 12,
    },
    facebookLocationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    facebookLocationText: {
      fontSize: 13,
      fontFamily: 'Inter-Regular',
      color: '#65676B',
      marginLeft: 4,
    },
    facebookMoreButton: {
      padding: 8,
      borderRadius: 20,
    },
    facebookPostText: {
      fontSize: 15,
      fontFamily: 'Inter-Regular',
      color: '#1C1E21',
      lineHeight: 20,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    facebookMediaContainer: {
      marginBottom: 12,
    },
    facebookPostImage: {
      width: '100%',
      height: 300,
      resizeMode: 'cover',
    },
    facebookReactionBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#E4E6EA',
    },
    facebookReactionSection: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    facebookEmojiContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 6,
    },
    facebookEmoji: {
      fontSize: 16,
      marginLeft: -2,
    },
    facebookReactionText: {
      fontSize: 15,
      fontFamily: 'Inter-Regular',
      color: '#65676B',
    },
    facebookEngagementStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    facebookEngagementText: {
      fontSize: 15,
      fontFamily: 'Inter-Regular',
      color: '#65676B',
    },
    facebookActionBar: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: 4,
      paddingHorizontal: 16,
    },
    facebookActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
      flex: 1,
      gap: 6,
    },
    facebookActionText: {
      fontSize: 15,
      fontFamily: 'Inter-SemiBold',
      color: '#65676B',
      fontWeight: '600',
    },
    facebookLikedText: {
      color: '#E31E24',
    },
});
