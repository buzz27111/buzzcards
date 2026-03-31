'use client';

import { useState } from 'react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = 'idle' | 'loading' | 'success' | 'duplicate' | 'invalid' | 'error';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = email.trim();
    if (!trimmed || !EMAIL_REGEX.test(trimmed)) {
      setStatus('invalid');
      setMessage('Please enter a valid email address');
      return;
    }

    setStatus('loading');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });

      const data: { success: boolean; message: string } = await res.json();

      if (res.status === 201) {
        setStatus('success');
        setMessage(data.message);
        setEmail('');
      } else if (res.status === 409) {
        setStatus('duplicate');
        setMessage(data.message);
      } else if (res.status === 400) {
        setStatus('invalid');
        setMessage(data.message);
      } else {
        setStatus('error');
        setMessage(data.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again later.');
    }
  };

  const statusColor: Record<Status, string> = {
    idle: '',
    loading: '',
    success: 'text-green-500',
    duplicate: 'text-yellow-500',
    invalid: 'text-red-500',
    error: 'text-red-500',
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-foreground/10 bg-foreground/5 p-4">
      <h3 className="mb-1 text-sm font-semibold text-foreground">📬 Daily Newsletter</h3>
      <p className="mb-3 text-xs text-foreground/50">Get top stories in your inbox</p>

      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status !== 'idle' && status !== 'loading') setStatus('idle');
          }}
          placeholder="you@example.com"
          aria-label="Email address"
          className="min-w-0 flex-1 rounded-lg border border-foreground/10 bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-foreground/30 focus:border-foreground/30 focus:outline-none"
          disabled={status === 'loading'}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="shrink-0 rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {status === 'loading' ? '...' : 'Subscribe'}
        </button>
      </div>

      {status !== 'idle' && status !== 'loading' && message && (
        <p className={`mt-2 text-xs ${statusColor[status]}`}>{message}</p>
      )}
    </form>
  );
}
