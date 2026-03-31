import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock env
vi.mock('@/lib/env', () => ({
  getEnv: () => ({
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-key',
  }),
}));

// --- Supabase mock helpers ---

interface MockChain {
  insert: ReturnType<typeof vi.fn>;
  then?: (resolve: (v: unknown) => void) => void;
}

function createChain(finalValue: { data: unknown; error: unknown }): MockChain {
  const chain: MockChain = {
    insert: vi.fn().mockReturnValue({
      then: (resolve: (v: unknown) => void) => resolve(finalValue),
    }),
  };
  chain.then = (resolve: (v: unknown) => void) => resolve(finalValue);
  return chain;
}

let subscribersChain: MockChain;

vi.mock('@/lib/supabase', () => ({
  getServerSupabase: () => ({
    from: (table: string) => {
      if (table === 'newsletter_subscribers') return subscribersChain;
      return createChain({ data: null, error: null });
    },
  }),
}));

import { POST } from './route';

function makePostRequest(body: Record<string, unknown> | string) {
  if (typeof body === 'string') {
    return new Request('https://localhost/api/newsletter/subscribe', {
      method: 'POST',
      body,
    });
  }
  return new Request('https://localhost/api/newsletter/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/newsletter/subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for invalid JSON body', async () => {
    subscribersChain = createChain({ data: null, error: null });

    const res = await POST(makePostRequest('not json'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toMatch(/Invalid JSON/);
  });

  it('returns 400 when email is missing', async () => {
    subscribersChain = createChain({ data: null, error: null });

    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toMatch(/required/i);
  });

  it('returns 400 for invalid email format', async () => {
    subscribersChain = createChain({ data: null, error: null });

    const res = await POST(makePostRequest({ email: 'not-an-email' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toMatch(/valid email/i);
  });

  it('returns 400 for email without domain', async () => {
    subscribersChain = createChain({ data: null, error: null });

    const res = await POST(makePostRequest({ email: 'user@' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('returns 201 on successful subscription', async () => {
    subscribersChain = createChain({ data: { id: 'uuid-1' }, error: null });

    const res = await POST(makePostRequest({ email: 'test@example.com' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toMatch(/subscribed/i);
  });

  it('returns 409 when email already exists (unique constraint violation)', async () => {
    subscribersChain = createChain({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
    });

    const res = await POST(makePostRequest({ email: 'existing@example.com' }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toMatch(/already subscribed/i);
  });

  it('returns 500 on unexpected database error', async () => {
    subscribersChain = createChain({
      data: null,
      error: { code: '42000', message: 'unexpected error' },
    });

    const res = await POST(makePostRequest({ email: 'test@example.com' }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('normalizes email to lowercase and trims whitespace', async () => {
    subscribersChain = createChain({ data: { id: 'uuid-2' }, error: null });

    const res = await POST(makePostRequest({ email: '  Test@Example.COM  ' }));
    expect(res.status).toBe(201);
    // Verify insert was called with normalized email
    expect(subscribersChain.insert).toHaveBeenCalledWith({ email: 'test@example.com' });
  });
});
