import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Daily, { DailyEvent, DailyMediaView } from '@daily-co/react-native-daily-js';
import { supabase } from '@/lib/supabase';
import { Call } from '@/lib/chatService';

const CallScreen = ({ call, onEndCall, user }: { call: Call, onEndCall: () => void, user: any }) => {
  const [participants, setParticipants] = useState<string[]>([]);
  const callObject = useRef<any>(null);

  useEffect(() => {
    const startCall = async () => {
      const { data, error } = await supabase
        .from('calls')
        .select('daily_room_url')
        .eq('id', call.id)
        .single();

      if (error || !data?.daily_room_url) {
        console.error('Error getting daily room url', error);
        onEndCall();
        return;
      }

      callObject.current = Daily.createCallObject();

      const handleParticipantJoined = (event: any) => {
        setParticipants(prev => [...prev, event.participant.session_id]);
      };

      const handleParticipantLeft = (event: any) => {
        setParticipants(prev => prev.filter(p => p !== event.participant.session_id));
      };

      callObject.current.on('participant-joined', handleParticipantJoined);
      callObject.current.on('participant-left', handleParticipantLeft);

      await callObject.current.join({ url: data.daily_room_url });
      setParticipants(Object.keys(callObject.current.participants() || {}));
    };

    startCall();

    return () => {
      callObject.current?.leave();
    };
  }, [call.id, onEndCall]);

  const renderParticipant = ({ item }: { item: string }) => {
    return <ParticipantView participantId={item} callObject={callObject.current} />;
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={participants}
        renderItem={renderParticipant}
        keyExtractor={(item) => item}
        style={styles.participantList}
      />
      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={onEndCall}>
          <Ionicons name="call" size={32} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const ParticipantView = ({ participantId, callObject }: { participantId: string, callObject: any }) => {
  const [videoTrack, setVideoTrack] = useState<any>(null);
  const [audioTrack, setAudioTrack] = useState<any>(null);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    if (!callObject) {
      return;
    }

    const participant = callObject.participants()[participantId];
    if (!participant) {
      return;
    }

    setVideoTrack(participant.videoTrack);
    setAudioTrack(participant.audioTrack);
    setUserName(participant.user_name);

    const handleParticipantUpdated = (event: any) => {
      if (event.participant.session_id === participantId) {
        setVideoTrack(event.participant.videoTrack);
        setAudioTrack(event.participant.audioTrack);
        setUserName(event.participant.user_name);
      }
    };

    callObject.on('participant-updated', handleParticipantUpdated);

    return () => {
      callObject.off('participant-updated', handleParticipantUpdated);
    };
  }, [participantId, callObject]);

  return (
    <View style={styles.participantContainer}>
      <DailyMediaView
        videoTrack={videoTrack}
        audioTrack={audioTrack}
        style={styles.video}
      />
      <Text style={styles.name}>{userName}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  participantList: {
    flex: 1,
  },
  participantContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    flex: 1,
    width: '100%',
  },
  name: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    color: 'white',
    fontSize: 18,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  button: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CallScreen;
