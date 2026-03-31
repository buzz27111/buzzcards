import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/newsletter/subscribe
 * Body: { email: string }
 * Validates email format, checks for existing subscription, stores in newsletter_subscribers table.
 * Returns: { success: boolean, message: string }
 */
export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { email } = body;

  if (!email || typeof email !== 'string') {
    return NextResponse.json(
      { success: false, message: 'Email is required' },
      { status: 400 }
    );
  }

  const trimmedEmail = email.trim().toLowerCase();

  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return NextResponse.json(
      { success: false, message: 'Please enter a valid email address' },
      { status: 400 }
    );
  }

  const supabase = getServerSupabase();

  const { error: insertError } = await supabase
    .from('newsletter_subscribers')
    .insert({ email: trimmedEmail });

  if (insertError) {
    // Supabase unique constraint violation code is '23505'
    if (insertError.code === '23505') {
      return NextResponse.json(
        { success: false, message: 'This email is already subscribed' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, message: 'Failed to subscribe. Please try again later.' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { success: true, message: 'Successfully subscribed to the newsletter!' },
    { status: 201 }
  );
}
