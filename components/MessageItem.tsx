import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '@/lib/chatService';
import { styles } from '@/app/ChatDetailsScreen.styles';

interface MessageItemProps {
  item: Message;
  isOwn: boolean;
  isGroupStart: boolean;
  isGroupEnd: boolean;
  showTime: boolean;
  formatMessageTime: (timestamp: string) => string;
  onPlayAudio: (uri: string) => void;
  onSetSelectedImage: (uri: string) => void;
  playingAudio: string | null;
}

const MessageItem: React.FC<MessageItemProps> = ({
  item,
  isOwn,
  isGroupStart,
  isGroupEnd,
  showTime,
  formatMessageTime,
  onPlayAudio,
  onSetSelectedImage,
  playingAudio,
}) => {
  const showAvatar = !isOwn && item.sender?.avatar_url;

  return (
    <View style={{ marginTop: isGroupStart ? 16 : 4 }}>
      {showTime && (
        <View style={{ alignItems: 'center', marginVertical: 16 }}>
          <View style={{ backgroundColor: '#E5E7EB', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
            <Text style={{ fontSize: 12, color: '#4B5563', fontWeight: '500' }}>
              {new Date(item.created_at).toLocaleDateString() === new Date().toLocaleDateString()
                ? 'Today'
                : new Date(item.created_at).toLocaleDateString()}
              {' '}
              {formatMessageTime(item.created_at)}
            </Text>
          </View>
        </View>
      )}

      <View style={[styles.messageRow, { justifyContent: isOwn ? 'flex-end' : 'flex-start' }]}>
        {showAvatar && isGroupEnd ? (
          <Image
            source={{ uri: item.sender?.avatar_url || 'https://via.placeholder.com/32' }}
            style={styles.messageAvatar}
          />
        ) : !isOwn ? (
          <View style={{ width: 32, marginRight: 12 }} />
        ) : null}

        <View style={{ maxWidth: '75%', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
          {!isOwn && isGroupStart && (
            <Text style={styles.messageSender}>
              {item.sender?.full_name || item.sender?.username}
            </Text>
          )}

          <View
            style={[
              styles.messageBubble,
              isOwn && styles.messageBubbleOwn,
            ]}
          >
            {item.message_type === 'text' ? (
              <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>
                {item.content}
              </Text>
            ) : item.message_type === 'image' ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onSetSelectedImage(item.media_url!)}
              >
                <Image
                  source={{ uri: item.media_url }}
                  style={{ width: 224, height: 224, borderRadius: 16 }}
                  resizeMode="cover"
                />
                {item.content && (
                  <Text style={[styles.messageText, isOwn && styles.messageTextOwn, { marginTop: 8 }]}>
                    {item.content}
                  </Text>
                )}
              </TouchableOpacity>
            ) : item.message_type === 'video' ? (
              <TouchableOpacity activeOpacity={0.8} style={{ position: 'relative' }}>
                <Image
                  source={{ uri: item.media_url }}
                  style={{ width: 224, height: 224, borderRadius: 16 }}
                  resizeMode="cover"
                />
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 64, height: 64, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 32, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="play" size={24} color="white" />
                  </View>
                </View>
                {item.content && (
                  <Text style={[styles.messageText, isOwn && styles.messageTextOwn, { marginTop: 8 }]}>
                    {item.content}
                  </Text>
                )}
              </TouchableOpacity>
            ) : item.message_type === 'audio' ? (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}
                activeOpacity={0.7}
                onPress={() => onPlayAudio(item.media_url!)}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                    backgroundColor: isOwn ? '#A78BFA' : '#F3E8FF',
                  }}
                >
                  <Ionicons
                    name={playingAudio === item.media_url ? 'pause' : 'play'}
                    size={20}
                    color={isOwn ? 'white' : '#8B5CF6'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      height: 4,
                      borderRadius: 2,
                      marginBottom: 8,
                      backgroundColor: isOwn ? '#93C5FD' : '#D1D5DB',
                    }}
                  >
                    <View
                      style={{
                        height: 4,
                        borderRadius: 2,
                        width: '33%',
                        backgroundColor: isOwn ? 'white' : '#8B5CF6',
                      }}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '500',
                      color: isOwn ? '#DBEAFE' : '#6B7280',
                    }}
                  >
                    0:32
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null}
          </View>

          {isOwn && isGroupEnd && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, marginRight: 4 }}>
              <Text style={styles.messageTime}>
                {formatMessageTime(item.created_at)}
              </Text>
              <Ionicons
                name="checkmark-done"
                size={14}
                color={item.is_read ? '#8B5CF6' : '#9CA3AF'}
                style={styles.messageStatus}
              />
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default React.memo(MessageItem);
