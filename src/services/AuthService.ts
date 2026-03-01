// === HeatWave PvP — Auth Service ===

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mrfkfreevypyfwczhzzd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZmtmcmVldnlweWZ3Y3poenpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNjAxMTksImV4cCI6MjA4NzkzNjExOX0.aEa0w_B_My26svmmOST1hQWcZpblUDQwthXtZFlCGBo';

// Server URL for signup endpoint (uses admin API to auto-confirm email)
const SERVER_URL = 'https://heatwave-pvp.onrender.com';

let supabase: SupabaseClient;

function getClient(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage as any,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return supabase;
}

export const AuthService = {
  getClient,

  async signUp(email: string, password: string): Promise<{ error: string | null }> {
    try {
      // Use server endpoint to create user with auto-confirmed email
      const res = await fetch(`${SERVER_URL}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        return { error: data.error ?? 'Signup failed' };
      }
      // Now sign in to get a session
      return this.signIn(email, password);
    } catch (err) {
      return { error: 'Network error — is the server running?' };
    }
  },

  async signIn(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await getClient().auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  },

  async signOut(): Promise<void> {
    await getClient().auth.signOut();
  },

  async getSession(): Promise<Session | null> {
    const { data } = await getClient().auth.getSession();
    return data.session;
  },

  async getToken(): Promise<string | null> {
    const { data } = await getClient().auth.getSession();
    return data.session?.access_token ?? null;
  },

  async getUserId(): Promise<string | null> {
    const { data } = await getClient().auth.getUser();
    return data.user?.id ?? null;
  },

  onAuthStateChange(callback: (session: Session | null) => void): { unsubscribe: () => void } {
    const { data } = getClient().auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
    return { unsubscribe: data.subscription.unsubscribe };
  },
};
