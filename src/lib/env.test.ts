import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { validateEnv } from './env';

describe('validateEnv', () => {
  const requiredVars: Record<string, string> = {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    AWS_REGION: 'us-east-1',
    AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
    AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    BEDROCK_MODEL_ID: 'anthropic.claude-3-haiku-20240307-v1:0',
    CRON_SECRET: 'test-cron-secret',
  };

  beforeEach(() => {
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_ANON_KEY', '');
    vi.stubEnv('AWS_REGION', '');
    vi.stubEnv('AWS_ACCESS_KEY_ID', '');
    vi.stubEnv('AWS_SECRET_ACCESS_KEY', '');
    vi.stubEnv('BEDROCK_MODEL_ID', '');
    vi.stubEnv('CRON_SECRET', '');
    vi.stubEnv('ADSENSE_CLIENT_ID', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function setAllRequired() {
    for (const [key, value] of Object.entries(requiredVars)) {
      vi.stubEnv(key, value);
    }
  }

  it('should return a valid config when all required vars are set', () => {
    setAllRequired();
    const config = validateEnv();

    expect(config.SUPABASE_URL).toBe(requiredVars.SUPABASE_URL);
    expect(config.SUPABASE_ANON_KEY).toBe(requiredVars.SUPABASE_ANON_KEY);
    expect(config.AWS_REGION).toBe(requiredVars.AWS_REGION);
    expect(config.AWS_ACCESS_KEY_ID).toBe(requiredVars.AWS_ACCESS_KEY_ID);
    expect(config.AWS_SECRET_ACCESS_KEY).toBe(requiredVars.AWS_SECRET_ACCESS_KEY);
    expect(config.BEDROCK_MODEL_ID).toBe(requiredVars.BEDROCK_MODEL_ID);
    expect(config.CRON_SECRET).toBe(requiredVars.CRON_SECRET);
  });

  it('should include optional ADSENSE_CLIENT_ID when set', () => {
    setAllRequired();
    vi.stubEnv('ADSENSE_CLIENT_ID', 'ca-pub-123');
    const config = validateEnv();

    expect(config.ADSENSE_CLIENT_ID).toBe('ca-pub-123');
  });

  it('should allow ADSENSE_CLIENT_ID to be undefined', () => {
    setAllRequired();
    delete process.env.ADSENSE_CLIENT_ID;
    const config = validateEnv();

    expect(config.ADSENSE_CLIENT_ID).toBeUndefined();
  });

  it('should throw listing ALL missing vars when multiple are absent', () => {
    // Only set SUPABASE_URL, leave the rest empty
    vi.stubEnv('SUPABASE_URL', requiredVars.SUPABASE_URL);

    expect(() => validateEnv()).toThrow('Missing required environment variables');
    try {
      validateEnv();
    } catch (e: unknown) {
      const msg = (e as Error).message;
      expect(msg).toContain('SUPABASE_ANON_KEY');
      expect(msg).toContain('AWS_REGION');
      expect(msg).toContain('AWS_ACCESS_KEY_ID');
      expect(msg).toContain('AWS_SECRET_ACCESS_KEY');
      expect(msg).toContain('BEDROCK_MODEL_ID');
      expect(msg).toContain('CRON_SECRET');
      expect(msg).not.toContain('SUPABASE_URL');
    }
  });

  it('should throw when a single required var is missing', () => {
    setAllRequired();
    vi.stubEnv('CRON_SECRET', '');

    expect(() => validateEnv()).toThrow('CRON_SECRET');
  });
});
