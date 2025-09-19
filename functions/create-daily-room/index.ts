import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Define interfaces for the expected data structures
interface RequestBody {
  conversation_id: string;
}

interface DailyRoom {
  url: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define the serve function with explicit types
serve(async (req: Request) => {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Get the Daily API key from the environment variables
  const DAILY_API_KEY: string | undefined = Deno.env.get('DAILY_API_KEY');
  const DAILY_API_URL: string = 'https://api.daily.co/v1/rooms';

  // Check if the Daily API key is set
  if (!DAILY_API_KEY) {
    return new Response(JSON.stringify({ error: 'Daily API key not set' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { conversation_id } = (await req.json()) as RequestBody;

    if (!conversation_id) {
      return new Response(JSON.stringify({ error: 'conversation_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(DAILY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        name: conversation_id,
        privacy: 'private',
        properties: {
          enable_chat: true,
          enable_recording: 'cloud',
          start_video_off: true,
          start_audio_off: false,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Daily.co API error: ${response.status} ${errorText}`);
    }

    const room = (await response.json()) as DailyRoom;

    return new Response(JSON.stringify({ room_url: room.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error creating Daily.co room:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
