// === HeatWave PvP — Supabase Auth ===

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import { logger } from '../utils/logger';

let adminClient: SupabaseClient;

export function getAdminClient(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}

export interface AuthUser {
  id: string;
  email?: string;
}

/**
 * Verify a JWT token from the WebSocket connection and return the user.
 */
export async function verifyToken(jwt: string): Promise<AuthUser | null> {
  try {
    const client = getAdminClient();
    const { data: { user }, error } = await client.auth.getUser(jwt);

    if (error || !user) {
      logger.warn({ error: error?.message }, 'Token verification failed');
      return null;
    }

    return { id: user.id, email: user.email };
  } catch (err) {
    logger.error({ err }, 'Token verification error');
    return null;
  }
}
