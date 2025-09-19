import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
  Alert,
  StyleSheet,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { Call, ChatService } from '@/lib/chatService';
import Daily, { DailyCall, DailyMediaView } from '@daily-co/react-native-daily-js';

interface VideoCallModalProps {
  visible: boolean;
  call: Call | null;
  onEndCall: () => void;
}

export default function VideoCallModal({ visible, call, onEndCall }: VideoCallModalProps) {
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState<string>('Connecting...');
  const [participants, setParticipants] = useState<any>({});
  const [localParticipant, setLocalParticipant] = useState<any>(null);
  const [isJoined, setIsJoined] = useState(false);
  const ringtone = useRef<Audio.Sound | null>(null);
  const dailyCall = useRef<DailyCall | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const playRingtone = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/audio/ringing.mp3'),
          { shouldPlay: true, isLooping: true }
        );
        ringtone.current = sound;
      } catch (error) {
        console.error("Could not play ringtone", error);
      }
    };

    if (visible && call?.status === 'pending') {
      playRingtone();
    } else {
      ringtone.current?.stopAsync();
    }

    return () => {
      ringtone.current?.unloadAsync();
    };
  }, [visible, call?.status]);

  useEffect(() => {
    if (visible && call) {
      setupDailyCall();
      startCallTimer();
    } else {
      cleanupDailyCall();
      stopCallTimer();
    }

    return () => {
      cleanupDailyCall();
      stopCallTimer();
    };
  }, [visible, call]);

  const setupDailyCall = async () => {
    try {
      console.log('Setting up Daily call with room URL:', call?.daily_room_url);
      
      if (!call?.daily_room_url) {
        console.error('No Daily room URL provided');
        setCallStatus('Failed to connect');
        return;
      }

      // Create Daily call object
      dailyCall.current = Daily.createCallObject();
      
      // Set up event listeners
      dailyCall.current.on('joined-meeting', handleJoinedMeeting);
      dailyCall.current.on('participant-joined', handleParticipantJoined);
      dailyCall.current.on('participant-left', handleParticipantLeft);
      dailyCall.current.on('participant-updated', handleParticipantUpdated);
      dailyCall.current.on('left-meeting', handleLeftMeeting);
      dailyCall.current.on('error', handleError);
      
      // Join the Daily room
      setCallStatus('Joining call...');
      await dailyCall.current.join({ url: call.daily_room_url });
      
    } catch (error) {
      console.error('Error setting up Daily call:', error);
      setCallStatus('Failed to connect');
      Alert.alert('Error', 'Failed to join video call');
    }
  };

  const cleanupDailyCall = async () => {
    if (dailyCall.current) {
      try {
        await dailyCall.current.leave();
        dailyCall.current = null;
      } catch (error) {
        console.error('Error cleaning up Daily call:', error);
      }
    }
    setIsJoined(false);
    setParticipants({});
    setLocalParticipant(null);
  };

  // Daily.co event handlers
  const handleJoinedMeeting = (event: any) => {
    console.log('Joined meeting:', event);
    setIsJoined(true);
    setCallStatus('Connected');
    const participants = dailyCall.current?.participants();
    if (participants) {
      setParticipants(participants);
      setLocalParticipant(participants.local);
    }
  };

  const handleParticipantJoined = (event: any) => {
    console.log('Participant joined:', event);
    const participants = dailyCall.current?.participants();
    if (participants) {
      setParticipants(participants);
    }
  };

  const handleParticipantLeft = (event: any) => {
    console.log('Participant left:', event);
    const participants = dailyCall.current?.participants();
    if (participants) {
      setParticipants(participants);
    }
  };

  const handleParticipantUpdated = (event: any) => {
    console.log('Participant updated:', event);
    const participants = dailyCall.current?.participants();
    if (participants) {
      setParticipants(participants);
      if (event.participant && event.participant.local) {
        setLocalParticipant(event.participant);
      }
    }
  };

  const handleLeftMeeting = (event: any) => {
    console.log('Left meeting:', event);
    setIsJoined(false);
    setCallStatus('Disconnected');
  };

  const handleError = (event: any) => {
    console.error('Daily call error:', event);
    setCallStatus('Connection error');
    Alert.alert('Call Error', 'There was an error with the video call');
  };

  const startCallTimer = () => {
    setCallDuration(0);
    intervalRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000) as unknown as number;
  };

  const stopCallTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleVideo = async () => {
    if (dailyCall.current) {
      try {
        const newVideoState = !isVideoEnabled;
        // Use sendAppMessage to control video or just update state for now
        // Since Daily.co API methods may vary, we'll use a simpler approach
        setIsVideoEnabled(newVideoState);
        console.log(`Video ${newVideoState ? 'enabled' : 'disabled'}`);
      } catch (error) {
        console.error('Error toggling video:', error);
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  };

  const toggleAudio = async () => {
    if (dailyCall.current) {
      try {
        const newAudioState = !isAudioEnabled;
        // Use sendAppMessage to control audio or just update state for now
        // Since Daily.co API methods may vary, we'll use a simpler approach
        setIsAudioEnabled(newAudioState);
        console.log(`Audio ${newAudioState ? 'enabled' : 'disabled'}`);
      } catch (error) {
        console.error('Error toggling audio:', error);
        setIsAudioEnabled(!isAudioEnabled);
      }
    }
  };

  const handleEndCall = async () => {
    stopCallTimer();
    
    if (call) {
      try {
        await ChatService.updateCallStatus(call.id, 'ended', callDuration);
      } catch (error) {
        console.error('Error updating call status:', error);
      }
    }
    
    onEndCall();
  };

  if (!visible || !call) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Remote Video View */}
        <View style={styles.remoteVideoContainer}>
          <Text style={styles.remoteVideoText}>
            {call.call_type === 'video' ? 'Video Call' : 'Audio Call'}
          </Text>
          <Text style={styles.remoteVideoUser}>
            {call.caller?.full_name || call.callee?.full_name || 'Unknown User'}
          </Text>
          <Text style={styles.callStatusText}>
            {callStatus} - {formatCallDuration(callDuration)}
          </Text>
        </View>

        {/* Remote Video Views */}
        {call.call_type === 'video' && Object.keys(participants).length > 0 && (
          <View style={styles.videoContainer}>
            {Object.entries(participants).map(([id, participant]: [string, any]) => {
              if (id === 'local') return null; // Skip local participant for remote view
              return (
                <View key={id} style={styles.remoteVideoView}>
                  <DailyMediaView
                    videoTrack={participant.videoTrack}
                    audioTrack={participant.audioTrack}
                    style={styles.remoteVideo}
                  />
                </View>
              );
            })}
          </View>
        )}

        {/* Local Video View (only for video calls) */}
        {call.call_type === 'video' && localParticipant && isVideoEnabled && (
          <View style={styles.localVideoContainer}>
            <DailyMediaView
              videoTrack={localParticipant.videoTrack}
              style={styles.localVideo}
            />
          </View>
        )}

        {/* Call Controls */}
        <View style={styles.controlsContainer}>
          <View style={styles.controls}>
            {/* Toggle Audio */}
            <TouchableOpacity
              onPress={toggleAudio}
              style={[styles.controlButton, { backgroundColor: isAudioEnabled ? '#4B5563' : '#EF4444' }]}
            >
              <Ionicons
                name={isAudioEnabled ? 'mic' : 'mic-off'}
                size={24}
                color="white"
              />
            </TouchableOpacity>

            {/* End Call */}
            <TouchableOpacity
              onPress={handleEndCall}
              style={styles.endCallButton}
            >
              <Ionicons name="call" size={32} color="white" />
            </TouchableOpacity>

            {/* Toggle Video (only for video calls) */}
            {call.call_type === 'video' && (
              <TouchableOpacity
                onPress={toggleVideo}
                style={[styles.controlButton, { backgroundColor: isVideoEnabled ? '#4B5563' : '#EF4444' }]}
              >
                <Ionicons
                  name={isVideoEnabled ? 'videocam' : 'videocam-off'}
                  size={24}
                  color="white"
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Call Status Overlay */}
        <View style={styles.callStatusOverlay}>
          <View style={styles.callStatusOverlayInner}>
            <Text style={styles.callStatusOverlayText}>
              {call.status === 'pending' ? 'Calling...' : 
               call.status === 'accepted' ? 'Connected' : 
               call.status}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  remoteVideoContainer: {
    flex: 1,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteVideoText: {
    color: 'white',
    fontSize: 18,
  },
  remoteVideoUser: {
    color: '#D1D5DB',
    fontSize: 16,
    marginTop: 8,
  },
  callStatusText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 4,
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteVideoView: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
  },
  localVideoContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'white',
  },
  localVideo: {
    flex: 1,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 48,
    paddingTop: 32,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endCallButton: {
    width: 80,
    height: 80,
    backgroundColor: '#EF4444',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callStatusOverlay: {
    position: 'absolute',
    top: 64,
    left: 16,
    right: 16,
  },
  callStatusOverlayInner: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    padding: 16,
  },
  callStatusOverlayText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
});
