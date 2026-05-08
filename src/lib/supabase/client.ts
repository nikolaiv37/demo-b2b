import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or anon key – check your .env file')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

type RealtimeStatus = 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR'

export function logRealtimeStatus(channelName: string, status: string): void {
  const knownStatus = status as RealtimeStatus

  if (knownStatus === 'SUBSCRIBED') {
    console.info('[realtime] channel subscribed', { channel: channelName, status })
    return
  }

  if (knownStatus === 'CHANNEL_ERROR') {
    console.error('[realtime] channel error', { channel: channelName, status })
    return
  }

  if (knownStatus === 'TIMED_OUT' || knownStatus === 'CLOSED') {
    console.warn('[realtime] channel not active', { channel: channelName, status })
  }
}
