import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  TextInput,
  Alert,
  Image,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radii, shadows } from '../styles/theme';
import { X } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string;
  };
}

interface CommentModalProps {
  isVisible: boolean;
  onClose: () => void;
  postId: string;
}

export default function CommentModal({ isVisible, onClose, postId }: CommentModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isVisible) {
      fetchComments();
    }
  }, [isVisible]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('comments')
        .select('*, profiles(username, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) {
        setComments(data as Comment[]);
      }
    } catch (e) {
      console.warn('Failed to fetch comments', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (newComment.trim()) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to comment.');
        return;
      }

      const { data, error } = await supabase
        .from('comments')
        .insert({ post_id: postId, user_id: user.id, content: newComment })
        .select('*, profiles(username, avatar_url)')
        .single();

      if (data) {
        fetchComments();
        setNewComment('');
      }
    }
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentContainer}>
      <Image source={{ uri: item.profiles.avatar_url }} style={styles.commentAvatar} />
      <View style={styles.commentBubble}>
        <Text style={styles.commentAuthor}>{item.profiles.username}</Text>
        <Text style={styles.commentText}>{item.content}</Text>
      </View>
    </View>
  );

  // Handle backdrop press
  const handleBackdropPress = () => {
    onClose();
  };

  // Prevent modal content from closing when pressing inside
  const handleModalContentPress = (e: any) => {
    e.stopPropagation();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={styles.modalContainer}>
          <TouchableWithoutFeedback onPress={handleModalContentPress}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
              style={{ width: '100%' }}
            >
            <View style={styles.sheet}>
              {/* Handle bar */}
              <View style={styles.handle} />
              {/* Header */}
              <View style={styles.headerRow}>
                <Text style={styles.title}>Comments</Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                >
                  <X size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              {/* List */}
              <FlatList
                data={comments}
                renderItem={renderComment}
                keyExtractor={(item) => item.id}
                style={styles.commentsList}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  loading ? (
                    <View>
                      {[0,1,2,3].map((i) => (
                        <View key={i} style={styles.skeletonRow}>
                          <View style={styles.skeletonAvatar} />
                          <View style={{ flex: 1 }}>
                            <View style={styles.skeletonLineShort} />
                            <View style={styles.skeletonLineLong} />
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.emptyState}>
                      <LinearGradient
                        colors={[`${colors.primary}22`, `${colors.primaryDark}33`]}
                        style={styles.emptyBadge}
                      />
                      <Text style={styles.emptyTitle}>No comments yet</Text>
                      <Text style={styles.emptySubtitle}>Be the first to share your thoughts</Text>
                    </View>
                  )
                }
                contentContainerStyle={{ paddingBottom: spacing.xl }}
              />
              {/* Composer */}
              <View style={styles.composer}>
                <TextInput
                  style={styles.input}
                  placeholder="Add a comment..."
                  placeholderTextColor={colors.textMuted}
                  value={newComment}
                  onChangeText={setNewComment}
                  onSubmitEditing={handleAddComment}
                  returnKeyType="send"
                />
                <TouchableOpacity
                  onPress={handleAddComment}
                  style={[styles.sendButton, !newComment.trim() && { opacity: 0.5 }]}
                  disabled={!newComment.trim()}
                >
                  <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
              </View>
            </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    maxHeight: '75%',
    ...shadows.sheet,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  closeButton: {
    alignSelf: 'flex-end',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyBadge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.textSecondary,
  },
  commentsList: {
    flex: 1,
  },
  commentContainer: {
    flexDirection: 'row',
    marginVertical: spacing.sm,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: spacing.sm,
  },
  commentBubble: {
    padding: spacing.md,
    borderRadius: radii.lg,
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  commentAuthor: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: colors.textPrimary,
  },
  commentText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: colors.textPrimary,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    color: colors.textPrimary,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: 24,
    marginRight: spacing.md,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  sendButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: 24,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
  },
  // Skeletons
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  skeletonAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
    marginRight: spacing.sm,
  },
  skeletonLineShort: {
    width: '35%',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
    marginBottom: 8,
  },
  skeletonLineLong: {
    width: '75%',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
});
