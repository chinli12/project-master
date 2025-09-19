import 'expo-dev-client';
import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || '5cd07c6d6b5647e3bced6905b5acdd6d';

export default function CallScreen() {
  const router = useRouter();
  const { channel } = useLocalSearchParams<{ channel: string }>();
  const [inCall, setInCall] = useState(true);
  // Dynamically load Agora to avoid route registration failing if native module isn't present
  let AgoraUIKit: any = null;
  let agoraAvailable = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    AgoraUIKit = require('agora-rn-uikit').default;
  } catch (e) {
    agoraAvailable = false;
  }

  const props = useMemo(() => ({
    connectionData: {
      appId: AGORA_APP_ID,
      channel: typeof channel === 'string' ? channel : 'test',
      // token: undefined, // Supply a token here if your Agora project uses App Certificate
    },
    rtcCallbacks: {
      EndCall: () => {
        setInCall(false);
        router.back();
      },
    },
  }), [channel, router]);

  if (!inCall) return null;

  if (!agoraAvailable || !AgoraUIKit) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.flex, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ color: '#fff', padding: 16, textAlign: 'center' }}>
            Video calling module is not available in this build. Please install and run the Dev Client including 'agora-rn-uikit'.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.flex}>
        <AgoraUIKit connectionData={props.connectionData} rtcCallbacks={props.rtcCallbacks} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  flex: { flex: 1 },
});
