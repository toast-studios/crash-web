// === HeatWave PvP — Database Clients ===

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

let adminClient: SupabaseClient | null = null;
let redisClient: Redis | null = null;
let redisErrorLogged = false;

/**
 * Supabase admin client (service role key — bypasses RLS).
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}

/**
 * Initialize and return the Redis client.
 */
export function initRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(config.redis.url, {
      maxRetriesPerRequest: null, // don't throw on retry exhaustion — let callers handle errors
      retryStrategy(times) {
        if (times > 10) return null; // stop reconnecting after 10 attempts
        return Math.min(times * 200, 5000); // backoff: 200ms, 400ms, ... 5s
      },
      lazyConnect: true,
    });

    redisClient.on('connect', () => logger.info('Redis connected'));
    redisClient.on('error', (err) => {
      // Log once per unique error type to avoid spam
      if (!redisErrorLogged) {
        logger.error({ err }, 'Redis error');
        redisErrorLogged = true;
        setTimeout(() => { redisErrorLogged = false; }, 30000);
      }
    });

    redisClient.connect().catch(err => {
      logger.error({ err }, 'Failed to connect to Redis');
    });
  }
  return redisClient;
}

/**
 * Close Redis connection (for graceful shutdown).
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch {
      // Already closed or never connected
    }
    redisClient = null;
  }
}
