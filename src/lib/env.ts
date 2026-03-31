const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'BEDROCK_MODEL_ID',
  'CRON_SECRET',
] as const;

export interface EnvConfig {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  AWS_REGION: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  BEDROCK_MODEL_ID: string;
  CRON_SECRET: string;
  ADSENSE_CLIENT_ID: string | undefined;
}

export function validateEnv(): EnvConfig {
  const missing: string[] = [];

  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((v) => `  - ${v}`).join('\n')}\n\nSee .env.example for reference.`
    );
  }

  return {
    SUPABASE_URL: process.env.SUPABASE_URL!,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY!,
    AWS_REGION: process.env.AWS_REGION!,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID!,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY!,
    BEDROCK_MODEL_ID: process.env.BEDROCK_MODEL_ID!,
    CRON_SECRET: process.env.CRON_SECRET!,
    ADSENSE_CLIENT_ID: process.env.ADSENSE_CLIENT_ID,
  };
}

let _env: EnvConfig | undefined;

export function getEnv(): EnvConfig {
  if (!_env) {
    _env = validateEnv();
  }
  return _env;
}
