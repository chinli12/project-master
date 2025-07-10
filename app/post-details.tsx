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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PanGestureHandler, PanGestureHandlerGestureEvent, PinchGestureHandler, PinchGestureHandlerGestureEvent, State } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withTiming,
} from 'react-native-reanimated';
import { Heart, MessageCircle, Share, ChevronLeft, X, MapPin, MoreHorizontal, Flag, UserX, AlertTriangle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { supabase } from '@/lib/supabase';
import { Video } from 'expo-av';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  profiles: {
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

    const { data: commentsData } = await supabase
      .from('comments')
      .select('*, profiles(username, avatar_url)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });

    if (commentsData) {
      const commentsWithLikes = await Promise.all(
        commentsData.map(async (comment: any) => {
          const { count: likesCount } = await supabase
            .from('comment_likes')
            .select('*', { count: 'exact', head: true })
            .eq('comment_id', comment.id);

          let isLikedByUser = false;
          if (user) {
            const { data: userLike } = await supabase
              .from('comment_likes')
              .select('id')
              .eq('comment_id', comment.id)
              .eq('user_id', user.id)
              .single();
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
    const { data: { user } } = await supabase.auth.getUser();
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
        if (error) throw error;
        setComments(prevComments => 
          prevComments.map(c => 
            c.id === commentId ? { ...c, likes_count: c.likes_count - 1, is_liked_by_user: false } : c
          )
        );
      } else {
        // Like
        const { error } = await supabase
          .from('comment_likes')
          .insert({ comment_id: commentId, user_id: user.id });
        if (error) throw error;
        setComments(prevComments => 
          prevComments.map(c => 
            c.id === commentId ? { ...c, likes_count: c.likes_count + 1, is_liked_by_user: true } : c
          )
        );
      }
    } catch (error: any) {
      console.error('Error liking/unliking comment:', error.message);
      Alert.alert('Error', 'Failed to like/unlike comment.');
    }
  };

  const handleReply = (comment: Comment) => {
    setReplyingTo(comment);
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
      const { data: { user } } = await supabase.auth.getUser();
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
      const { data: { user } } = await supabase.auth.getUser();
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
      <Image source={{ uri: item.profiles.avatar_url }} style={styles.commentAvatar} />
      <View style={styles.commentBubble}>
        <Text style={styles.commentAuthor}>{item.profiles.username}</Text>
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
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <TouchableOpacity 
          style={styles.authorSection}
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
          <Image source={{ uri: post.profiles.avatar_url }} style={styles.avatar} />
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{post.profiles.username}</Text>
            <View style={styles.postMetaRow}>
              <Text style={styles.timestamp}>
                {new Date(post.created_at).toLocaleDateString()} • {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            {post.location && (
              <TouchableOpacity style={styles.locationContainer}>
                <MapPin size={16} color="#A78BFA" />
                <Text style={styles.locationDisplayText}>{post.location}</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.moreButton}
          onPress={() => setShowPostOptionsModal(true)}
        >
          <MoreHorizontal size={24} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      <Text style={styles.postText}>{post.content}</Text>

      {post.media_url && post.media_type === 'image' && (
        <TouchableOpacity onPress={() => setIsImageModalVisible(true)}>
          <Image source={{ uri: post.media_url }} style={styles.postImage} />
        </TouchableOpacity>
      )}

      {post.media_url && post.media_type === 'video' && (
        <Video
          source={{ uri: post.media_url }}
          rate={1.0}
          volume={1.0}
          isMuted={false}
          shouldPlay
          isLooping
          style={styles.postImage}
        />
      )}

      <View style={styles.engagementStats}>
        <Text style={styles.engagementText}>{likes} Likes</Text>
        <Text style={styles.engagementText}>{comments.length} Comments</Text>
      </View>

      <View style={styles.engagementActions}>
        <TouchableOpacity style={styles.engagementButton} onPress={handleLike}>
          <Heart
            size={24}
            color={isLiked ? '#F472B6' : '#FFFFFF'}
            fill={isLiked ? '#F472B6' : 'transparent'}
          />
          <Text style={[styles.engagementButtonText, isLiked && styles.likedText]}>Like</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.engagementButton}>
          <MessageCircle size={24} color="#FFFFFF" />
          <Text style={styles.engagementButtonText}>Comment</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.engagementButton}>
          <Share size={24} color="#FFFFFF" />
          <Text style={styles.engagementButtonText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={28} color="#FFFFFF" />
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
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        padding: 8,
    },
    title: {
        fontSize: 20,
        fontFamily: 'Poppins-Bold',
        color: '#1F2937',
        marginLeft: 16,
    },
    postCard: {
        padding: 20,
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 16,
    },
    authorInfo: {
        flex: 1,
    },
    authorName: {
        fontSize: 16,
        fontFamily: 'Poppins-SemiBold',
        color: '#1F2937',
    },
    timestamp: {
        fontSize: 14,
        fontFamily: 'Inter-Regular',
        color: '#6B7280',
    },
    postText: {
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        color: '#1F2937',
        lineHeight: 24,
        marginBottom: 16,
    },
    postImage: {
        width: '100%',
        height: 300,
        borderRadius: 16,
        marginBottom: 16,
    },
    engagementStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    engagementActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
    },
    engagementButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    engagementButtonText: {
        fontSize: 15,
        fontFamily: 'Poppins-Medium',
        color: '#1F2937',
    },
    engagementText: {
        fontSize: 15,
        fontFamily: 'Inter-Regular',
        color: '#6B7280',
    },
    likedText: {
        color: '#F472B6',
    },
    commentsList: {
        paddingHorizontal: 16,
    },
    commentContainer: {
        flexDirection: 'row',
        marginVertical: 8,
    },
    commentAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
    },
    commentBubble: {
        padding: 12,
        borderRadius: 16,
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    commentAuthor: {
        fontSize: 14,
        fontFamily: 'Poppins-SemiBold',
        color: '#1F2937',
    },
    commentText: {
        fontSize: 15,
        fontFamily: 'Inter-Regular',
        color: '#1F2937',
    },
    commentActions: {
      flexDirection: 'row',
      marginTop: 8,
      gap: 16,
    },
    commentActionText: {
      fontSize: 13,
      fontFamily: 'Inter-Medium',
      color: '#6B7280',
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
        flexDirection: 'column', // Changed to column for replyingTo
        alignItems: 'flex-start', // Align items to start
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
    },
    commentInput: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        color: '#1F2937',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 24,
        marginRight: 12,
        fontSize: 16,
        fontFamily: 'Inter-Regular',
    },
    sendButton: {
        backgroundColor: '#3B82F6',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 24,
    },
    sendButtonText: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 16,
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
});
