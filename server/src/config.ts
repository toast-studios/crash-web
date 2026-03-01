// === HeatWave PvP — Server Configuration ===

import dotenv from 'dotenv';
dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),

  supabase: {
    url: requireEnv('SUPABASE_URL'),
    serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    jwtSecret: requireEnv('SUPABASE_JWT_SECRET'),
  },

  redis: {
    url: requireEnv('REDIS_URL'),
  },
} as const;
