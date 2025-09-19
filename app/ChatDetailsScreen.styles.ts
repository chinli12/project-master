import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerBackButton: {
    marginRight: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerUserInfo: {
    flex: 1,
  },
  headerUserName: {
    fontWeight: '600',
    color: '#FFFFFF',
    fontSize: 16,
  },
  headerUserStatus: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  headerActionRow: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#6B7280',
    fontSize: 16,
  },
  flatList: {
    flex: 1,
    paddingTop: 16,
  },
  messageRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    alignSelf: 'flex-end',
  },
  messageBubble: {
    maxWidth: width * 0.75,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    marginBottom: 2,
  },
  messageBubbleOwn: {
    backgroundColor: '#8B5CF6',
  },
  messageText: {
    fontSize: 16,
    color: '#111827',
  },
  messageTextOwn: {
    color: '#FFFFFF',
  },
  messageSender: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
    marginLeft: 8,
  },
  messageTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    marginRight: 4,
  },
  messageStatus: {
    marginLeft: 2,
  },
  inputBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    marginBottom: 12,
  },
  inputOption: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    minWidth: 64,
  },
  inputOptionGallery: {
    backgroundColor: '#ECFDF5',
  },
  inputOptionVoice: {
    backgroundColor: '#F3E8FF',
  },
  inputOptionText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  inputOptionTextGallery: {
    color: '#10B981',
  },
  inputOptionTextVoice: {
    color: '#8B5CF6',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  inputAddButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  inputTextBox: {
    flex: 1,
    maxHeight: 128,
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 16,
    color: '#111827',
    minHeight: 40,
  },
  inputSendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  inputSendButtonRecording: {
    backgroundColor: '#EF4444',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAvatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
    marginBottom: 24,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modalUserName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalStatus: {
    color: '#D1D5DB',
    fontSize: 18,
    marginBottom: 24,
  },
  modalEndCallButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingMessages: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  skeletonMessage: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  skeletonBubble: {
    backgroundColor: '#E5E7EB',
    borderRadius: 20,
    padding: 16,
    marginLeft: 0,
    maxWidth: '75%',
  },
  skeletonBubbleOwn: {
    marginLeft: '25%',
    backgroundColor: '#D1D5DB',
  },
  skeletonText: {
    height: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 7,
    marginBottom: 8,
  },
  loadingIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyStateIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  callModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callModalContent: {
    alignItems: 'center',
    marginBottom: 32,
  },
  callModalAvatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
    marginBottom: 16,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  callModalUserName: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  callModalStatus: {
    color: '#D1D5DB',
    fontSize: 18,
  },
  callModalActions: {
    flexDirection: 'row',
    gap: 32,
  },
  callModalButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default styles;
