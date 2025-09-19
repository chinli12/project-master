declare module '@daily-co/react-native-daily-js' {
  import { ComponentType } from 'react';

  export interface DailyEventObject {
    action: string;
    [key: string]: any;
  }

  export type DailyEvent =
    | 'loading'
    | 'loaded'
    | 'load-attempt-failed'
    | 'joining-meeting'
    | 'joined-meeting'
    | 'left-meeting'
    | 'participant-joined'
    | 'participant-updated'
    | 'participant-left'
    | 'track-started'
    | 'track-stopped'
    | 'recording-started'
    | 'recording-stopped'
    | 'recording-stats'
    | 'recording-error'
    | 'recording-upload-completed'
    | 'app-message'
    | 'input-event'
    | 'error'
    | 'nonfatal-error'
    | 'camera-error'
    | 'live-streaming-started'
    | 'live-streaming-stopped'
    | 'live-streaming-error';

  export interface DailyMediaViewProps {
    videoTrack?: any;
    audioTrack?: any;
    style?: any;
  }

  export const DailyMediaView: ComponentType<DailyMediaViewProps>;

  export interface DailyCall {
    join(options: { url: string }): Promise<void>;
    leave(): Promise<void>;
    participants(): { [id: string]: any };
    on(event: DailyEvent, handler: (event: any) => void): void;
    off(event: DailyEvent, handler: (event: any) => void): void;
  }

  const Daily: {
    createCallObject(): DailyCall;
  };

  export default Daily;
}
